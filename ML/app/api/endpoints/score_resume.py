from fastapi import APIRouter, HTTPException

from app.models.schemas import ScoreRequest, ScoreResponse
from app.services.scoring_engine import compute_match_score

router = APIRouter()


@router.post("/score-resume", response_model=ScoreResponse)
async def score_resume(payload: ScoreRequest):
    if not payload.resume_text.strip():
        raise HTTPException(status_code=400, detail="resume_text cannot be empty.")
    if not payload.job_description.strip():
        raise HTTPException(status_code=400, detail="job_description cannot be empty.")

    try:
        result = compute_match_score(
            resume_text=payload.resume_text,
            job_description=payload.job_description,
            required_skills=payload.required_skills,
            resume_experience_years=payload.resume_experience_years,
            required_experience_years=payload.required_experience_years,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Scoring failed: {str(e)}")

    return ScoreResponse(**result)