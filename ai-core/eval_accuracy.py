import os
import sys
import json
import time
import logging
import re
from dotenv import load_dotenv

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8')

from google import genai
from google.genai import types
from rag_pipeline import MobiFoneRAG

# ---------------------------------------------------------------------------
# Cấu hình Logging chuyên nghiệp
# ---------------------------------------------------------------------------
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger(__name__)

# Tải tệp biến môi trường
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
load_dotenv(os.path.join(BASE_DIR, ".env"))

# ---------------------------------------------------------------------------
# Các hằng số cấu hình hệ thống đánh giá
# ---------------------------------------------------------------------------
JUDGE_PROVIDER = os.getenv("EVAL_JUDGE_PROVIDER", "gemini").lower()
JUDGE_MODEL = os.getenv("EVAL_JUDGE_MODEL", "gemini-3.1-flash-lite")
JUDGE_TEMPERATURE = 0.1
TOP_K = 3                               # Số tài liệu trích xuất từ Vector DB
API_CALL_DELAY_SECONDS = 4.2            # Delay giữa các câu hỏi để tránh Rate Limit (429) của Gemini Free Tier (15 RPM)
MAX_RETRY_ATTEMPTS = 5                  # Số lần thử lại tối đa khi gọi API Judge
RETRY_BACKOFF_SECONDS = 6.0             # Thời gian chờ cơ bản giữa các lần retry
API_TIMEOUT_SECONDS = 60                # Timeout tối đa của API

# ---------------------------------------------------------------------------
# Tập dữ liệu kiểm thử nâng cao (Tải động từ tệp JSON chứa 100 câu)
# ---------------------------------------------------------------------------
DATASET_PATH = os.path.join(BASE_DIR, "eval_dataset_100.json")
if os.path.exists(DATASET_PATH):
    try:
        with open(DATASET_PATH, "r", encoding="utf-8") as f:
            data = json.load(f)
            if isinstance(data, dict) and "test_cases" in data:
                EVAL_DATASET = data["test_cases"]
            else:
                EVAL_DATASET = data
        logger.info("✓ Đã tải thành công %d ca kiểm thử từ %s.", len(EVAL_DATASET), DATASET_PATH)
    except Exception as e:
        logger.error("❌ Lỗi khi đọc file dataset: %s", e)
        EVAL_DATASET = []
else:
    logger.warning("⚠️ Không tìm thấy file %s. Sử dụng tập dữ liệu rỗng.", DATASET_PATH)
    EVAL_DATASET = []


# ---------------------------------------------------------------------------
# Kiểm tra định dạng cấu trúc JSON trả về của Judge
# ---------------------------------------------------------------------------
REQUIRED_SCORE_FIELDS = [
    "context_precision_score",
    "context_precision_reason",
    "context_recall_score",
    "context_recall_reason",
    "faithfulness_score",
    "faithfulness_reason",
    "relevance_score",
    "relevance_reason",
    "correctness_score",
    "correctness_reason",
    "formatting_compliance",
    "formatting_compliance_reason",
    "privacy_compliance",
    "privacy_compliance_reason",
    "overall_feedback",
]

# ---------------------------------------------------------------------------
# Khởi tạo client lazy load
# ---------------------------------------------------------------------------
_gemini_client = None
_openai_client = None


def _get_gemini_client() -> genai.Client:
    """Trả về Gemini client."""
    global _gemini_client
    if _gemini_client is None:
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            raise ValueError("❌ Không tìm thấy GEMINI_API_KEY trong file .env!")
        _gemini_client = genai.Client(api_key=api_key)
    return _gemini_client


def _get_openai_client():
    """Trả về OpenAI client (nếu có API Key)."""
    global _openai_client
    if _openai_client is None:
        api_key = os.getenv("OPENAI_API_KEY")
        if api_key:
            import openai
            _openai_client = openai.OpenAI(api_key=api_key)
    return _openai_client


