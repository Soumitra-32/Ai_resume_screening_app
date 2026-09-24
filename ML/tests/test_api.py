"""
Smoke + regression tests for the ML service HTTP contract.

These deliberately assert the contract the Node backend depends on, not model
accuracy. They are model-independent: on the very first run the semantic model
is downloaded and cached by sentence-transformers, and if it is unavailable the
scoring engine degrades to 0.0 semantic similarity (the assertions below only
look at the deterministic parts of the breakdown).

Run from the ML directory:  python -m pytest -q
"""

import io

import docx
import pymupdf
import pytest
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def _pdf_bytes(text: str) -> bytes:
    doc = pymupdf.open()
    page = doc.new_page()
    page.insert_text((72, 72), text)
    buf = io.BytesIO()
    doc.save(buf)
    return buf.getvalue()


def _docx_bytes(text: str) -> bytes:
    document = docx.Document()
    document.add_paragraph(text)
    buf = io.BytesIO()
    document.save(buf)
    return buf.getvalue()


# --------------------------------------------------------------------------- #
# /health
# --------------------------------------------------------------------------- #

def test_health_returns_ok():
    response = client.get("/health")

    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "ok"
    assert isinstance(body["semantic_model_loaded"], bool)


# --------------------------------------------------------------------------- #
# /api/parse-resume
# --------------------------------------------------------------------------- #

def test_parse_resume_extracts_contact_details_from_pdf():
    pdf = _pdf_bytes(
        "Soumitra Das\n"
        "soumitra@example.com\n"
        "+8801712345678\n"
        "\n"
        "Summary\n"
        "Backend engineer with 4 years of experience.\n"
        "\n"
        "Technical Skills\n"
        "python, node.js, mongodb, docker\n"
    )

    response = client.post(
        "/api/parse-resume",
        files={"file": ("resume.pdf", pdf, "application/pdf")},
    )

    assert response.status_code == 200
    data = response.json()["data"]
    assert data["email"] == "soumitra@example.com"
    assert data["name"] == "Soumitra Das"
    assert data["experience_years"] == 4.0
    assert "python" in data["raw_text"]


def test_parse_resume_extracts_text_from_docx():
    docx_file = _docx_bytes("Jane Doe\njane.doe@example.com\n3 years of experience")

    response = client.post(
        "/api/parse-resume",
        files={
            "file": (
                "resume.docx",
                docx_file,
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            )
        },
    )

    assert response.status_code == 200
    data = response.json()["data"]
    assert data["email"] == "jane.doe@example.com"
    assert data["experience_years"] == 3.0


def test_parse_resume_warns_when_no_text_is_extractable():
    blank_pdf = _pdf_bytes("")

    response = client.post(
        "/api/parse-resume",
        files={"file": ("blank.pdf", blank_pdf, "application/pdf")},
    )

    assert response.status_code == 200
    warnings = response.json()["warnings"] or []
    assert any("No extractable text" in warning for warning in warnings)



# --------------------------------------------------------------------------- #
# /api/score-resume
# --------------------------------------------------------------------------- #

def test_score_resume_returns_full_breakdown():
    response = client.post(
        "/api/score-resume",
        json={
            "resume_text": "Senior python developer building rest apis with fastapi, docker and mongodb",
            "job_description": "Backend engineer with python, docker and mongodb experience",
            "required_skills": ["python", "docker", "mongodb"],
            "resume_experience_years": 5,
            "required_experience_years": 3,
        },
    )

    assert response.status_code == 200
    body = response.json()
    assert body["skill_overlap"] == 1.0
    assert body["experience_match"] == 1.0
    assert 0.0 <= body["semantic_similarity"] <= 1.0
    assert 0.0 <= body["match_score"] <= 1.0
    assert body["missing_required_skills"] == []
    assert body["skills_inferred_from_description"] is False


def test_skills_immediately_before_a_sentence_period_are_detected():
    """
    Regression: the skill-boundary regex used to forbid a trailing ".", so a
    skill written at the end of a sentence ("...and mongodb.") was reported as
    missing from the resume and dragged skill_overlap down with it.
    """
    response = client.post(
        "/api/score-resume",
        json={
            "resume_text": "Backend engineer with 4 years of experience using python, docker and mongodb.",
            "job_description": "Backend role.",
            "required_skills": ["python", "mongodb"],
        },
    )

    assert response.status_code == 200
    body = response.json()
    assert "mongodb" in body["matched_required_skills"]
    assert set(body["matched_required_skills"]) == {"python", "mongodb"}
    assert body["missing_required_skills"] == []
    assert body["skill_overlap"] == 1.0


def test_missing_required_skills_are_reported():
    response = client.post(
        "/api/score-resume",
        json={
            "resume_text": "I write python every day.",
            "job_description": "Kubernetes and Terraform role.",
            "required_skills": ["python", "kubernetes", "terraform"],
        },
    )

    assert response.status_code == 200
    body = response.json()
    assert body["matched_required_skills"] == ["python"]
    assert body["missing_required_skills"] == ["kubernetes", "terraform"]
    assert body["skill_overlap"] == pytest.approx(1 / 3, abs=1e-3)


def test_no_required_skills_does_not_penalize_the_candidate():
    response = client.post(
        "/api/score-resume",
        json={
            "resume_text": "A plain resume with no taxonomic skills.",
            "job_description": "A plain job description.",
            "required_skills": [],
        },
    )

    assert response.status_code == 200
    assert response.json()["skill_overlap"] == 1.0


@pytest.mark.parametrize(
    "payload",
    [
        {"resume_text": "   ", "job_description": "Valid description"},
        {"resume_text": "Valid resume", "job_description": ""},
    ],
)
def test_score_resume_rejects_empty_input(payload):
    response = client.post("/api/score-resume", json=payload)

    assert response.status_code == 400


def test_parse_resume_rejects_unsupported_extension():
    response = client.post(
        "/api/parse-resume",
        files={"file": ("notes.txt", b"just some text", "text/plain")},
    )

    assert response.status_code == 400
