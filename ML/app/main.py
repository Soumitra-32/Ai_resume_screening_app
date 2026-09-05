from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.endpoints import parse_resume, score_resume
from app.core.config import settings

app = FastAPI(title=settings.APP_NAME)

# This service is called server-to-server (by the Node backend), not
# directly from a browser — no cookies/credentials are involved, so
# allow_credentials should be False. If a specific known caller ever
# needs credentialed browser access, list its explicit origin instead
# of "*".
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(parse_resume.router, prefix="/api", tags=["Resume Parsing"])
app.include_router(score_resume.router, prefix="/api", tags=["Resume Scoring"])


@app.get("/health")
def health_check():
    from app.services.embedding_service import is_semantic_model_available
    return {
        "status": "ok",
        "service": settings.APP_NAME,
        "semantic_model_loaded": is_semantic_model_available(),
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)