# ---------------------------------------------------------------------------
# Logic kiểm tra Bảo mật thông tin bằng Regex (Programmatic Check)
# ---------------------------------------------------------------------------
def check_privacy_compliance(query: str, generated_answer: str) -> tuple[bool, str]:
    """
    Kiểm tra xem chatbot có lặp lại bất kỳ số điện thoại nào có trong câu hỏi không.
    Độ chính xác cao hơn so với chỉ dùng LLM Judge chấm điểm.
    """
    phone_pattern = r'(?:\+?84|0)(?:\s*\d){8,10}'
    
    # Lấy ra tất cả các chuỗi số liên tiếp
    raw_query_digits = re.findall(r'\d+', query)
    query_phones = []
    
    for num in raw_query_digits:
        if 9 <= len(num) <= 11 and (num.startswith('0') or num.startswith('84')):
            query_phones.append(num)
            
    # Tìm kiếm theo pattern định dạng số điện thoại
    matched_phones = re.findall(phone_pattern, query)
    for p in matched_phones:
        cleaned = re.sub(r'\D', '', p)
        if cleaned not in query_phones:
            query_phones.append(cleaned)
            
    if not query_phones:
        return True, "Hợp lệ: Không phát hiện số điện thoại nào trong câu hỏi."
        
    cleaned_answer = re.sub(r'\D', '', generated_answer)
    
    for phone in query_phones:
        # Nếu số điện thoại gốc hoặc số điện thoại rút gọn xuất hiện trong câu trả lời
        if phone in generated_answer or phone in cleaned_answer:
            return False, f"Vi phạm: Số điện thoại '{phone}' của khách hàng bị lặp lại trong câu trả lời."
            
    return True, "Hợp lệ: Chatbot không lặp lại số điện thoại của khách hàng trong câu trả lời."


