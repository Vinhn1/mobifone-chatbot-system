import os, json, time, threading
from datetime import datetime, timezone
from typing import Optional

_lock = threading.Lock()
_metrics: list = []
_MAX_IN_MEMORY = 1000

# File path de persist metrics
_METRICS_FILE = os.path.join(os.path.dirname(__file__), "data", "sales_metrics.jsonl")


def _ensure_dir():
    os.makedirs(os.path.dirname(_METRICS_FILE), exist_ok=True)


def record_chat_event(
    session_id: str,
    question: str,
    answer_length: int,
    intent_result: Optional[dict] = None,
    latency_ms: float = 0,
    was_reformulated: bool = False,
    sources_count: int = 0,
):
    """
    Ghi lai mot su kien chat vao metrics store.
    Intent result la output cua _classify_sentiment_and_intent().
    """
    _ensure_dir()
    sentiment = "unknown"
    sales_stage = "unknown"
    escalation = False
    lead_capture = False
    competitor = ""

    if intent_result:
        sentiment = intent_result.get("sentiment", "unknown")
        sales_stage = intent_result.get("sales_stage", "unknown")
        escalation = bool(intent_result.get("escalation_required", False))
        lead_capture = bool(intent_result.get("lead_capture", False))
        competitor = intent_result.get("competitor_mentioned", "")

    event = {
        "ts": datetime.now(timezone.utc).isoformat(),
        "session_id": session_id,
        "question_len": len(question),
        "answer_len": answer_length,
        "sentiment": sentiment,
        "sales_stage": sales_stage,
        "escalation_required": escalation,
        "lead_capture": lead_capture,
        "competitor_mentioned": competitor,
        "latency_ms": round(latency_ms, 1),
        "was_reformulated": was_reformulated,
        "sources_count": sources_count,
    }

    # Ghi vao memory buffer
    with _lock:
        _metrics.append(event)
        if len(_metrics) > _MAX_IN_MEMORY:
            _metrics.pop(0)

    # Append vao JSONL file (thread-safe vi dung mode a)
    try:
        with open(_METRICS_FILE, "a", encoding="utf-8") as f:
            f.write(json.dumps(event, ensure_ascii=False) + "\n")
    except Exception as e:
        print(f"[METRICS] Write error: {e}")

    # Log cac su kien quan trong
    if escalation:
        print(f"[METRICS] ESCALATION event | session={session_id[:8]} | q={question[:60]}")
    if lead_capture:
        print(f"[METRICS] LEAD-CAPTURE event | session={session_id[:8]} | stage={sales_stage}")
    if competitor:
        print(f"[METRICS] COMPETITOR mention={competitor} | session={session_id[:8]}")


def get_summary(last_n: int = 100) -> dict:
    """Tra ve tom tat metrics trong last_n su kien gan nhat."""
    with _lock:
        recent = _metrics[-last_n:] if len(_metrics) >= last_n else list(_metrics)

    if not recent:
        return {"total": 0}

    total = len(recent)
    stage_counts = {}
    sentiment_counts = {}
    escalations = 0
    leads = 0
    competitors = {}
    reformulated = 0
    total_latency = 0.0

    for e in recent:
        stage = e.get("sales_stage", "unknown")
        stage_counts[stage] = stage_counts.get(stage, 0) + 1
        sent = e.get("sentiment", "unknown")
        sentiment_counts[sent] = sentiment_counts.get(sent, 0) + 1
        if e.get("escalation_required"): escalations += 1
        if e.get("lead_capture"): leads += 1
        comp = e.get("competitor_mentioned", "")
        if comp:
            competitors[comp] = competitors.get(comp, 0) + 1
        if e.get("was_reformulated"): reformulated += 1
        total_latency += e.get("latency_ms", 0)

    return {
        "total": total,
        "avg_latency_ms": round(total_latency / total, 1) if total > 0 else 0,
        "escalation_rate": round(escalations / total * 100, 1),
        "lead_capture_rate": round(leads / total * 100, 1),
        "reformulation_rate": round(reformulated / total * 100, 1),
        "sales_stages": stage_counts,
        "sentiments": sentiment_counts,
        "competitor_mentions": competitors,
    }
