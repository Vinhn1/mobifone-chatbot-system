import os
import re
import json
import uuid
import io
from typing import List, Dict, Any, Optional, Tuple
from pydantic import BaseModel

# Try importing pandas for Excel/CSV parsing if available
try:
    import pandas as pd
    PANDAS_AVAILABLE = True
except ImportError:
    PANDAS_AVAILABLE = False


class MessageItem(BaseModel):
    speaker: str  # "customer", "agent", "system", "unknown"
    text: str
    timestamp: Optional[str] = ""


class ChatConversation(BaseModel):
    conversation_id: str
    source_channel: str = "custom"
    messages: List[MessageItem] = []
    rating: Optional[int] = 5
    deal_closed: Optional[bool] = False
    raw_text: Optional[str] = ""


class ExtractedQA(BaseModel):
    question: str
    answer: str
    package_name: Optional[str] = ""
    intent: Optional[str] = "Hỏi đáp dịch vụ"
    sales_stage: Optional[str] = "kham_pha_nhu_cau"
    sales_tactic: Optional[str] = "Tư vấn tiêu chuẩn"
    confidence_score: float = 0.95


class ExtractedSalesTactic(BaseModel):
    customer_objection: str
    agent_strategy: str
    recommended_pitch: str
    package_name: Optional[str] = ""


class MiningAnalysisResult(BaseModel):
    conversation_id: str
    quality_score: float  # 1.0 -> 10.0
    quality_reason: str
    sanitized_messages: List[MessageItem]
    extracted_qa_list: List[ExtractedQA]
    extracted_tactics: List[ExtractedSalesTactic]
    pii_redacted_count: int = 0


# ─── PII REDACTION (Xóa/Mã hóa Thông tin Cá nhân Nâng cao) ──────────────────

def redact_pii(text: str) -> Tuple[str, int]:
    """Mã hóa thông tin cá nhân (SĐT, CCCD, Email, Thẻ ATM/STK, Địa chỉ) trong văn bản."""
    redacted_count = 0

    # 1. Mã hóa SĐT Việt Nam (bắt đầu 03, 05, 07, 08, 09 hoặc 84/ +84)
    phone_pattern = r'(\b(?:\+?84|0)[3|5|7|8|9][0-9]{8}\b)'
    phones = re.findall(phone_pattern, text)
    if phones:
        redacted_count += len(phones)
        text = re.sub(phone_pattern, '[SDT_KH]', text)

    # 2. Mã hóa CCCD / CMND (9 hoặc 12 chữ số dính liền)
    cccd_pattern = r'(\b[0-9]{9}\b|\b[0-9]{12}\b)'
    matches = re.findall(cccd_pattern, text)
    if matches:
        for m in matches:
            if not m.startswith(('03', '05', '07', '08', '09')):
                text = text.replace(m, '[CCCD_KH]')
                redacted_count += 1

    # 3. Mã hóa Thẻ Ngân hàng / ATM (16 chữ số)
    card_pattern = r'(\b[0-9]{4}[- ]?[0-9]{4}[- ]?[0-9]{4}[- ]?[0-9]{4}\b)'
    cards = re.findall(card_pattern, text)
    if cards:
        redacted_count += len(cards)
        text = re.sub(card_pattern, '[SO_THE_NH_KH]', text)

    # 4. Mã hóa Email
    email_pattern = r'([a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+)'
    emails = re.findall(email_pattern, text)
    if emails:
        redacted_count += len(emails)
        text = re.sub(email_pattern, '[EMAIL_KH]', text)

    # 5. Mã hóa Số tài khoản ngân hàng (Khi có từ khóa stk, tài khoản)
    stk_pattern = r'((?:stk|tài khoản|tk)\s*[:\-]?\s*[0-9]{8,15})'
    stks = re.findall(stk_pattern, text, re.IGNORECASE)
    if stks:
        redacted_count += len(stks)
        text = re.sub(stk_pattern, 'STK: [STK_KH]', text, flags=re.IGNORECASE)

    return text, redacted_count


# ─── KHO TRÍ THỨC DEDUPLICATION (Khử trùng lặp câu hỏi Q&A) ────────────────

def _string_similarity(s1: str, s2: str) -> float:
    """Tính độ tương đồng chuỗi đơn giản dựa trên Jaccard Index tập từ."""
    words1 = set(s1.lower().split())
    words2 = set(s2.lower().split())
    if not words1 or not words2:
        return 0.0
    intersection = words1.intersection(words2)
    union = words1.union(words2)
    return len(intersection) / len(union)


