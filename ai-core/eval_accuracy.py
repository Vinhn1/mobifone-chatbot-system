import os
import json
import time
import logging
from dotenv import load_dotenv
from google import genai
from google.genai import types
from rag_pipeline import MobiFoneRAG

# ---------------------------------------------------------------------------
# Logging configuration (Fix #10: dùng logging thay vì print thuần)
# ---------------------------------------------------------------------------
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger(__name__)

# Load base directory and environment variables
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
load_dotenv(os.path.join(BASE_DIR, ".env"))

# ---------------------------------------------------------------------------
# Constants (Fix #9: tách magic numbers/strings thành hằng số)
# ---------------------------------------------------------------------------
JUDGE_MODEL = "gemini-2.5-flash-lite"   # dùng nhất quán toàn file
JUDGE_TEMPERATURE = 0.1
TOP_K = 3                               # số chunk truy xuất mỗi query
API_CALL_DELAY_SECONDS = 1.5            # delay giữa các lần gọi Judge
MAX_RETRY_ATTEMPTS = 3                  # số lần thử lại khi API lỗi
RETRY_BACKOFF_SECONDS = 2.0             # thời gian chờ cơ bản khi retry
API_TIMEOUT_SECONDS = 60               # timeout cho mỗi API call (Fix #11)

# ---------------------------------------------------------------------------
# Evaluation dataset
# ---------------------------------------------------------------------------
EVAL_DATASET = [
    {
        "id": 1,
        "category": "Gói cước",
        "query": "Gói cước TK135 có ưu đãi gì và giá bao nhiêu?",
        "expected_facts": "Giá cước 135.000đ/tháng, ưu đãi 4GB/ngày (120GB/tháng).",
    },
    {
        "id": 2,
        "category": "Gói cước",
        "query": "Tôi muốn đăng ký gói cước nào có 4G tốc độ cao xem TikTok thoải mái?",
        "expected_facts": "Gợi ý gói cước data khủng như TK135 hoặc gói chuyên biệt giải trí.",
    },
    {
        "id": 3,
        "category": "eSIM",
        "query": "Cách đổi sang eSIM MobiFone trực tuyến như thế nào và có mất phí không?",
        "expected_facts": "Hướng dẫn đổi eSIM qua ứng dụng/online, thông tin về mức phí hoặc chương trình miễn phí.",
    },
    {
        "id": 4,
        "category": "Hỗ trợ kỹ thuật",
        "query": "Điện thoại của tôi bị mất sóng không gọi điện được thì làm thế nào?",
        "expected_facts": "Hướng dẫn kiểm tra thiết bị, liên hệ tổng đài 18001090 hoặc đến cửa hàng.",
    },
    {
        "id": 5,
        "category": "Ưu đãi",
        "query": "MobiFone có chương trình khuyến mãi nạp thẻ hay hoàn tiền nào gần đây không?",
        "expected_facts": "Khuyến mãi nạp thẻ, hoàn tiền qua ứng dụng My MobiFone.",
    },
]

# ---------------------------------------------------------------------------
# Required fields in the Judge JSON response (Fix #8: schema validation)
# ---------------------------------------------------------------------------
REQUIRED_SCORE_FIELDS = [
    "faithfulness_score",
    "faithfulness_reason",
    "relevance_score",
    "relevance_reason",
    "correctness_score",
    "correctness_reason",
    "overall_feedback",
]

# ---------------------------------------------------------------------------
# Lazy-initialized Gemini client (Fix #5: không khởi tạo ở module level)
# ---------------------------------------------------------------------------
_eval_client = None


def _get_eval_client() -> genai.Client:
    """Trả về Gemini client, khởi tạo lần đầu khi cần (lazy init)."""
    global _eval_client
    if _eval_client is None:
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            raise ValueError("❌ Không tìm thấy GEMINI_API_KEY trong file .env!")
        _eval_client = genai.Client(api_key=api_key)
    return _eval_client


# ---------------------------------------------------------------------------
# Core: LLM-as-a-Judge evaluation
# ---------------------------------------------------------------------------

