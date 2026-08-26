import re
import io
import fitz  # PyMuPDF
import docx
from typing import Optional, Tuple, List

EMAIL_REGEX = re.compile(
    r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}"
)

PHONE_REGEX = re.compile(
    r"(\+?\d{1,3}[\s.-]?)?"
    r"(\(?\d{3}\)?[\s.-]?)"
    r"(\d{3}[\s.-]?\d{4})"
)

# Common resume section headers — used to know when the "header block" ends
SECTION_HEADERS = {
    "summary", "objective", "experience", "work experience", "education",
    "skills", "projects", "certifications", "achievements", "profile",
    "contact", "employment history", "technical skills", "references",
}

# Words that show up in header lines but are never part of a person's name
NON_NAME_TOKENS = {
    "resume", "cv", "curriculum", "vitae", "portfolio", "linkedin",
    "github", "phone", "email", "address", "profile",
}

TITLE_CASE_WORD = re.compile(r"^[A-Z][a-zA-Z'.-]*$")


def extract_text_from_pdf(file_bytes: bytes) -> str:
    """Extract raw text from a PDF using PyMuPDF."""
    text_parts = []
    with fitz.open(stream=file_bytes, filetype="pdf") as doc:
        for page in doc:
            text_parts.append(page.get_text())
    return "\n".join(text_parts).strip()


def extract_text_from_docx(file_bytes: bytes) -> str:
    """Extract raw text from a DOCX using python-docx."""
    file_stream = io.BytesIO(file_bytes)
    document = docx.Document(file_stream)

    parts = [p.text for p in document.paragraphs if p.text.strip()]

    for table in document.tables:
        for row in table.rows:
            for cell in row.cells:
                if cell.text.strip():
                    parts.append(cell.text.strip())

    return "\n".join(parts).strip()


def extract_email(text: str) -> Optional[str]:
    match = EMAIL_REGEX.search(text)
    return match.group(0) if match else None


def extract_phone(text: str) -> Optional[str]:
    match = PHONE_REGEX.search(text)
    if not match:
        return None
    phone = match.group(0).strip()
    digits_only = re.sub(r"\D", "", phone)
    if len(digits_only) < 7:
        return None
    return phone


def _looks_like_name(line: str) -> bool:
    """Heuristic check: is this line plausibly a person's full name?"""
    line = line.strip()
    if not line or len(line) > 60:
        return False
    if "@" in line or any(c.isdigit() for c in line):
        return False
    if any(ch in line for ch in ("|", "•", "http", "www", "/")):
        return False

    lower = line.lower()
    if lower in SECTION_HEADERS:
        return False
    if any(tok in lower.split() for tok in NON_NAME_TOKENS):
        return False

    words = line.split()
    if not (1 <= len(words) <= 4):
        return False

    # Most words in a name line should be Title-Case (allow ALL CAPS names too)
    title_like = sum(
        1 for w in words
        if TITLE_CASE_WORD.match(w) or w.isupper()
    )
    return title_like >= max(1, len(words) - 1)


def extract_name(text: str) -> Optional[str]:
    """
    Heuristic name extraction (no NLP model required):
    Scan the first ~10 non-empty lines and return the first one that
    looks like a plausible person name and isn't a section header/contact line.
    """
    lines = [l.strip() for l in text.split("\n") if l.strip()]
    for line in lines[:10]:
        if _looks_like_name(line):
            # Normalize ALL CAPS names to Title Case for readability
            if line.isupper():
                return line.title()
            return line
    return None


def extract_entities(text: str, max_chars: int = 5000) -> List[str]:
    """
    Lightweight heuristic entity spotting (no NLP model):
    - Lines matching common section headers
    - Capitalized multi-word phrases that look like organizations
    This is intentionally simple; it's a placeholder until Phase 4
    where embeddings-based scoring adds real semantic understanding.
    """
    entities = []
    seen = set()
    snippet = text[:max_chars]

    for line in snippet.split("\n"):
        line = line.strip()
        lower = line.lower()
        if lower in SECTION_HEADERS and line not in seen:
            seen.add(line)
            entities.append(f"{line} (SECTION)")

    # Naive "Organization-like" phrase detector: 2-4 Title-Case words in a row,
    # not already flagged as a section header or the resume owner's name line.
    org_pattern = re.compile(r"\b([A-Z][a-zA-Z&.,-]*(?:\s+[A-Z][a-zA-Z&.,-]*){1,3})\b")
    for match in org_pattern.finditer(snippet):
        phrase = match.group(1).strip()
        if phrase not in seen and len(phrase.split()) <= 4:
            seen.add(phrase)
            entities.append(f"{phrase} (ORG_CANDIDATE)")
        if len(entities) >= 30:
            break

    return entities


def parse_resume_file(
    file_bytes: bytes, file_extension: str
) -> Tuple[str, Optional[str], Optional[str], Optional[str], List[str]]:
    """
    Main orchestration function.
    Returns: (raw_text, name, email, phone, entities)
    """
    if file_extension == ".pdf":
        raw_text = extract_text_from_pdf(file_bytes)
    elif file_extension == ".docx":
        raw_text = extract_text_from_docx(file_bytes)
    else:
        raise ValueError(f"Unsupported file extension: {file_extension}")

    if not raw_text:
        raw_text = ""

    name = extract_name(raw_text)
    email = extract_email(raw_text)
    phone = extract_phone(raw_text)
    entities = extract_entities(raw_text)

    return raw_text, name, email, phone, entities