def deduplicate_qa_list(qa_list: List[ExtractedQA], collection=None) -> List[Dict[str, Any]]:
    """
    Kiểm tra trùng lặp các câu hỏi Q&A với CSDL ChromaDB hiện có.
    Trả về danh sách QA kèm cờ `is_duplicate` và `existing_answer` nếu trùng.
    """
    result = []
    
    # Lấy danh sách câu hỏi đã nạp từ ChromaDB nếu collection có sẵn
    existing_docs = []
    if collection:
        try:
            records = collection.get(where={"source": "CSKH_Chat_Mining"})
            if records and records.get("metadatas"):
                for meta in records["metadatas"]:
                    if meta and "question" in meta:
                        existing_docs.append(meta["question"])
        except Exception as err:
            print(f"[CHAT-MINER] Cảnh báo đọc ChromaDB để khử trùng: {err}")

    for qa in qa_list:
        is_dup = False
        matched_q = ""
        
        for ex_q in existing_docs:
            sim = _string_similarity(qa.question, ex_q)
            if sim >= 0.75: # Ngưỡng trùng lặp 75%
                is_dup = True
                matched_q = ex_q
                break

        item_dict = qa.dict()
        item_dict["is_duplicate"] = is_dup
        item_dict["matched_question"] = matched_q
        result.append(item_dict)

    return result


# ─── UNLABELED SPEAKER DIARIZATION (Phân vai người nói) ─────────────────────

AGENT_KEYWORDS = [
    "mobifone", "cskh", "chuyên viên", "em là", "dạ chào", "dạ vâng",
    "dạ em", "hỗ trợ anh", "hỗ trợ chị", "đăng ký gói", "cú pháp",
    "gửi 999", "soạn dk", "tổng đài", "ưu đãi gói", "dạ anh", "dạ chị"
]

CUSTOMER_KEYWORDS = [
    "giá bao nhiêu", "bao nhiêu tiền", "sao không", "tại sao", "không được",
    "kiểm tra giúp", "mình muốn", "cho hỏi", "đăng ký thế nào", "gói nào rẻ",
    "bị trừ tiền", "bị khóa", "sim tôi", "sim mình", "hết data", "chậm quá"
]

def predict_speaker_role(text: str) -> str:
    """Đoán vai người nói dựa trên đặc trưng ngôn ngữ viễn thông."""
    text_lower = text.lower().strip()
    
    agent_score = sum(1 for kw in AGENT_KEYWORDS if kw in text_lower)
    customer_score = sum(1 for kw in CUSTOMER_KEYWORDS if kw in text_lower)

    if agent_score > customer_score:
        return "agent"
    elif customer_score > agent_score:
        return "customer"
    
    if text_lower.startswith(("dạ", "chào anh", "chào chị", "cảm ơn anh", "cảm ơn chị")):
        return "agent"
    if "?" in text or text_lower.startswith(("sao ", "tại sao", "có ", "cho ", "mình ")):
        return "customer"

    return "unknown"


def parse_raw_text_to_chat(raw_text: str) -> ChatConversation:
    """Chuyển đổi chuỗi văn bản copy-paste thành ChatConversation."""
    lines = [line.strip() for line in raw_text.split('\n') if line.strip()]
    messages: List[MessageItem] = []
    
    current_role = "unknown"
    
    for line in lines:
        # Hỗ trợ cả trường hợp "Khách hàng (Tên/SĐT): " và "Nhân viên CSKH (Tên): "
        match = re.match(r'^(khách hàng|kh|customer|user|nhân viên|nv|cskh|agent|mobifone|mia).*?[:\-]\s*(.*)$', line, re.IGNORECASE)
        if match:
            speaker_tag = match.group(1).lower()
            content = match.group(2).strip()
            if any(k in speaker_tag for k in ["khách", "kh", "cust", "user"]):
                role = "customer"
            else:
                role = "agent"
            messages.append(MessageItem(speaker=role, text=content))
            current_role = role
        else:
            role = predict_speaker_role(line)
            if role == "unknown" and current_role != "unknown":
                role = current_role
            elif role != "unknown":
                current_role = role
            messages.append(MessageItem(speaker=role if role != "unknown" else "customer", text=line))

    return ChatConversation(
        conversation_id=f"text_{uuid.uuid4().hex[:8]}",
        source_channel="text",
        messages=messages,
        raw_text=raw_text
    )