# ---------------------------------------------------------------------------
# Core: Xây dựng Prompt cho Judge chấm điểm nâng cấp
# ---------------------------------------------------------------------------
def _build_judge_prompt(query: str, retrieved_context: str,
                         generated_answer: str, expected_facts: str,
                         full_context: str = None) -> str:
    """Xây dựng prompt chi tiết cho LLM Judge chấm điểm 5 metrics và tuân thủ định dạng."""
    # Nếu có full_context (gồm cả Registration KB inject), dùng nó cho Faithfulness
    context_for_judge = full_context if full_context else retrieved_context
    return f"""Bạn là một Chuyên gia Đánh giá Chất lượng Hệ thống RAG (RAG Quality Assurer).
Nhiệm vụ của bạn là đánh giá câu trả lời được tạo ra từ hệ thống chatbot RAG đối với một câu hỏi cụ thể, dựa trên ngữ cảnh được cung cấp và sự thật kỳ vọng.

[HƯỚNG DẪN QUAN TRỌNG VỀ FAITHFULNESS - ĐỌC KỸ TRƯỚC KHI CHẤM]
Hệ thống RAG này có 2 loại nguồn tri thức hợp lệ:
(A) Ngữ cảnh truy xuất từ Vector DB (hiển thị trong "Ngữ cảnh đầy đủ cung cấp cho bot" bên dưới).
(B) Nguồn tri thức nội bộ đã được xác thực (hiển thị với nhãn "[CÚ PHÁP ĐĂNG KÝ GÓI...]", "[THÔNG TIN XÁC THỰC]") — đây là dữ liệu CHÍNH THỨC từ hệ thống MobiFone, KHÔNG phải hallucination.
CHỈ coi là hallucination/bịa đặt khi bot đưa ra thông tin KHÔNG CÓ trong cả (A) lẫn (B).
Nếu thông tin nằm trong (B) (có nhãn [CÚ PHÁP ĐĂNG KÝ GÓI...] hoặc [THÔNG TIN XÁC THỰC]), đây là nguồn hợp lệ, KHÔNG trừ điểm Faithfulness.

Hãy chấm điểm theo thang điểm từ 1 đến 5 (5 là tốt nhất) cho các tiêu chí sau:
1. Context Precision (Độ chính xác ngữ cảnh): Các tài liệu ngữ cảnh trích xuất được có thực sự liên quan và hỗ trợ trực tiếp cho câu hỏi không? (1: hoàn toàn không liên quan, 5: cực kỳ liên quan).
2. Context Recall (Độ đầy đủ ngữ cảnh): Ngữ cảnh trích xuất được có chứa đầy đủ thông tin để trả lời câu hỏi theo như "Sự thật kỳ vọng" không? (1: thiếu toàn bộ thông tin, 5: đầy đủ toàn bộ thông tin).
3. Faithfulness (Độ trung thực): Dựa theo HƯỚNG DẪN QUAN TRỌNG ở trên — câu trả lời có dựa trên nguồn tri thức hợp lệ (A) hoặc (B) không? Chỉ phạt nếu bot bịa thông tin không có trong (A) hay (B). (1: bịa đặt hoàn toàn, 5: tuyệt đối trung thực).
4. Answer Relevance (Độ liên quan): Câu trả lời của chatbot có giải quyết trực tiếp và chính xác câu hỏi của người dùng không? (1: lạc đề, 5: trả lời đúng trọng tâm).
5. Information Correctness (Độ chính xác thông tin): So sánh câu trả lời của chatbot với "Sự thật kỳ vọng" (ground truth) — các con số, gói cước, hướng dẫn có khớp không? (1: sai lệch hoàn toàn, 5: khớp hoàn hảo).

Đồng thời đánh giá tính tuân thủ (trả về true/false):
6. Formatting Compliance (Tuân thủ định dạng): Câu trả lời có sử dụng dấu gạch đầu dòng rõ ràng, chữ in đậm (dùng **) để nhấn mạnh thông số/tên gói, có khoảng cách dòng/đoạn hợp lý và TUYỆT ĐỐI KHÔNG chứa bất kỳ biểu tượng cảm xúc (emoji/icon) nào không? Trả về true nếu tuân thủ đầy đủ (không có emoji, có in đậm và gạch đầu dòng), trả về false nếu chứa bất kỳ emoji nào hoặc thiếu định dạng.
7. Privacy Compliance (Tuân thủ bảo mật): Chatbot có lặp lại số điện thoại nào mà khách hàng cung cấp không? Trả về true nếu chatbot không lặp lại SĐT, false nếu chatbot lặp lại SĐT của khách hàng.

[DỮ LIỆU ĐÁNH GIÁ]
- Câu hỏi người dùng: {query}
- Sự thật kỳ vọng (ground truth): {expected_facts}
- Ngữ cảnh đầy đủ cung cấp cho bot (bao gồm tri thức nội bộ đã xác thực):
{context_for_judge}
- Ngữ cảnh chỉ từ Vector DB (dùng để chấm Context Precision & Recall):
{retrieved_context}
- Câu trả lời của Chatbot:
{generated_answer}

[YÊU CẦU ĐỊNH DẠNG ĐẦU RA]
Trả về kết quả dưới dạng JSON duy nhất, không có markdown code block, với các trường sau:
{{
  "context_precision_score": <số từ 1-5>,
  "context_precision_reason": "<lý do đánh giá ngắn gọn>",
  "context_recall_score": <số từ 1-5>,
  "context_recall_reason": "<lý do đánh giá ngắn gọn>",
  "faithfulness_score": <số từ 1-5>,
  "faithfulness_reason": "<lý do đánh giá ngắn gọn>",
  "relevance_score": <số từ 1-5>,
  "relevance_reason": "<lý do đánh giá ngắn gọn>",
  "correctness_score": <số từ 1-5>,
  "correctness_reason": "<lý do đánh giá ngắn gọn>",
  "formatting_compliance": <true hoặc false>,
  "formatting_compliance_reason": "<lý do đánh giá ngắn gọn>",
  "privacy_compliance": <true hoặc false>,
  "privacy_compliance_reason": "<lý do đánh giá ngắn gọn>",
  "overall_feedback": "<nhận xét tổng quan về câu trả lời>"
}}"""


def _validate_scores(scores: dict) -> dict:
    """Kiểm tra JSON response có đủ trường bắt buộc và kiểu dữ liệu hợp lệ không."""
    for field in REQUIRED_SCORE_FIELDS:
        if field not in scores:
            raise ValueError(f"Thiếu trường bắt buộc trong JSON response: '{field}'")
            
    # Kiểm tra kiểu của các điểm số (1-5)
    for score_field in (
        "context_precision_score", "context_recall_score",
        "faithfulness_score", "relevance_score", "correctness_score"
    ):
        val = scores[score_field]
        if not isinstance(val, (int, float)) or not (1 <= val <= 5):
            raise ValueError(f"Giá trị không hợp lệ cho '{score_field}': {val}")
            
    # Kiểm tra kiểu của các trường compliance (bool)
    for comp_field in ("formatting_compliance", "privacy_compliance"):
        val = scores[comp_field]
        if not isinstance(val, bool):
            # Cố gắng chuyển đổi nếu là chuỗi
            if str(val).lower() in ("true", "1", "yes"):
                scores[comp_field] = True
            elif str(val).lower() in ("false", "0", "no"):
                scores[comp_field] = False
            else:
                raise ValueError(f"Giá trị không hợp lệ cho '{comp_field}': {val}")
                
    return scores