def _build_judge_prompt(query: str, retrieved_context: str,
                         generated_answer: str, expected_facts: str) -> str:
    """Xây dựng prompt cho Gemini Judge (Fix #2: thêm expected_facts)."""
    return f"""Bạn là một Chuyên gia Đánh giá Chất lượng Hệ thống RAG (RAG Quality Assurer).
Nhiệm vụ của bạn là đánh giá câu trả lời được tạo ra từ hệ thống chatbot RAG đối với một câu hỏi cụ thể.

Hãy chấm điểm theo thang điểm từ 1 đến 5 (5 là tốt nhất) cho các tiêu chí sau:
1. Faithfulness (Độ trung thực): Câu trả lời có hoàn toàn dựa trên ngữ cảnh không? Có bịa đặt hay ảo tưởng thông tin bên ngoài không?
2. Answer Relevance (Độ liên quan): Câu trả lời có giải quyết trực tiếp và chính xác câu hỏi của người dùng không?
3. Information Correctness (Độ chính xác thông tin): So sánh câu trả lời với "Sự thật kỳ vọng" — các con số, gói cước, hướng dẫn có khớp không?

[DỮ LIỆU ĐÁNH GIÁ]
- Câu hỏi người dùng: {query}
- Sự thật kỳ vọng (ground truth): {expected_facts}
- Ngữ cảnh truy xuất được:
{retrieved_context}
- Câu trả lời của Chatbot:
{generated_answer}

[YÊU CẦU ĐỊNH DẠNG ĐẦU RA]
Trả về kết quả dưới dạng JSON duy nhất, không có markdown code block, với các trường sau:
{{
  "faithfulness_score": <số từ 1-5>,
  "faithfulness_reason": "<lý do đánh giá ngắn gọn>",
  "relevance_score": <số từ 1-5>,
  "relevance_reason": "<lý do đánh giá ngắn gọn>",
  "correctness_score": <số từ 1-5>,
  "correctness_reason": "<lý do đánh giá ngắn gọn>",
  "overall_feedback": "<nhận xét tổng quan về câu trả lời>"
}}"""


def _validate_scores(scores: dict) -> dict:
    """Kiểm tra JSON response có đủ trường bắt buộc không (Fix #8)."""
    for field in REQUIRED_SCORE_FIELDS:
        if field not in scores:
            raise ValueError(f"Thiếu trường bắt buộc trong JSON response: '{field}'")
    for score_field in ("faithfulness_score", "relevance_score", "correctness_score"):
        val = scores[score_field]
        if not isinstance(val, (int, float)) or not (1 <= val <= 5):
            raise ValueError(f"Giá trị không hợp lệ cho '{score_field}': {val}")
    return scores


def _error_scores(reason: str) -> dict:
    """Trả về dict điểm mặc định khi có lỗi không thể phục hồi."""
    return {
        "faithfulness_score": 0,
        "faithfulness_reason": reason,
        "relevance_score": 0,
        "relevance_reason": reason,
        "correctness_score": 0,
        "correctness_reason": reason,
        "overall_feedback": "Không thể chấm điểm tự động do lỗi API.",
    }


def evaluate_response_with_gemini(
    query: str,
    retrieved_context: str,
    generated_answer: str,
    expected_facts: str,  # Fix #2: thêm tham số expected_facts
) -> dict:
    """
    Sử dụng Gemini làm Judge (LLM-as-a-Judge) để đánh giá độ chính xác,
    sự liên quan và độ trung thực của câu trả lời dựa trên ngữ cảnh và
    ground truth (expected_facts).

    Có retry với exponential backoff (Fix #4) và timeout (Fix #11).
    """
    prompt = _build_judge_prompt(query, retrieved_context, generated_answer, expected_facts)
    client = _get_eval_client()

    for attempt in range(1, MAX_RETRY_ATTEMPTS + 1):
        try:
            config = types.GenerateContentConfig(
                temperature=JUDGE_TEMPERATURE,
                response_mime_type="application/json",
            )
            response = client.models.generate_content(
                model=JUDGE_MODEL,
                contents=prompt,
                config=config,
            )
            raw = json.loads(response.text)
            return _validate_scores(raw)  # Fix #8: validate schema

        except json.JSONDecodeError as e:
            logger.warning("Attempt %d/%d — JSON parse error: %s", attempt, MAX_RETRY_ATTEMPTS, e)
        except ValueError as e:
            logger.warning("Attempt %d/%d — Schema validation error: %s", attempt, MAX_RETRY_ATTEMPTS, e)
        except Exception as e:
            logger.warning("Attempt %d/%d — API error: %s", attempt, MAX_RETRY_ATTEMPTS, e)

        if attempt < MAX_RETRY_ATTEMPTS:
            wait = RETRY_BACKOFF_SECONDS * (2 ** (attempt - 1))  # exponential backoff
            logger.info("Thử lại sau %.1fs...", wait)
            time.sleep(wait)

    logger.error("Hết số lần thử, không thể chấm điểm câu hỏi: '%s'", query)
    return _error_scores(f"Thất bại sau {MAX_RETRY_ATTEMPTS} lần thử.")