def parse_file_to_chats(file_bytes: bytes, filename: str) -> List[ChatConversation]:
    """Parse file Excel, CSV, JSON hoặc TXT thành danh sách ChatConversation."""
    ext = os.path.splitext(filename)[1].lower()
    results: List[ChatConversation] = []

    if ext == ".json":
        data = json.loads(file_bytes.decode('utf-8'))
        if isinstance(data, dict):
            data = [data]
        for idx, item in enumerate(data):
            msgs = []
            raw_msgs = item.get("messages", item.get("chat", []))
            for m in raw_msgs:
                if isinstance(m, dict):
                    msgs.append(MessageItem(
                        speaker=m.get("speaker", m.get("role", "unknown")),
                        text=m.get("text", m.get("content", "")),
                        timestamp=str(m.get("timestamp", ""))
                    ))
            results.append(ChatConversation(
                conversation_id=str(item.get("conversation_id", f"json_{idx}")),
                source_channel="json",
                messages=msgs,
                rating=item.get("rating", 5)
            ))

    elif ext in [".csv", ".xlsx", ".xls"] and PANDAS_AVAILABLE:
        buffer = io.BytesIO(file_bytes)
        df = pd.read_csv(buffer) if ext == ".csv" else pd.read_excel(buffer)
        
        id_col = next((col for col in df.columns if any(k in col.lower() for k in ["id", "cuộc chat", "session", "conversation"])), None)
        role_col = next((col for col in df.columns if any(k in col.lower() for k in ["role", "vai", "người", "sender", "speaker"])), None)
        text_col = next((col for col in df.columns if any(k in col.lower() for k in ["text", "nội dung", "message", "content", "tin nhắn"])), None)

        if text_col:
            if id_col:
                grouped = df.groupby(id_col)
                for cid, group in grouped:
                    msgs = []
                    for _, row in group.iterrows():
                        txt = str(row[text_col]) if pd.notna(row[text_col]) else ""
                        role_raw = str(row[role_col]).lower().strip() if role_col and pd.notna(row[role_col]) else ""
                        # Check agent keywords FIRST to prevent "cskh" being matched by "kh" (customer)
                        if any(k in role_raw for k in ["nv", "agent", "cskh", "nhân viên", "mobi", "staff"]):
                            role = "agent"
                        elif any(k in role_raw for k in ["khách hàng", "kh", "cust", "user", "customer", "khach"]):
                            role = "customer"
                        elif role_raw:
                            role = predict_speaker_role(txt)
                        else:
                            role = predict_speaker_role(txt)
                        msgs.append(MessageItem(speaker=role, text=txt))
                    results.append(ChatConversation(conversation_id=str(cid), source_channel=ext[1:], messages=msgs))
            else:
                msgs = []
                for _, row in df.iterrows():
                    txt = str(row[text_col]) if pd.notna(row[text_col]) else ""
                    role_raw = str(row[role_col]).lower().strip() if role_col and pd.notna(row[role_col]) else ""
                    # Check agent keywords FIRST to prevent "cskh" being matched by "kh" (customer)
                    if any(k in role_raw for k in ["nv", "agent", "cskh", "nhân viên", "mobi", "staff"]):
                        role = "agent"
                    elif any(k in role_raw for k in ["khách hàng", "kh", "cust", "user", "customer", "khach"]):
                        role = "customer"
                    elif role_raw:
                        role = predict_speaker_role(txt)
                    else:
                        role = predict_speaker_role(txt)
                    msgs.append(MessageItem(speaker=role, text=txt))
                results.append(ChatConversation(conversation_id=f"file_{uuid.uuid4().hex[:8]}", source_channel=ext[1:], messages=msgs))

    else:
        text = file_bytes.decode('utf-8', errors='ignore')
        results.append(parse_raw_text_to_chat(text))

    return results


# ─── LLM-POWERED CHAT ANALYZER & QA/TACTIC EXTRACTOR ─────────────────────

