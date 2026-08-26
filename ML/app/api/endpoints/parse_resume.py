from fastapi import APIRouter, UploadFile, File, HTTPException
import os

from app.services.resume_parser import parse_resume_file
from app.models.schemas import ParseResponse, ParsedResume
from app.core.config import settings

router = APIRouter()


@router.post("/parse-resume", response_model=ParseResponse)
async def parse_resume(file: UploadFile = File(...)):
    filename = file.filename or "unknown"
    ext = os.path.splitext(filename)[1].lower()

    if ext not in settings.ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type '{ext}'. Allowed: {settings.ALLOWED_EXTENSIONS}",
        )

    file_bytes = await file.read()

    size_mb = len(file_bytes) / (1024 * 1024)
    if size_mb > settings.MAX_FILE_SIZE_MB:
        raise HTTPException(
            status_code=400,
            detail=f"File too large ({size_mb:.1f} MB). Max is {settings.MAX_FILE_SIZE_MB} MB.",
        )

    warnings = []

    try:
        raw_text, name, email, phone, entities = parse_resume_file(file_bytes, ext)
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Failed to parse file: {str(e)}")

    if not raw_text.strip():
        warnings.append("No extractable text found — file may be a scanned image (needs OCR).")
    if not email:
        warnings.append("No email address detected.")
    if not phone:
        warnings.append("No phone number detected.")
    if not name:
        warnings.append("No name detected.")

    parsed = ParsedResume(
        name=name,
        email=email,
        phone=phone,
        raw_text=raw_text,
        text_length=len(raw_text),
        detected_entities=entities,
    )

    return ParseResponse(
        success=True,
        filename=filename,
        file_type=ext,
        data=parsed,
        warnings=warnings or None,
    )