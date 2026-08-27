from pydantic import BaseModel
from typing import Optional, List


class ParsedResume(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
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