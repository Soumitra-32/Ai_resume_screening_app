"""
Embedding-based semantic similarity using sentence-transformers.
Model is loaded once at module import and reused across requests.
"""

from sentence_transformers import SentenceTransformer, util

# Small, fast, good general-purpose model — ~80MB download on first run
_MODEL_NAME = "all-MiniLM-L6-v2"

try:
    _model = SentenceTransformer(_MODEL_NAME)
except Exception as e:
    raise RuntimeError(
        f"Failed to load sentence-transformers model '{_MODEL_NAME}'. "
        f"Error: {e}"
    )


def compute_semantic_similarity(text_a: str, text_b: str) -> float:
    """
    Returns cosine similarity between two texts' embeddings, scaled to 0-1.
    """
    if not text_a.strip() or not text_b.strip():
        return 0.0

    # Clean whitespace to match normalize_skill patterns
    clean_a = text_a.strip().lower()
    clean_b = text_b.strip().lower()

    embeddings = _model.encode([clean_a, clean_b], convert_to_tensor=True)
    similarity = util.cos_sim(embeddings[0], embeddings[1]).item()

    # cos_sim can technically be slightly negative; clamp to 0-1 range
    return max(0.0, min(1.0, float(similarity)))


def compute_skill_overlap_similarity(skills_a: list[str], skills_b: list[str]) -> float:
    """
    Computes semantic similarity between two skill lists extracted using the taxonomy.
    Batch encodes skills to prevent performance bottlenecks.
    """
    if not skills_a or not skills_b:
        return 0.0

    # Join extracted taxonomy skills into normalized text blocks
    doc_a = ", ".join(skills_a)
    doc_b = ", ".join(skills_b)

    return compute_semantic_similarity(doc_a, doc_b)