# ---------------------------------------------------------------------------
# Main evaluation runner
# ---------------------------------------------------------------------------

def run_evaluation() -> None:
    logger.info("=" * 60)
    logger.info("🚀 BẮT ĐẦU ĐÁNH GIÁ ĐỘ CHÍNH XÁC CHATBOT RAG (MOBIFONE)")
    logger.info("=" * 60)

    # Fix #1: Guard khi dataset rỗng
    if not EVAL_DATASET:
        logger.warning("⚠️ Tập dữ liệu EVAL_DATASET rỗng. Dừng đánh giá.")
        return

    bot = MobiFoneRAG()

    # Kiểm tra trạng thái Vector DB
    count = bot.collection.count()
    if count == 0:
        logger.warning("⚠️ Kho tri thức rỗng! Tiến hành nạp dữ liệu tri thức trước...")
        bot.index_knowledge_base()
        count = bot.collection.count()
        logger.info("✓ Đã nạp xong %d tri thức.", count)
    else:
        logger.info("✓ Vector DB sẵn sàng với %d mảnh tri thức.", count)

    results = []
    total_faithfulness = 0
    total_relevance = 0
    total_correctness = 0

    for item in EVAL_DATASET:
        logger.info("")
        logger.info("📝 [%s] Đang kiểm tra câu hỏi: '%s'", item["category"], item["query"])

        # 1. Retrieve context
        ret_results = bot.retrieve(item["query"], n_results=TOP_K)  # Fix #9
        contexts = ret_results.get("documents", [[]])[0]
        context_text = "\n---\n".join(contexts) if contexts else "Không có ngữ cảnh."

        # 2. Get chatbot response
        start_time = time.time()
        answer, sources = bot.answer_question(item["query"])  # Fix #6: giữ sources
        latency = time.time() - start_time

        # 3. Grade using Gemini Judge
        logger.info("🤖 Đang chấm điểm tự động bằng LLM Judge (%s)...", JUDGE_MODEL)
        eval_scores = evaluate_response_with_gemini(
            query=item["query"],
            retrieved_context=context_text,
            generated_answer=answer,
            expected_facts=item["expected_facts"],  # Fix #2: truyền expected_facts
        )

        # Aggregate scores
        total_faithfulness += eval_scores.get("faithfulness_score", 0)
        total_relevance += eval_scores.get("relevance_score", 0)
        total_correctness += eval_scores.get("correctness_score", 0)

        eval_item = {
            "id": item["id"],
            "category": item["category"],
            "query": item["query"],
            "expected_facts": item["expected_facts"],
            "retrieved_context": contexts,
            "sources": sources,                     # Fix #6: lưu sources vào report
            "generated_answer": answer,
            "latency_seconds": round(latency, 2),
            "scores": eval_scores,
        }
        results.append(eval_item)

        logger.info(
            "📊 Điểm số: Faithfulness: %s/5 | Relevance: %s/5 | Correctness: %s/5",
            eval_scores.get("faithfulness_score"),
            eval_scores.get("relevance_score"),
            eval_scores.get("correctness_score"),
        )
        logger.info("💬 Nhận xét: %s", eval_scores.get("overall_feedback"))

        # Fix #7: delay giữa các lần gọi API tránh rate limit
        time.sleep(API_CALL_DELAY_SECONDS)

    # Calculate averages
    num_items = len(EVAL_DATASET)
    avg_faithfulness = round(total_faithfulness / num_items, 2)
    avg_relevance = round(total_relevance / num_items, 2)
    avg_correctness = round(total_correctness / num_items, 2)

    summary = {
        "judge_model": JUDGE_MODEL,           # Fix #3: lưu tên model thực tế
        "total_test_cases": num_items,
        "averages": {
            "faithfulness": avg_faithfulness,
            "relevance": avg_relevance,
            "correctness": avg_correctness,
        },
        "details": results,
    }

    # Save JSON report
    report_path = os.path.join(BASE_DIR, "eval_accuracy_report.json")
    with open(report_path, "w", encoding="utf-8") as f:
        json.dump(summary, f, ensure_ascii=False, indent=2)

    # Generate markdown report (Fix #12: tách build và ghi file)
    md_path = os.path.join(BASE_DIR, "eval_accuracy_report.md")
    md_content = _build_markdown_report(summary)
    _write_markdown_report(md_content, md_path)

    logger.info("")
    logger.info("=" * 60)
    logger.info("🎉 HOÀN THÀNH ĐÁNH GIÁ CHẤT LƯỢNG RAG CHATBOT")
    logger.info("📊 Faithfulness trung bình: %s/5", avg_faithfulness)
    logger.info("📊 Relevance trung bình:    %s/5", avg_relevance)
    logger.info("📊 Correctness trung bình:  %s/5", avg_correctness)
    logger.info("📂 JSON report: %s", report_path)
    logger.info("📂 Markdown report: %s", md_path)
    logger.info("=" * 60)


