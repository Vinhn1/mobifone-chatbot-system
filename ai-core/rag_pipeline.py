import os
import json
import time
from openai import OpenAI
import chromadb
from chromadb.utils import embedding_functions
from dotenv import load_dotenv

# Xác định thư mục cơ sở
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# Load biến môi trường từ file .env
load_dotenv(os.path.join(BASE_DIR, ".env"))

# Khởi tạo client OpenAI mới
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
if not OPENAI_API_KEY:
    raise ValueError("❌ Không tìm thấy OPENAI_API_KEY trong file .env! Hãy kiểm tra lại file .env của bạn.")
openai_client = OpenAI(api_key=OPENAI_API_KEY)

class MobiFoneRAG:
    def __init__(self, db_path=None, collection_name="mobifone_knowledge"):
        if db_path is None:
            db_path = os.path.join(BASE_DIR, "chroma_db")
            
        # 1. Khởi tạo ChromaDB client lưu trữ persistent
        self.chroma_client = chromadb.PersistentClient(path=db_path)
        
        # 2. Sử dụng mô hình nhúng mặc định của ChromaDB (nhẹ, chạy offline bằng onnxruntime)
        self.embedding_function = embedding_functions.DefaultEmbeddingFunction()
        
        # 3. Tạo hoặc lấy Collection lưu trữ vector
        self.collection = self.chroma_client.get_or_create_collection(
            name=collection_name,
            embedding_function=self.embedding_function
        )
        
    def index_knowledge_base(self, kb_json_path=None):
        """Đọc file knowledge_base.json đã cào và nạp vào Vector DB"""
        if kb_json_path is None:
            kb_json_path = os.path.join(
                os.path.dirname(BASE_DIR), 
                "mobifone-rag-data-pipeline", 
                "data", 
                "processed", 
                "knowledge_base.json"
            )
            
        if not os.path.exists(kb_json_path):
            print(f"❌ Không tìm thấy file dữ liệu tại: {kb_json_path}")
            return
            
        with open(kb_json_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
            
        print(f"📦 Đang chuẩn bị nạp {len(data)} tri thức vào Vector DB...")
        
        documents = []
        metadatas = []
        ids = []
        
        for index, item in enumerate(data):
            content_text = item.get("content", "")
            if not content_text or len(content_text.strip()) < 10:
                continue
                
            # Tạo metadata đi kèm để hiển thị nguồn dẫn (URL) cho khách hàng tham chiếu
            metadata = {
                "type": item.get("type", "content"),
                "category": item.get("category", "general"),
                "source_url": item.get("source_url", ""),
                "source_title": item.get("source_title", "")
            }
            
            # Thêm thông tin gói cước nếu có
            if item.get("type") == "package":
                metadata["package_name"] = item.get("name", "")
                metadata["price"] = item.get("price", "")
            
            documents.append(content_text)
            metadatas.append(metadata)
            ids.append(f"doc_{index}")
            
        # Chia nhỏ batches để nạp (Tránh quá tải bộ nhớ và giới hạn của SQLite)
        batch_size = 500
        total_len = len(documents)
        print(f"🚀 Bắt đầu nạp {total_len} mảnh dữ liệu vào ChromaDB...")
        
        for i in range(0, total_len, batch_size):
            end_idx = min(i + batch_size, total_len)
            self.collection.add(
                documents=documents[i:end_idx],
                metadatas=metadatas[i:end_idx],
                ids=ids[i:end_idx]
            )
            print(f"  ✓ Đã nạp thành công các mảnh {i} đến {end_idx}")
            
        print("🎉 Nạp dữ liệu vào Vector Database hoàn tất!")

    def retrieve(self, query, n_results=3):
        """Tìm kiếm các thông tin liên quan nhất từ Vector DB"""
        import re
        # Trích xuất tên gói cước từ câu hỏi (ví dụ: TK135, MXH120, D5, 5G1D, SMAX...)
        package_match = re.search(r'\b(?:[0-9]*[A-Z]{1,2}[0-9]+[A-Z]*|[A-Z]{3,6})\b', query)
        
        where_document = None
        if package_match:
            package_name = package_match.group(0)
            exclusions = {"SMS", "GB", "MB", "DATA", "HOT", "USD", "VND", "RAG", "API"}
            if package_name not in exclusions:
                where_document = {"$contains": package_name}
                print(f"🔍 Phát hiện từ khóa gói cước '{package_name}', áp dụng bộ lọc ChromaDB...")

        results = self.collection.query(
            query_texts=[query],
            where_document=where_document,
            n_results=n_results
        )
        
        # Nếu áp dụng bộ lọc nhưng không tìm thấy kết quả nào, thử tìm kiếm không lọc
        if where_document and (not results.get('documents') or not results['documents'][0]):
            print(f"⚠️ Không tìm thấy kết quả chứa '{package_name}', chuyển sang tìm kiếm ngữ nghĩa...")
            results = self.collection.query(
                query_texts=[query],
                n_results=n_results
            )
            
        return results

    def _call_openai_with_retry(self, prompt, temperature=0.4, top_p=0.9, max_tokens=512, max_retries=3):
        """Gọi OpenAI API với cơ chế retry tự động"""
        for attempt in range(max_retries):
            try:
                response = openai_client.chat.completions.create(
                    model="gpt-4o-mini",
                    messages=[
                        {"role": "user", "content": prompt}
                    ],
                    temperature=temperature,
                    top_p=top_p,
                    max_tokens=max_tokens
                )
                return response.choices[0].message.content
            except Exception as e:
                error_msg = str(e)
                print(f"DEBUG: OpenAI API call failed with exception: {error_msg}")
                if any(code in error_msg for code in ["429", "500", "503", "RateLimitError", "APIConnectionError", "Timeout"]):
                    wait_time = 2 ** attempt
                    print(f"⚠️ OpenAI lỗi tạm thời (lần {attempt+1}/{max_retries}), retry sau {wait_time}s...")
                    time.sleep(wait_time)
                else:
                    raise e
        raise Exception("OpenAI API không phản hồi sau nhiều lần thử. Vui lòng thử lại sau.")

    def answer_question(self, question, history=None):
        """Truy xuất thông tin liên quan và gửi OpenAI sinh câu trả lời"""
        # 1. Lấy ngữ cảnh tương quan
        retrieved = self.retrieve(question, n_results=3)
        contexts = retrieved.get('documents', [[]])[0]
        sources = retrieved.get('metadatas', [[]])[0]
        
        if not contexts:
            context_text = "Không tìm thấy dữ liệu liên quan trong kho tri thức."
        else:
            context_text = "\n---\n".join(contexts)
            
        # 2. Đọc cấu hình động từ rag_config.json (nếu có)
        config_path = os.path.join(BASE_DIR, "rag_config.json")
        system_prompt = (
            "Bạn là Chuyên viên chăm sóc khách hàng chuyên nghiệp của nhà mạng MobiFone.\n"
            "Tuyệt đối KHÔNG tự nhận mình là trợ lý ảo, AI, chatbot hay AI Agent. Hãy xưng xô lịch sự là 'MobiFone' hoặc 'Chuyên viên chăm sóc khách hàng'.\n"
            "Hãy trả lời câu hỏi của khách hàng một cách lịch sự, thân thiện, súc tích, ĐI THẲNG VÀO TRỌNG TÂM câu hỏi và CHỈ dựa trên thông tin ngữ cảnh chính thức được cung cấp dưới đây.\n\n"
            "[Nguyên tắc phản hồi]:\n"
            "1. Trả lời trực tiếp và ngắn gọn, không giải thích dài dòng hoặc thừa thãi.\n"
            "2. Sử dụng các ký tự icon (như 🌟, 📦, 📶, 💸, 📝) để phân tách thông tin, giúp người đọc dễ nhìn.\n"
            "3. Định dạng câu trả lời rõ ràng bằng Markdown (in đậm từ khóa quan trọng, sử dụng danh sách gạch đầu dòng).\n"
            "4. Nếu trả lời về gói cước di động, hãy nêu bật:\n"
            "   - 📦 Tên gói cước: (in đậm)\n"
            "   - 💸 Giá cước & Chu kỳ sử dụng\n"
            "   - 📶 Ưu đãi Data và Gọi thoại (chi tiết)\n"
            "   - 📝 Cú pháp đăng ký chuẩn (nếu có trong ngữ cảnh)\n"
            "5. Nếu ngữ cảnh KHÔNG có thông tin để trả lời câu hỏi, hãy khéo léo xin lỗi và hướng dẫn khách hàng để lại Số điện thoại (SĐT) để nhân viên hỗ trợ gọi điện trực tiếp hỗ trợ ngay. Tuyệt đối không tự bịa thông tin ngoài ngữ cảnh."
        )
        temperature = 0.3
        top_p = 0.9
        max_tokens = 512
        
        if os.path.exists(config_path):
            try:
                with open(config_path, 'r', encoding='utf-8') as f:
                    cfg = json.load(f)
                    system_prompt = cfg.get("system_prompt", system_prompt)
                    temperature = float(cfg.get("temperature", temperature))
                    top_p = float(cfg.get("top_p", top_p))
                    max_tokens = int(cfg.get("max_tokens", max_tokens))
            except Exception as e:
                print(f"⚠️ Lỗi đọc file cấu hình, sử dụng mặc định: {e}")

        # 3. Xây dựng Prompt Engineering chuẩn
        prompt = f"""{system_prompt}

[Ngữ cảnh chính thức của MobiFone]:
{context_text}
"""

        # Bổ sung lịch sử trò chuyện nếu có
        if history:
            prompt += "\n[Lịch sử hội thoại gần đây giữa Khách hàng và MobiFone]:\n"
            for msg in history:
                role_label = "Khách hàng" if msg.get("role") == "user" else "MobiFone (Bạn)"
                prompt += f"- {role_label}: {msg.get('message')}\n"

        prompt += f"""
[Câu hỏi hiện tại của khách hàng]:
{question}

[Câu trả lời của bạn]:"""

        # 4. Gọi OpenAI API với cơ chế retry tự động và tham số tùy chỉnh
        answer = self._call_openai_with_retry(
            prompt,
            temperature=temperature,
            top_p=top_p,
            max_tokens=max_tokens
        )
        
        # 5. Trích xuất danh sách nguồn tham khảo không trùng lặp
        unique_sources = []
        for src in sources:
            url = src.get("source_url")
            title = src.get("source_title")
            if url and url not in [s['url'] for s in unique_sources]:
                unique_sources.append({"title": title, "url": url})
                
        return answer, unique_sources

# Demo chạy thử nghiệm
if __name__ == "__main__":
    bot = MobiFoneRAG()
    
    # Kiểm tra xem collection đã có dữ liệu chưa, nếu chưa thì nạp
    count = bot.collection.count()
    if count == 0:
        print("⚠️ Vector DB trống. Đang tiến hành nạp dữ liệu từ file cào...")
        bot.index_knowledge_base()
    else:
        print(f"✅ Vector DB đã sẵn sàng với {count} mảnh tri thức.")
        
    # Thử nghiệm hỏi bot
    cau_hoi = "Gói cước TK135 có ưu đãi gì và đăng ký như thế nào?"
    print(f"\n💬 Câu hỏi thử nghiệm: {cau_hoi}")
    
    answer, sources = bot.answer_question(cau_hoi)
    print(f"\n🤖 Bot trả lời:\n{answer}")
    
    print("\n🔗 Nguồn tham khảo chính thống từ MobiFone:")
    for src in sources:
        print(f"- {src['title']}: {src['url']}")