def analyze_chat_with_llm(conversation: ChatConversation, bot_pipeline=None) -> MiningAnalysisResult:
    """
    Sử dụng LLM (Gemini) để:
    1. Kiểm tra & chuẩn hóa nhãn vai người nói.
    2. Mã hóa PII.
    3. Đánh giá điểm chất lượng cuộc chat (1-10).
    4. Trích xuất danh sách cặp Q&A thực chiến.
    5. Trích xuất kịch bản/kỹ thuật bán hàng (Objection Handling).
    """
    sanitized_messages: List[MessageItem] = []
    total_pii_count = 0

    for m in conversation.messages:
        clean_txt, p_cnt = redact_pii(m.text)
        total_pii_count += p_cnt
        role = m.speaker
        if role not in ["customer", "agent"]:
            role = predict_speaker_role(clean_txt)
        sanitized_messages.append(MessageItem(speaker=role, text=clean_txt, timestamp=m.timestamp))

    formatted_chat_str = "\n".join([f"{'KHÁCH HÀNG' if m.speaker == 'customer' else 'NHÂN VIÊN CSKH'}: {m.text}" for m in sanitized_messages])

    has_llm = bot_pipeline and (hasattr(bot_pipeline, 'ask_llm') or hasattr(bot_pipeline, 'model'))

    if not has_llm:
        extracted_qa = []
        cust_msg = None
        for m in sanitized_messages:
            if m.speaker == "customer":
                cust_msg = m.text
            elif m.speaker == "agent" and cust_msg:
                if len(m.text) > 15:
                    extracted_qa.append(ExtractedQA(
                        question=cust_msg,
                        answer=m.text,
                        intent="Tư vấn dịch vụ",
                        confidence_score=0.85
                    ))
                cust_msg = None

        return MiningAnalysisResult(
            conversation_id=conversation.conversation_id,
            quality_score=8.0 if len(extracted_qa) > 0 else 5.0,
            quality_reason="Phân tích Heuristics cơ bản",
            sanitized_messages=sanitized_messages,
            extracted_qa_list=extracted_qa,
            extracted_tactics=[],
            pii_redacted_count=total_pii_count
        )

    prompt = f"""Bạn là Chuyên gia Phân tích Lịch sử CSKH & Đào tạo Sales AI của MobiFone.
Hãy phân tích đoạn hội thoại CSKH dưới đây và xuất kết quả dưới định dạng JSON duy nhất.

Đoạn hội thoại:
\"\"\"
{formatted_chat_str}
\"\"\"

Yêu cầu phân tích:
1. "quality_score": Điểm số chất lượng cuộc chat từ 1.0 đến 10.0 (Dựa trên độ lịch sự, tư vấn chính xác, thuyết phục).
2. "quality_reason": Lý do ngắn gọn đánh giá điểm số.
3. "extracted_qa_list": Danh sách các cặp Hỏi - Đáp thực chiến trích xuất từ cuộc chat (Bỏ qua chào hỏi xã giao, tập trung vào thắc mắc gói cước, cú pháp, xử lý lỗi). 
   - "sales_stage" BẮT BUỘC chọn 1 trong các giá trị: "kham_pha_nhu_cau", "xu_ly_tu_choi_gia", "chot_don_closing", "khach_phan_nan", "upsell_cross_sell", "so_sanh_doi_thu".
   - "sales_tactic": Tóm tắt ngắn gọn kỹ thuật tư vấn CSKH đã dùng (Ví dụ: "Đồng cảm -> Chia nhỏ chi phí theo ngày -> Đề xuất gói 4GB/ngày").
4. "extracted_tactics": Danh sách các kịch bản/kỹ thuật xử lý từ chối hoặc chốt đơn xuất sắc của nhân viên (nếu có). Mỗi phần tử gồm: "customer_objection" (Khách chê/từ chối), "agent_strategy" (Chiến thuật nhân viên dùng), "recommended_pitch" (Lời khuyên tư vấn mẫu), "package_name".

Trả về KẾT QUẢ JSON DUY NHẤT theo cấu trúc sau (không kèm markdown rác):
{{
  "quality_score": 8.5,
  "quality_reason": "...",
  "extracted_qa_list": [
    {{
      "question": "...",
      "answer": "...",
      "package_name": "...",
      "intent": "...",
      "sales_stage": "xu_ly_tu_choi_gia",
      "sales_tactic": "..."
    }}
  ],
  "extracted_tactics": [
    {{
      "customer_objection": "...",
      "agent_strategy": "...",
      "recommended_pitch": "...",
      "package_name": "..."
    }}
  ]
}}
"""

    try:
        if hasattr(bot_pipeline, 'ask_llm'):
            text_resp = bot_pipeline.ask_llm(prompt)
        else:
            response = bot_pipeline.model.generate_content(prompt)
            text_resp = response.text.strip()
        if text_resp.startswith("```json"):
            text_resp = text_resp[7:]
        if text_resp.endswith("```"):
            text_resp = text_resp[:-3]
        text_resp = text_resp.strip()

        data = json.loads(text_resp)
        qa_list = [ExtractedQA(**item) for item in data.get("extracted_qa_list", [])]
        tactics_list = [ExtractedSalesTactic(**item) for item in data.get("extracted_tactics", [])]

        return MiningAnalysisResult(
            conversation_id=conversation.conversation_id,
            quality_score=float(data.get("quality_score", 8.0)),
            quality_reason=str(data.get("quality_reason", "Đã phân tích qua LLM")),
            sanitized_messages=sanitized_messages,
            extracted_qa_list=qa_list,
            extracted_tactics=tactics_list,
            pii_redacted_count=total_pii_count
        )
    except Exception as e:
        print(f"[CHAT-MINER] Lỗi phân tích LLM: {e}")
        return MiningAnalysisResult(
            conversation_id=conversation.conversation_id,
            quality_score=7.0,
            quality_reason=f"Phân tích dự phòng (Lỗi LLM: {e})",
            sanitized_messages=sanitized_messages,
            extracted_qa_list=[],
            extracted_tactics=[],
            pii_redacted_count=total_pii_count
        )