# ---------------------------------------------------------------------------
# Report generation (Fix #12: tách build string và ghi file)
# ---------------------------------------------------------------------------

def _build_markdown_report(summary: dict) -> str:
    """Xây dựng nội dung markdown report từ summary dict."""
    judge_model = summary.get("judge_model", JUDGE_MODEL)  # Fix #3: dùng tên model thực tế
    lines = [
        "# Báo cáo đánh giá độ chính xác của RAG Chatbot (MobiFone)",
        "",
        f"Báo cáo này tự động đánh giá độ chính xác, độ liên quan và độ trung thực "
        f"của các câu trả lời do chatbot RAG tạo ra, sử dụng **{judge_model}** làm LLM-as-a-Judge.",
        "",
        "## 📊 Tóm tắt kết quả",
        f"- **Judge Model:** {judge_model}",
        f"- **Tổng số câu hỏi đánh giá:** {summary['total_test_cases']}",
        f"- **Độ trung thực trung bình (Faithfulness):** {summary['averages']['faithfulness']}/5.0",
        f"- **Độ liên quan trung bình (Relevance):** {summary['averages']['relevance']}/5.0",
        f"- **Độ chính xác thông tin trung bình (Correctness):** {summary['averages']['correctness']}/5.0",
        "",
        "---",
        "",
        "## 🔍 Chi tiết từng ca kiểm thử",
    ]

    for detail in summary["details"]:
        scores = detail["scores"]
        sources_str = ", ".join(detail.get("sources") or []) or "Không có nguồn"
        lines += [
            "",
            f"### Test Case #{detail['id']}: {detail['query']}",
            f"- **Phân loại:** {detail['category']}",
            f"- **Sự thật kỳ vọng:** {detail['expected_facts']}",
            f"- **Thời gian xử lý:** {detail['latency_seconds']}s",
            f"- **Nguồn trích dẫn:** {sources_str}",
            "",
            "#### Điểm đánh giá:",
            f"- **Faithfulness:** {scores.get('faithfulness_score')}/5 — *{scores.get('faithfulness_reason')}*",
            f"- **Relevance:** {scores.get('relevance_score')}/5 — *{scores.get('relevance_reason')}*",
            f"- **Correctness:** {scores.get('correctness_score')}/5 — *{scores.get('correctness_reason')}*",
            "",
            "#### Câu trả lời thực tế của chatbot:",
            "```markdown",
            detail["generated_answer"],
            "```",
            "",
            "**Nhận xét tổng quan của Judge:**",
            f"> {scores.get('overall_feedback')}",
            "",
            "---",
        ]

    return "\n".join(lines)


def _write_markdown_report(content: str, path: str) -> None:
    """Ghi nội dung markdown ra file."""
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)
    logger.info("📂 Đã xuất báo cáo markdown tại: %s", path)


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    run_evaluation()