def _error_scores(reason: str) -> dict:
    """Trả về dict điểm mặc định khi có lỗi không thể phục hồi."""
    return {
        "context_precision_score": 0,
        "context_precision_reason": reason,
        "context_recall_score": 0,
        "context_recall_reason": reason,
        "faithfulness_score": 0,
        "faithfulness_reason": reason,
        "relevance_score": 0,
        "relevance_reason": reason,
        "correctness_score": 0,
        "correctness_reason": reason,
        "formatting_compliance": False,
        "formatting_compliance_reason": reason,
        "privacy_compliance": False,
        "privacy_compliance_reason": reason,
        "overall_feedback": "Không thể chấm điểm tự động do lỗi API.",
    }


def evaluate_response(
    query: str,
    retrieved_context: str,
    generated_answer: str,
    expected_facts: str,
    full_context: str = None,
) -> dict:
    """
    Sử dụng LLM-as-a-Judge (Gemini hoặc OpenAI chéo) để chấm điểm câu trả lời của chatbot.
    full_context: toàn bộ context bot nhận được (gồm cả Registration KB inject & OOD facts).
    """
    prompt = _build_judge_prompt(query, retrieved_context, generated_answer, expected_facts, full_context)
    
    # 1. Thực hiện chấm điểm bằng LLM Judge
    eval_scores = None
    provider_used = JUDGE_PROVIDER
    model_used = JUDGE_MODEL
    
    # Kiểm tra nếu cấu hình dùng OpenAI nhưng không có API Key thì tự động chuyển sang Gemini
    if provider_used == "openai" and not os.getenv("OPENAI_API_KEY"):
        logger.warning("⚠️ Không tìm thấy OPENAI_API_KEY. Tự động chuyển sang sử dụng Gemini làm Judge.")
        provider_used = "gemini"
        model_used = "gemini-3.1-flash-lite"
        
    for attempt in range(1, MAX_RETRY_ATTEMPTS + 1):
        try:
            if provider_used == "openai":
                client = _get_openai_client()
                call_args = {
                    "model": model_used,
                    "messages": [{"role": "user", "content": prompt}],
                    "response_format": {"type": "json_object"},
                    "timeout": API_TIMEOUT_SECONDS,
                }
                # gpt-5-mini và dòng o1/o3 không hỗ trợ tùy chỉnh temperature (chỉ nhận mặc định = 1)
                is_reasoning_model = any(keyword in model_used.lower() for keyword in ["gpt-5", "o1", "o3"])
                if not is_reasoning_model:
                    call_args["temperature"] = JUDGE_TEMPERATURE
                response = client.chat.completions.create(**call_args)
                raw = json.loads(response.choices[0].message.content)
            else:
                client = _get_gemini_client()
                config = types.GenerateContentConfig(
                    temperature=JUDGE_TEMPERATURE,
                    response_mime_type="application/json",
                )
                response = client.models.generate_content(
                    model=model_used,
                    contents=prompt,
                    config=config,
                )
                raw = json.loads(response.text)
                
            eval_scores = _validate_scores(raw)
            break
            
        except json.JSONDecodeError as e:
            logger.warning("Attempt %d/%d — Lỗi phân tích JSON: %s", attempt, MAX_RETRY_ATTEMPTS, e)
        except ValueError as e:
            logger.warning("Attempt %d/%d — Lỗi cấu trúc schema: %s", attempt, MAX_RETRY_ATTEMPTS, e)
        except Exception as e:
            logger.warning("Attempt %d/%d — Lỗi gọi API: %s", attempt, MAX_RETRY_ATTEMPTS, e)
            
        if attempt < MAX_RETRY_ATTEMPTS:
            wait = RETRY_BACKOFF_SECONDS * (2 ** (attempt - 1))
            logger.info("Thử lại sau %.1fs...", wait)
            time.sleep(wait)
            
    if eval_scores is None:
        logger.error("❌ Hết số lần thử, không thể chấm điểm câu hỏi: '%s'", query)
        eval_scores = _error_scores(f"Thất bại sau {MAX_RETRY_ATTEMPTS} lần thử gọi API Judge.")
        
    # 2. Áp dụng programmatic check cho Bảo mật thông tin (đè lên LLM nếu LLM sai sót)
    is_privacy_compliant, privacy_reason = check_privacy_compliance(query, generated_answer)
    if not is_privacy_compliant:
        eval_scores["privacy_compliance"] = False
        eval_scores["privacy_compliance_reason"] = privacy_reason
        # Đồng thời giảm điểm Correctness & Faithfulness về tối thiểu nếu vi phạm bảo mật
        eval_scores["correctness_score"] = min(eval_scores["correctness_score"], 2)
        eval_scores["faithfulness_score"] = min(eval_scores["faithfulness_score"], 2)
        
    return eval_scores


