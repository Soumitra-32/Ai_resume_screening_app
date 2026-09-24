from pydantic import BaseModel
from typing import Optional, List


class ParsedResume(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    experience_years: Optional[float] = None
    raw_text: str
    text_length: int
    detected_entities: Optional[List[str]] = None


class ParseResponse(BaseModel):
    success: bool
    filename: str
    file_type: str
    data: ParsedResume
    warnings: Optional[List[str]] = None

class ScoreRequest(BaseModel):
    resume_text: str
    job_description: str
    required_skills: List[str] = []
    resume_experience_years: Optional[int] = None
    required_experience_years: Optional[int] = None

class ScoreResponse(BaseModel):
    match_score: float
    skill_overlap: float
    semantic_similarity: float
    experience_match: float
    resume_skills_found: List[str]
    matched_required_skills: List[str]
    missing_required_skills: List[str]
    resume_experience_years: Optional[float] = None       # echo back what was scored against
    required_experience_years: Optional[float] = None
    # True when the caller asked for inference and the required skills were
    # derived from the job description instead of being supplied. Declared here
    # so the value isn't silently dropped from the response payload.
    skills_inferred_from_description: bool = False