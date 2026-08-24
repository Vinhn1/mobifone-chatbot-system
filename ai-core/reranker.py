import os, logging
from typing import Optional

logger = logging.getLogger(__name__)

_reranker_model = None
_reranker_model_name = None


def _get_reranker(model_name="cross-encoder/ms-marco-MiniLM-L-6-v2"):
    global _reranker_model, _reranker_model_name
    if _reranker_model is not None and _reranker_model_name == model_name:
        return _reranker_model
    try:
        from sentence_transformers import CrossEncoder
        logger.info(f"[RERANKER] Loading CrossEncoder model: {model_name}")
        _reranker_model = CrossEncoder(model_name, max_length=512)
        _reranker_model_name = model_name
        logger.info("[RERANKER] Model loaded successfully")
        return _reranker_model
    except ImportError:
        logger.warning("[RERANKER] sentence-transformers not installed -- reranking disabled")
        return None
    except Exception as e:
        logger.warning(f"[RERANKER] Failed to load model: {e} -- reranking disabled")
        return None


def rerank(
    query: str,
    candidates: list[dict],
    top_k: int = 5,
    model_name: str = "cross-encoder/ms-marco-MiniLM-L-6-v2",
) -> list[dict]:
    """
    Rerank candidates bằng CrossEncoder cross-encoder scoring.
    Mỗi candidate là dict chứa ít nhất: {id, document, metadata, score}
    Returns top_k candidates đã được sắp xếp lại theo cross-encoder score.
    """
    if not candidates:
        return candidates

    model = _get_reranker(model_name)
    if model is None:
        logger.debug("[RERANKER] Skipping -- returning original order")
        return candidates[:top_k]

    try:
        pairs = [[query, c["document"][:512]] for c in candidates]
        scores = model.predict(pairs)
        for i, c in enumerate(candidates):
            c["rerank_score"] = float(scores[i])
        reranked = sorted(candidates, key=lambda x: x.get("rerank_score", 0), reverse=True)
        print(f"[RERANKER] Reranked {len(candidates)} -> top {top_k}")
        for i, c in enumerate(reranked[:top_k]):
            preview = c["document"][:60].replace("\n", " ")
            print(f"  {i+1}. score={c.get("rerank_score", 0):.3f} | {preview}")
        return reranked[:top_k]
    except Exception as e:
        logger.warning(f"[RERANKER] Reranking failed: {e} -- returning original order")
        return candidates[:top_k]