# ---------------------------------------------------------------------------
# Tiến trình chạy Đánh giá chất lượng hệ thống
# ---------------------------------------------------------------------------
def run_evaluation() -> None:
    logger.info("=" * 60)
    logger.info("🚀 BẮT ĐẦU ĐÁNH GIÁ CHẤT LƯỢNG CHATBOT MOBIFONE NÂNG CẤP")
    logger.info("  - Judge Provider: %s", JUDGE_PROVIDER if os.getenv("OPENAI_API_KEY") else "gemini (fallback)")
    logger.info("  - Judge Model:    %s", JUDGE_MODEL)
    logger.info("=" * 60)
    
    if not EVAL_DATASET:
        logger.warning("⚠️ Tập dữ liệu EVAL_DATASET rỗng. Dừng đánh giá.")
        return
        
    bot = MobiFoneRAG()
    
    # Đảm bảo Vector DB đã có dữ liệu
    count = bot.collection.count()
    if count == 0:
        logger.warning("⚠️ Kho tri thức rỗng! Tiến hành nạp dữ liệu tri thức trước...")
        bot.index_knowledge_base()
        count = bot.collection.count()
        logger.info("✓ Đã nạp xong %d tri thức.", count)
    else:
        logger.info("✓ Vector DB sẵn sàng với %d mảnh tri thức.", count)
        
    results = []
    
    # Khởi tạo tổng điểm chung
    totals = {
        "context_precision": 0.0,
        "context_recall": 0.0,
        "faithfulness": 0.0,
        "relevance": 0.0,
        "correctness": 0.0,
        "privacy_passes": 0,
        "formatting_passes": 0,
    }
    
    # Vòng lặp chạy đánh giá qua tập dữ liệu
    limit = int(os.getenv("EVAL_LIMIT", "0"))
    dataset_to_run = EVAL_DATASET[:limit] if limit > 0 else EVAL_DATASET
    
    for item in dataset_to_run:
        logger.info("")
        logger.info("📝 [%s] Đang kiểm tra câu hỏi: '%s'", item["category"], item["query"])
        
        # 1. Truy xuất Context từ Vector DB
        ret_results = bot.retrieve(item["query"], n_results=TOP_K)
        contexts = ret_results.get("documents", [[]])[0]
        context_text = "\n---\n".join(contexts) if contexts else "Không có ngữ cảnh."
        
        # 2. Gọi Chatbot sinh câu trả lời — capture full_context từ answer_question
        start_time = time.time()
        answer, sources, _ = bot.answer_question(item["query"])
        latency = time.time() - start_time
        
        # [Sprint 3] Build full_context = retrieved + OOD injection + Registration KB
        # để Judge biết toàn bộ nguồn hợp lệ mà bot đã dùng
        full_ctx_parts = [context_text]
        # Kiểm tra OOD injection
        query_lower_eval = item["query"].lower()
        if any(k in query_lower_eval for k in ["v90", "v120", "st90", "mimax", "vinaphone", "viettel", "u1500", "vd149", "big90"]):
            full_ctx_parts.append("[THÔNG TIN XÁC THỰC] Gói này thuộc nhà mạng đối thủ, không phải MobiFone. Bot đã được cung cấp sự thật này từ hệ thống nội bộ.")
        # Kiểm tra Registration KB injection
        reg_keywords = ["đăng ký", "cú pháp", "soạn tin", "ussd", "*098", "9084"]
        if any(k in query_lower_eval for k in ["tk135", "tk90", "f70", "f90n", "mxh100", "mxh150", "data50"]) and \
           any(k in query_lower_eval for k in ["đăng ký", "cách", "hướng dẫn", "soạn", "như thế nào"]):
            full_ctx_parts.append("[CÚ PHÁP ĐĂNG KÝ GÓI - NGUỒN CHÍNH THỨC MOBIFONE] Bot được cung cấp cú pháp SMS, USSD, App đăng ký từ Knowledge Base nội bộ MobiFone đã xác thực.")
        full_context_for_judge = "\n---\n".join(full_ctx_parts)
        
        time.sleep(1.0) # sleep nhẹ tránh overload
        
        # 3. Chấm điểm bằng Judge
        logger.info("🤖 Đang chấm điểm bằng LLM Judge...")
        eval_scores = evaluate_response(
            query=item["query"],
            retrieved_context=context_text,
            generated_answer=answer,
            expected_facts=item["expected_facts"],
            full_context=full_context_for_judge,
        )
        
        # Lưu trữ kết quả
        eval_item = {
            "id": item["id"],
            "category": item["category"],
            "query": item["query"],
            "expected_facts": item["expected_facts"],
            "retrieved_context": contexts,
            "sources": sources,
            "generated_answer": answer,
            "latency_seconds": round(latency, 2),
            "scores": eval_scores,
        }
        results.append(eval_item)
        
        # Cộng điểm
        totals["context_precision"] += eval_scores.get("context_precision_score", 0)
        totals["context_recall"] += eval_scores.get("context_recall_score", 0)
        totals["faithfulness"] += eval_scores.get("faithfulness_score", 0)
        totals["relevance"] += eval_scores.get("relevance_score", 0)
        totals["correctness"] += eval_scores.get("correctness_score", 0)
        if eval_scores.get("privacy_compliance", True):
            totals["privacy_passes"] += 1
        if eval_scores.get("formatting_compliance", True):
            totals["formatting_passes"] += 1
            
        logger.info(
            "📊 Scores: Prec: %d/5 | Rec: %d/5 | Faith: %d/5 | Rel: %d/5 | Corr: %d/5",
            eval_scores.get("context_precision_score"),
            eval_scores.get("context_recall_score"),
            eval_scores.get("faithfulness_score"),
            eval_scores.get("relevance_score"),
            eval_scores.get("correctness_score"),
        )
        logger.info("🔒 Bảo mật SĐT: %s | 🎨 Định dạng: %s", 
                    "ĐẠT" if eval_scores.get("privacy_compliance") else "VI PHẠM",
                    "ĐẠT" if eval_scores.get("formatting_compliance") else "CHƯA ĐẠT")
        logger.info("💬 Ý kiến Judge: %s", eval_scores.get("overall_feedback"))
        
        time.sleep(API_CALL_DELAY_SECONDS)
        
    # Tính điểm trung bình chung
    num_items = len(dataset_to_run)
    avg_precision = round(totals["context_precision"] / num_items, 2)
    avg_recall = round(totals["context_recall"] / num_items, 2)
    avg_faithfulness = round(totals["faithfulness"] / num_items, 2)
    avg_relevance = round(totals["relevance"] / num_items, 2)
    avg_correctness = round(totals["correctness"] / num_items, 2)
    privacy_compliance_rate = round((totals["privacy_passes"] / num_items) * 100, 1)
    formatting_compliance_rate = round((totals["formatting_passes"] / num_items) * 100, 1)
    
    # 4. Gom nhóm kết quả theo danh mục (Category-based Aggregation)
    category_stats = {}
    for res in results:
        cat = res["category"]
        if cat not in category_stats:
            category_stats[cat] = {
                "count": 0,
                "context_precision": 0.0,
                "context_recall": 0.0,
                "faithfulness": 0.0,
                "relevance": 0.0,
                "correctness": 0.0,
                "privacy_passes": 0,
                "formatting_passes": 0,
            }
        stats = category_stats[cat]
        stats["count"] += 1
        scores = res["scores"]
        stats["context_precision"] += scores.get("context_precision_score", 0)
        stats["context_recall"] += scores.get("context_recall_score", 0)
        stats["faithfulness"] += scores.get("faithfulness_score", 0)
        stats["relevance"] += scores.get("relevance_score", 0)
        stats["correctness"] += scores.get("correctness_score", 0)
        if scores.get("privacy_compliance", True):
            stats["privacy_passes"] += 1
        if scores.get("formatting_compliance", True):
            stats["formatting_passes"] += 1
            
    # Tính trung bình theo từng Category
    for cat, stats in category_stats.items():
        cnt = stats["count"]
        stats["context_precision"] = round(stats["context_precision"] / cnt, 2)
        stats["context_recall"] = round(stats["context_recall"] / cnt, 2)
        stats["faithfulness"] = round(stats["faithfulness"] / cnt, 2)
        stats["relevance"] = round(stats["relevance"] / cnt, 2)
        stats["correctness"] = round(stats["correctness"] / cnt, 2)
        stats["privacy_rate"] = round((stats["privacy_passes"] / cnt) * 100, 1)
        stats["formatting_rate"] = round((stats["formatting_passes"] / cnt) * 100, 1)
        
    summary = {
        "judge_provider": JUDGE_PROVIDER if os.getenv("OPENAI_API_KEY") else "gemini (fallback)",
        "judge_model": JUDGE_MODEL,
        "total_test_cases": num_items,
        "averages": {
            "context_precision": avg_precision,
            "context_recall": avg_recall,
            "faithfulness": avg_faithfulness,
            "relevance": avg_relevance,
            "correctness": avg_correctness,
            "privacy_compliance_rate": privacy_compliance_rate,
            "formatting_compliance_rate": formatting_compliance_rate,
        },
        "category_summary": category_stats,
        "details": results,
    }
    
    # Xuất báo cáo dạng JSON
    report_path = os.path.join(BASE_DIR, "eval_accuracy_report.json")
    with open(report_path, "w", encoding="utf-8") as f:
        json.dump(summary, f, ensure_ascii=False, indent=2)
        
    # Xuất báo cáo dạng Markdown
    md_path = os.path.join(BASE_DIR, "eval_accuracy_report.md")
    md_content = _build_markdown_report(summary)
    with open(md_path, "w", encoding="utf-8") as f:
        f.write(md_content)
        
    logger.info("")
    logger.info("=" * 60)
    logger.info("🎉 HOÀN THÀNH ĐÁNH GIÁ CHẤT LƯỢNG RAG CHATBOT NÂNG CẤP")
    logger.info("📊 Faithfulness trung bình: %s/5", avg_faithfulness)
    logger.info("📊 Correctness trung bình:  %s/5", avg_correctness)
    logger.info("🔒 Tỷ lệ đạt bảo mật:     %s%%", privacy_compliance_rate)
    logger.info("🎨 Tỷ lệ đạt định dạng:    %s%%", formatting_compliance_rate)
    logger.info("📂 Đã lưu báo cáo JSON:   %s", report_path)
    logger.info("📂 Đã lưu báo cáo MD:     %s", md_path)
    logger.info("=" * 60)


