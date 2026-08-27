"""
Combines skill overlap, semantic similarity, and experience match
into a single weighted match_score.
"""

from typing import Optional, Union
from app.services.skill_taxonomy import extract_skills_from_text, normalize_skill
from app.services.embedding_service import compute_semantic_similarity

# Weights should sum to 1.0 — tune these based on notebook evaluation
WEIGHT_SKILL_OVERLAP = 0.4
WEIGHT_SEMANTIC_SIMILARITY = 0.4
WEIGHT_EXPERIENCE_MATCH = 0.2


def compute_skill_overlap(
        resume_skills: list[str], required_skills: list[str]
) -> tuple[float, list[str], list[str]]:
    """
    Jaccard-style overlap: what fraction of required skills appear in the resume.
    Returns (overlap_ratio, matched_skills, missing_skills).
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
) -> dict:
    """
    Main scoring function. Returns a breakdown plus the final weighted score.
    """
    resume_skills = extract_skills_from_text(resume_text)

    # Fall back to extracting required skills from job description if none provided
    if not required_skills:
        required_skills = extract_skills_from_text(job_description)

    skill_overlap, matched_skills, missing_skills = compute_skill_overlap(
        resume_skills, required_skills
    )

    semantic_similarity = compute_semantic_similarity(resume_text, job_description)
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
    }