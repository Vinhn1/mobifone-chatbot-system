import re, hashlib

_DOMAIN_MARKERS = [
    "wifi", "cap quang", "mobifiber", "internet",
    "esim", "roaming", "5g", "4g", "dang ky", "data",
    "toc do", "mbps", "gb", "gia cuoc", "bang gia",
    "d5", "d7", "d10", "tk90", "tk135", "tk180",
    "6wifi", "12wifi", "wifi 1plus", "wifi 2plus", "wifi 3plus",
    "viettel", "vnpt", "fpt", "vinaphone", "lap dat",
]

_FOLLOWUP_PATTERNS = [
    r"^vay", r"^do ", r"^con ", r"^nhung ",
    r"^va ", r"^the ", r"^de ",
    r"\bno\b", r"^nhu vay", r"^vay thi",
]

def _hash_history(h):
    recent = h[-6:] if len(h) >= 6 else h
    text = "|".join(m.get("message", "") for m in recent)
    return hashlib.md5(text.encode()).hexdigest()[:12]

def _is_ambiguous(q, history):
    if not history or len(history) < 2:
        return False
    ql = q.lower().strip()
    if len(ql) > 50 or any(m in ql for m in _DOMAIN_MARKERS):
        return False
    if len(ql) < 20:
        return True
    return any(re.search(p, ql) for p in _FOLLOWUP_PATTERNS)

def reformulate_query(question, chat_history=None, gemini_client=None, gemini_model="gemini-2.0-flash-lite"):
    # Rewrite ambiguous follow-up to standalone query
    # Returns (reformulated_str, was_changed_bool)
    if not chat_history or not _is_ambiguous(question, chat_history):
        return question, False
    if not hasattr(reformulate_query, "_cache"):
        reformulate_query._cache = {}
    ck = question + "__" + _hash_history(chat_history)
    if ck in reformulate_query._cache:
        c = reformulate_query._cache[ck]
        print("[REFORMULATOR] cache hit:", repr(question), "->", repr(c))
        return c, c != question
    if not gemini_client:
        print("[REFORMULATOR] no gemini_client -- skip")
        return question, False
    try:
        from google.genai import types as genai_types
        recent = chat_history[-6:] if len(chat_history) >= 6 else chat_history
        hist = ""
        for m in recent:
            r = "Khach hang" if m.get("role") == "user" else "Mia"
            c = m.get("message", "").strip()
            if c:
                hist += r + ": " + c + "\n"
        prompt = (
            "Viet lai cau hoi mo ho thanh cau hoi doc lap de tra cuu MobiFone RAG.\n"
            "Tra ve DUY NHAT cau hoi viet lai (khong markdown).\n\n"
            "Lich su:\n" + hist.strip() + "\n\n"
            "Cau hoi moi: " + question + "\n\n"
            "Neu da ro rang, tra ve nguyen van."
        )
        resp = gemini_client.models.generate_content(
            model=gemini_model, contents=prompt,
            config=genai_types.GenerateContentConfig(temperature=0.0, max_output_tokens=80),
        )
        reformed = (resp.text or "").strip().lstrip("->").strip()
        if not reformed or len(reformed) > 200:
            reformed = question
        if len(reformulate_query._cache) > 512:
            for key in list(reformulate_query._cache.keys())[:128]:
                del reformulate_query._cache[key]
        reformulate_query._cache[ck] = reformed
        changed = reformed.lower().strip() != question.lower().strip()
        if changed:
            print("[REFORMULATOR]", repr(question), "->", repr(reformed))
        return reformed, changed
    except Exception as e:
        print("[REFORMULATOR] error:", e)
        return question, False