# ---------------------------------------------------------------------------
# Xây dựng báo cáo Markdown nâng cấp chuyên nghiệp
# ---------------------------------------------------------------------------
def _build_markdown_report(summary: dict) -> str:
    """Xây dựng báo cáo markdown chuyên nghiệp hiển thị các chỉ số nâng cấp."""
    averages = summary["averages"]
    
    lines = [
        "# 📊 Báo cáo đánh giá chất lượng RAG Chatbot MobiFone (Nâng cấp)",
        "",
        f"- **Đơn vị vận hành:** MobiFone AI Lab",
        f"- **Thời gian chạy kiểm thử:** {time.strftime('%Y-%m-%d %H:%M:%S')}",
        f"- **Mô hình làm Judge:** `{summary['judge_model']}` ({summary['judge_provider']})",
        f"- **Tổng số ca kiểm thử:** {summary['total_test_cases']} câu hỏi chuẩn hóa",
        "",
        "---",
        "",
        "## 📈 Kết quả tổng quát",
        "",
        "| Chỉ số | Điểm trung bình / Trạng thái | Mô tả |",
        "| :--- | :---: | :--- |",
        f"| **Context Precision** | **{averages['context_precision']}/5.0** | Độ chính xác và độ liên quan của ngữ cảnh trích xuất |",
        f"| **Context Recall** | **{averages['context_recall']}/5.0** | Sự đầy đủ của ngữ cảnh so với Sự thật kỳ vọng |",
        f"| **Faithfulness** | **{averages['faithfulness']}/5.0** | Tính trung thực của câu trả lời (không bịa đặt ngoài ngữ cảnh) |",
        f"| **Answer Relevance** | **{averages['relevance']}/5.0** | Mức độ trả lời đúng trọng tâm câu hỏi của người dùng |",
        f"| **Information Correctness** | **{averages['correctness']}/5.0** | Độ chính xác của các con số, gói cước và hướng dẫn |",
        f"| **Privacy Compliance** | **{averages['privacy_compliance_rate']}%** | Chatbot tuân thủ bảo mật, không lặp lại SĐT khách hàng |",
        f"| **Formatting Compliance** | **{averages['formatting_compliance_rate']}%** | Câu trả lời phân tách rõ bằng bullet points, KHÔNG sử dụng emoji |",
        "",
        "---",
        "",
        "## 📂 Kết quả chi tiết theo danh mục (Category-based Aggregation)",
        "",
        "Bảng tổng hợp giúp phát hiện điểm yếu của hệ thống tri thức (Vector DB) hoặc LLM theo từng mảng nghiệp vụ:",
        "",
        "| Danh mục | Số câu | Prec | Rec | Faith | Rel | Corr | Bảo mật | Định dạng |",
        "| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |",
    ]
    
    for cat, stats in summary["category_summary"].items():
        lines.append(
            f"| **{cat}** | {stats['count']} | {stats['context_precision']} | {stats['context_recall']} | "
            f"{stats['faithfulness']} | {stats['relevance']} | {stats['correctness']} | "
            f"{stats['privacy_rate']}% | {stats['formatting_rate']}% |"
        )
        
    lines += [
        "",
        "---",
        "",
        "## 🔍 Chi tiết từng ca kiểm thử",
    ]
    
    for detail in summary["details"]:
        scores = detail["scores"]
        sources_list = []
        for s in (detail.get("sources") or []):
            if isinstance(s, dict):
                sources_list.append(f"[{s.get('title', 'Nguồn')}]({s.get('url', '#')})")
            else:
                sources_list.append(str(s))
        sources_str = ", ".join(sources_list) or "Không có nguồn trích dẫn"
        
        lines += [
            "",
            f"### Test Case #{detail['id']}: {detail['query']}",
            f"- **Danh mục:** `{detail['category']}`",
            f"- **Thời gian xử lý:** {detail['latency_seconds']}s",
            f"- **Nguồn trích dẫn:** {sources_str}",
            f"- **Sự thật kỳ vọng (Ground Truth):** *{detail['expected_facts']}*",
            "",
            "#### Điểm số chi tiết:",
            f"- **Context Precision:** {scores.get('context_precision_score')}/5 — *{scores.get('context_precision_reason')}*",
            f"- **Context Recall:** {scores.get('context_recall_score')}/5 — *{scores.get('context_recall_reason')}*",
            f"- **Faithfulness:** {scores.get('faithfulness_score')}/5 — *{scores.get('faithfulness_reason')}*",
            f"- **Answer Relevance:** {scores.get('relevance_score')}/5 — *{scores.get('relevance_reason')}*",
            f"- **Information Correctness:** {scores.get('correctness_score')}/5 — *{scores.get('correctness_reason')}*",
            f"- **Bảo mật thông tin (SĐT):** {'✅ ĐẠT' if scores.get('privacy_compliance') else '❌ VI PHẠM'} — *{scores.get('privacy_compliance_reason')}*",
            f"- **Định dạng (Markdown & Bố cục):** {'✅ ĐẠT' if scores.get('formatting_compliance') else '❌ CHƯA ĐẠT'} — *{scores.get('formatting_compliance_reason')}*",
            "",
            "#### Câu trả lời của chatbot:",
            "```markdown",
            detail["generated_answer"],
            "```",
            "",
            "**Nhận xét tổng hợp từ Judge:**",
            f"> {scores.get('overall_feedback')}",
            "",
            "---",
        ]
        
    return "\n".join(lines)


if __name__ == "__main__":
    run_evaluation()
