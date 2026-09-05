"""
Combines required-skill coverage, semantic similarity, and experience match
into a single weighted match_score.
"""

from typing import Optional, Union
from app.services.skill_taxonomy import extract_skills_from_text, normalize_skill
from app.services.embedding_service import compute_semantic_similarity
from app.services.resume_parser import extract_relevant_text_for_matching
from app.core.config import settings

# Weights are sourced from settings (backed by scoring_weights.json when
# present, produced by the 05_model_evaluation.ipynb notebook) rather than
# hardcoded here. See load_scoring_weights() in app/core/config.py.
WEIGHT_SKILL_OVERLAP = settings.WEIGHT_SKILL_OVERLAP
WEIGHT_SEMANTIC_SIMILARITY = settings.WEIGHT_SEMANTIC_SIMILARITY
WEIGHT_EXPERIENCE_MATCH = settings.WEIGHT_EXPERIENCE_MATCH

assert abs(
    WEIGHT_SKILL_OVERLAP + WEIGHT_SEMANTIC_SIMILARITY + WEIGHT_EXPERIENCE_MATCH - 1.0
) < 1e-6, "Scoring weights must sum to 1.0"


def compute_required_skill_coverage(
        resume_skills: list[str], required_skills: list[str]
) -> tuple[float, list[str], list[str]]:
    """
    Required-skill coverage: what fraction of the job's required skills
    appear in the resume. This is recall against the required-skill set,
    NOT Jaccard similarity (true Jaccard would be |A∩B| / |A∪B| and would
    also penalize a resume for having extra skills the job doesn't
    require — undesirable here, since more skills than required shouldn't
    lower the score).

    Returns (coverage_ratio, matched_skills, missing_skills).
    """
    if not required_skills:
        return 1.0, [], []  # no requirements specified — don't penalize

    resume_set = {normalize_skill(s) for s in resume_skills}
    required_set = {normalize_skill(s) for s in required_skills}

    matched = sorted(resume_set & required_set)
    missing = sorted(required_set - resume_set)

    score = len(matched) / len(required_set)
    return score, matched, missing


def compute_experience_match(
        resume_experience_years: Optional[Union[int, float]],
        required_experience_years: Optional[Union[int, float]]
) -> float:
    """
    Score 1.0 if resume experience meets/exceeds requirement.
    Partial credit if close; 0 if no data available.
    """
    if required_experience_years is None or required_experience_years == 0:
        return 1.0
    if resume_experience_years is None:
        return 0.0

    if resume_experience_years >= required_experience_years:
        return 1.0

    # Partial credit: linear falloff for being under-experienced
    ratio = resume_experience_years / required_experience_years
    return max(0.0, float(ratio))


def compute_match_score(
        resume_text: str,
        job_description: str,
        required_skills: Optional[list[str]] = None,
        resume_experience_years: Optional[Union[int, float]] = None,
        required_experience_years: Optional[Union[int, float]] = None,
        infer_skills_if_empty: bool = False,  # explicit opt-in instead of silent default
) -> dict:
    """
    Main scoring function. Returns a breakdown plus the final weighted score.

    If required_skills is empty/None, it is treated as "no explicit skill
    requirements" (skill_overlap defaults to 1.0, no penalty) UNLESS
    infer_skills_if_empty=True is explicitly passed, in which case skills
    are inferred from the job description instead.
    """
    resume_skills = extract_skills_from_text(resume_text)

    inferred = False
    if not required_skills and infer_skills_if_empty:
        required_skills = extract_skills_from_text(job_description)
        inferred = True
    elif not required_skills:
        required_skills = []

    skill_overlap, matched_skills, missing_skills = compute_required_skill_coverage(
        resume_skills, required_skills
    )

    # Score semantic similarity against a resume excerpt focused on
    # experience/skills content, not the whole resume — sections like
    # education, certifications, and hobbies shouldn't drive this score.
    relevant_resume_text = extract_relevant_text_for_matching(resume_text)
    semantic_similarity = compute_semantic_similarity(relevant_resume_text, job_description)

    experience_match = compute_experience_match(
        resume_experience_years, required_experience_years
    )

    match_score = (
            WEIGHT_SKILL_OVERLAP * skill_overlap
            + WEIGHT_SEMANTIC_SIMILARITY * semantic_similarity
            + WEIGHT_EXPERIENCE_MATCH * experience_match
    )

    return {
        "match_score": round(match_score, 4),
        "skill_overlap": round(skill_overlap, 4),
        "semantic_similarity": round(semantic_similarity, 4),
        "experience_match": round(experience_match, 4),
        "resume_skills_found": resume_skills,
        "matched_required_skills": matched_skills,
        "missing_required_skills": missing_skills,
        "resume_experience_years": resume_experience_years,
        "required_experience_years": required_experience_years,
        "skills_inferred_from_description": inferred,
    }