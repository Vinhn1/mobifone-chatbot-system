import os
import json
import time
from dotenv import load_dotenv
from google import genai
from google.genai import types
from rag_pipeline import MobiFoneRAG

# Load base directory and environment variables
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
load_dotenv(os.path.join(BASE_DIR, ".env"))

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if not GEMINI_API_KEY:
    raise ValueError("❌ Không tìm thấy GEMINI_API_KEY trong file .env!")

# Gemini client for evaluation grading
eval_client = genai.Client(api_key=GEMINI_API_KEY)

# Define evaluation dataset representing key MobiFone user query domains
EVAL_DATASET = [
    {
        "id": 1,
        "category": "Gói cước",
        "query": "Gói cước TK135 có ưu đãi gì và giá bao nhiêu?",
        "expected_facts": "Giá cước 135.000đ/tháng, ưu đãi 4GB/ngày (120GB/tháng)."
    },
    {
        "id": 2,
        "category": "Gói cước",
        "query": "Tôi muốn đăng ký gói cước nào có 4G tốc độ cao xem TikTok thoải mái?",
        "expected_facts": "Gợi ý gói cước data khủng như TK135 hoặc gói chuyên biệt giải trí."
    },
    {
        "id": 3,
        "category": "eSIM",
        "query": "Cách đổi sang eSIM MobiFone trực tuyến như thế nào và có mất phí không?",
        "expected_facts": "Hướng dẫn đổi eSIM qua ứng dụng/online, thông tin về mức phí hoặc chương trình miễn phí."
    },
    {
        "id": 4,
        "category": "Hỗ trợ kỹ thuật",
        "query": "Điện thoại của tôi bị mất sóng không gọi điện được thì làm thế nào?",
        "expected_facts": "Hướng dẫn kiểm tra thiết bị, liên hệ tổng đài 18001090 hoặc đến cửa hàng."
    },
    {
        "id": 5,
        "category": "Ưu đãi",
        "query": "MobiFone có chương trình khuyến mãi nạp thẻ hay hoàn tiền nào gần đây không?",
        "expected_facts": "Khuyến mãi nạp thẻ, hoàn tiền qua ứng dụng My MobiFone."
    }
]

