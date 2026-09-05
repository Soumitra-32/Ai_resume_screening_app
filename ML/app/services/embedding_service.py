"""
Embedding-based semantic similarity using sentence-transformers.
Model is loaded lazily on first use, not at module import time, so the
service can start even if the model isn't available yet — semantic
scoring degrades gracefully instead of the whole API failing to boot.
"""

import logging
from threading import Lock
from sentence_transformers import SentenceTransformer, util

logger = logging.getLogger(__name__)

_MODEL_NAME = "all-MiniLM-L6-v2"
_model = None
_model_load_failed = False
_lock = Lock()


def _get_model():
    global _model, _model_load_failed

    if _model is not None:
        return _model
    if _model_load_failed:
        return None

    with _lock:
        if _model is not None:
            return _model
        if _model_load_failed:
            return None
        try:
            _model = SentenceTransformer(_MODEL_NAME)
        except Exception as e:
            logger.error(f"Failed to load sentence-transformers model '{_MODEL_NAME}': {e}")
            _model_load_failed = True
            return None

    return _model


def compute_semantic_similarity(text_a: str, text_b: str) -> float:
    """
    Returns cosine similarity between two texts' embeddings, scaled to 0-1.
    Returns 0.0 (rather than raising) if the model isn't available, so
    scoring can still proceed using skill overlap + experience match alone.
    """
    if not text_a.strip() or not text_b.strip():
        return 0.0

    model = _get_model()
    if model is None:
        return 0.0

    clean_a = text_a.strip().lower()
    clean_b = text_b.strip().lower()

    embeddings = model.encode([clean_a, clean_b], convert_to_tensor=True)
    similarity = util.cos_sim(embeddings[0], embeddings[1]).item()

    return max(0.0, min(1.0, float(similarity)))


def compute_skill_overlap_similarity(skills_a: list[str], skills_b: list[str]) -> float:
    if not skills_a or not skills_b:
        return 0.0

    doc_a = ", ".join(skills_a)
    doc_b = ", ".join(skills_b)

    return compute_semantic_similarity(doc_a, doc_b)


def is_semantic_model_available() -> bool:
    """Lets callers (e.g. /health) report degraded-mode status."""
    return _get_model() is not None