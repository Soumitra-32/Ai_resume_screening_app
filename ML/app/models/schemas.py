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