def evaluate_response_with_gemini(query, retrieved_context, generated_answer):
    """
    Sử dụng Gemini làm Judge (LLM-as-a-Judge) để đánh giá độ chính xác, 
    sự liên quan và độ trung thực của câu trả lời dựa trên ngữ cảnh được cung cấp.
    """
    prompt = f"""Bạn là một Chuyên gia Đánh giá Chất lượng Hệ thống RAG (RAG Quality Assurer).
Nhiệm vụ của bạn là đánh giá câu trả lời được tạo ra từ hệ thống chatbot RAG đối với một câu hỏi cụ thể, dựa trên Ngữ cảnh đã truy xuất được.

Hãy chấm điểm theo thang điểm từ 1 đến 5 (5 là tốt nhất) cho các tiêu chí sau:
1. Faithfulness (Độ trung thực): Câu trả lời có hoàn toàn dựa trên ngữ cảnh không? Có bịa đặt hay ảo tưởng thông tin bên ngoài không?
2. Answer Relevance (Độ liên quan): Câu trả lời có giải quyết trực tiếp và chính xác câu hỏi của người dùng không?
3. Information Correctness (Độ chính xác thông tin): Câu trả lời có chứa các con số, gói cước hoặc hướng dẫn chính xác như ngữ cảnh nêu ra không?

[DỮ LIỆU ĐÁNH GIÁ]
- Câu hỏi người dùng: {query}
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

    try:
        config = types.GenerateContentConfig(
            temperature=0.1,
            response_mime_type="application/json"
        )
        response = eval_client.models.generate_content(
            model="gemini-2.0-flash",
            contents=prompt,
            config=config
        )
        return json.loads(response.text)
    except Exception as e:
        print(f"⚠️ Lỗi khi gọi Gemini Judge: {e}")
        return {
            "faithfulness_score": 0,
            "faithfulness_reason": f"Error: {e}",
            "relevance_score": 0,
            "relevance_reason": f"Error: {e}",
            "correctness_score": 0,
            "correctness_reason": f"Error: {e}",
            "overall_feedback": "Không thể chấm điểm tự động."
        }

def run_evaluation():
    print("="*60)
    print("🚀 BẮT ĐẦU ĐÁNH GIÁ ĐỘ CHÍNH XÁC CHATBOT RAG (MOBIFONE)")
    print("="*60)
    
    bot = MobiFoneRAG()
    
    # Check database readiness
    count = bot.collection.count()
    if count == 0:
        print("⚠️ Kho tri thức rỗng! Tiến hành nạp dữ liệu tri thức trước...")
        bot.index_knowledge_base()
        count = bot.collection.count()
        print(f"✓ Đã nạp xong {count} tri thức.")
    else:
        print(f"✓ Vector DB sẵn sàng với {count} mảnh tri thức.")
        
    results = []
    
    total_faithfulness = 0
    total_relevance = 0
    total_correctness = 0
    
    for item in EVAL_DATASET:
        print(f"\n📝 [{item['category']}] Đang kiểm tra câu hỏi: '{item['query']}'")
        
        # 1. Retrieve context
        ret_results = bot.retrieve(item['query'], n_results=3)
        contexts = ret_results.get('documents', [[]])[0]
        context_text = "\n---\n".join(contexts) if contexts else "Không có ngữ cảnh."
        
        # 2. Get chatbot response
        start_time = time.time()
        answer, sources = bot.answer_question(item['query'])
        latency = time.time() - start_time
        
        # 3. Grade using Gemini Judge
        print("🤖 Đang chấm điểm tự động bằng LLM Judge...")
        eval_scores = evaluate_response_with_gemini(item['query'], context_text, answer)
        
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
            "generated_answer": answer,
            "latency_seconds": round(latency, 2),
            "scores": eval_scores
        }
        results.append(eval_item)
        
        print(f"📊 Điểm số: Faithfulness: {eval_scores.get('faithfulness_score')}/5 | Relevance: {eval_scores.get('relevance_score')}/5 | Correctness: {eval_scores.get('correctness_score')}/5")
        print(f"💬 Nhận xét: {eval_scores.get('overall_feedback')}")
        
    # Calculate averages
    num_items = len(EVAL_DATASET)
    avg_faithfulness = round(total_faithfulness / num_items, 2)
    avg_relevance = round(total_relevance / num_items, 2)
    avg_correctness = round(total_correctness / num_items, 2)
    
    summary = {
        "total_test_cases": num_items,
        "averages": {
            "faithfulness": avg_faithfulness,
            "relevance": avg_relevance,
            "correctness": avg_correctness
        },
        "details": results
    }
    
    # Save report file
    report_path = os.path.join(BASE_DIR, "eval_accuracy_report.json")
    with open(report_path, "w", encoding="utf-8") as f:
        json.dump(summary, f, ensure_ascii=False, indent=2)
        
    # Generate markdown report
    generate_markdown_report(summary)
    
    print("\n" + "="*60)
    print("🎉 HOÀN THÀNH ĐÁNH GIÁ CHẤT LƯỢNG RAG CHATBOT")
    print(f"📊 Faithfulness trung bình: {avg_faithfulness}/5")
    print(f"📊 Relevance trung bình: {avg_relevance}/5")
    print(f"📊 Correctness trung bình: {avg_correctness}/5")
    print(f"📂 Đã lưu báo cáo chi tiết tại: {report_path}")
    print("="*60)

def generate_markdown_report(summary):
    md_content = f"""# Báo cáo đánh giá độ chính xác của RAG Chatbot (MobiFone)

Báo cáo này tự động đánh giá độ chính xác, độ liên quan và độ trung thực của các câu trả lời do chatbot RAG tạo ra, sử dụng Gemini-2.0-flash làm LLM-as-a-Judge.

## 📊 Tóm tắt kết quả
- **Tổng số câu hỏi đánh giá:** {summary['total_test_cases']}
- **Độ trung thực trung bình (Faithfulness):** {summary['averages']['faithfulness']}/5.0
- **Độ liên quan trung bình (Relevance):** {summary['averages']['relevance']}/5.0
- **Độ chính xác thông tin trung bình (Correctness):** {summary['averages']['correctness']}/5.0

---

## 🔍 Chi tiết từng ca kiểm thử
"""
    for detail in summary["details"]:
        scores = detail["scores"]
        md_content += f"""
### Test Case #{detail['id']}: {detail['query']}
- **Phân loại:** {detail['category']}
- **Sự thật kỳ vọng:** {detail['expected_facts']}
- **Thời gian xử lý:** {detail['latency_seconds']}s

#### Điểm đánh giá:
- **Faithfulness:** {scores.get('faithfulness_score')}/5 — *{scores.get('faithfulness_reason')}*
- **Relevance:** {scores.get('relevance_score')}/5 — *{scores.get('relevance_reason')}*
- **Correctness:** {scores.get('correctness_score')}/5 — *{scores.get('correctness_reason')}*

#### Câu trả lời thực tế của chatbot:
```markdown
{detail['generated_answer']}
```

**Nhận xét tổng quan của Judge:**
> {scores.get('overall_feedback')}

---
"""
    
    md_report_path = os.path.join(BASE_DIR, "eval_accuracy_report.md")
    with open(md_report_path, "w", encoding="utf-8") as f:
        f.write(md_content)
    print(f"📂 Đã xuất báo cáo markdown tại: {md_report_path}")

if __name__ == "__main__":
    run_evaluation()
