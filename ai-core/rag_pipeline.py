import os
import sys
import json
import time
import chromadb
from chromadb.utils import embedding_functions
from dotenv import load_dotenv

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8')


try:
    from google import genai
    from google.genai import types as genai_types
except ImportError:
    genai = None
    genai_types = None

# Xác định thư mục cơ sở
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# Load biến môi trường từ file .env
load_dotenv(os.path.join(BASE_DIR, ".env"))

# Khởi tạo LLM client theo cấu hình môi trường
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-flash-lite").strip()

if not GEMINI_API_KEY:
    raise ValueError("❌ Không tìm thấy GEMINI_API_KEY trong file .env!")

gemini_client = genai.Client(api_key=GEMINI_API_KEY) if GEMINI_API_KEY and genai else None


class AIServiceError(Exception):
    def __init__(self, status_code, detail):
        super().__init__(detail)
        self.status_code = status_code
        self.detail = detail

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
        """Tìm kiếm thông tin từ Vector DB kết hợp khớp chuỗi chính xác và truy vấn ngữ nghĩa"""
        import re
        
        # 1. Chuẩn hóa câu hỏi & mở rộng từ viết tắt thường gặp của người Việt
        query_lower = query.lower().strip()
        
        # Check if the query is a simple greeting, chitchat or pure adversarial without RAG keywords
        chitchat_greeting_patterns = [
            r"^chào\s+bạn(,\s+mình\s+cần\s+hỗ\s+trợ\.?)?$",
            r"^hello(,\s+có\s+ai\s+ở\s+đó\s+không\??)?$",
            r"^hi(,\s+can\s+you\s+speak\s+english\??)?$",
            r"^bạn\s+tên\s+là\s+gì\??$",
            r"^cảm\s+ơn\s+mobifone\s+nhé.*$",
            r"^chúc\s+bạn\s+một\s+ngày\s+làm\s+việc.*$",
            r"^tạm\s+biệt\s+bạn\s+nhé\.?$",
            r"^bạn\s+có\s+phải\s+là\s+robot\s+không\??$",
            r"^bạn\s+có\s+thích\s+làm\s+việc.*$",
            r"^hôm\s+nay\s+thời\s+tiết.*$",
            r"^hãy\s+bỏ\s+qua.*$",
            r"^mày\s+là\s+con\s+chatbot.*$",
            r"^hãy\s+viết\s+một\s+bài\s+thơ.*$",
            r"^mật\s+khẩu\s+admin.*$",
            r"^hãy\s+cho\s+tôi\s+biết\s+promt.*$",
            r"^hệ\s+điều\s+hành\s+của\s+bạn.*$"
        ]
        
        is_bypass = False
        for pattern in chitchat_greeting_patterns:
            if re.match(pattern, query_lower):
                is_bypass = True
                break
                
        # Also check general keywords for chitchat/adversarial that do not contain service/package keywords
        chitchat_keywords = ["chào", "hello", "hi ", "hi,", "bạn tên gì", "cảm ơn", "thank", "tạm biệt", "bye", "robot", "chatbot", "ai tự do", "mật khẩu", "hack", "lừa đảo", "chế giễu", "bài thơ", "thời tiết", "chúc bạn", "chúc admin", "mạng khác", "viettel", "vinaphone", "server", "system prompt", "hack băng thông"]
        has_rag_triggers = any(kw in query_lower for kw in ["gói", "đăng ký", "hủy", "esim", "e-sim", "5g", "khai báo", "mất sóng", "sóng", "nạp thẻ", "mypoint", "cước", "tiền", "sim", "lịch sử", "nhạc chờ", "funring", "ứng dụng", "thành lập", "là gì", "tốt không", "khách hàng"])
        
        if (any(kw in query_lower for kw in chitchat_keywords) or len(query_lower) < 10) and not has_rag_triggers:
            is_bypass = True
            
        if is_bypass:
            print(f"DEBUG: Query classified as greeting/chitchat/adversarial. Bypassing RAG ChromaDB query.")
            return {
                "documents": [[]],
                "metadatas": [[]]
            }

        abbreviations = {
            r"\bđk\b": "đăng ký",
            r"\bđki\b": "đăng ký",
            r"\bđky\b": "đăng ký",
            r"\bkm\b": "khuyến mãi",
            r"\bkmai\b": "khuyến mãi",
            r"\bdt\b": "data",
            r"\bsđt\b": "số điện thoại",
            r"\bđt\b": "điện thoại",
            r"\besim\b": "eSIM",
            r"\be-sim\b": "eSIM",
            r"\bgói(?!\s+cước)\b": "gói cước",
            r"\bcvqt(\s+quốc\s+tế)?\b": "chuyển vùng quốc tế",
            r"\broaming(\s+quốc\s+tế)?\b": "chuyển vùng quốc tế",
        }
        normalized_query = query
        for pattern, replacement in abbreviations.items():
            normalized_query = re.sub(pattern, replacement, normalized_query, flags=re.IGNORECASE)
            
        print(f"DEBUG: Original Query: '{query}' -> Normalized: '{normalized_query}'")
        
        # 2. Định tuyến danh mục (Category Routing) dựa trên từ khóa câu hỏi
        target_categories = []
        if any(kw in query_lower for kw in ["esim", "e-sim"]):
            target_categories.append("dich_vu")
        if any(kw in query_lower for kw in ["5g", "mạng 5g"]):
            target_categories.append("5g")
        if any(kw in query_lower for kw in ["gói cước", "gói", "đăng ký gói", "goi cuoc", "dang ky"]):
            target_categories.append("goi_cuoc")
        if any(kw in query_lower for kw in ["mất sóng", "sóng", "không gọi được", "lỗi", "hỏng sim", "hỗ trợ", "tổng đài", "cửa hàng", "faq", "giải quyết", "bảo hành", "khiếu nại"]):
            target_categories.append("ho_tro")
            target_categories.append("trang_chu")
        if any(kw in query_lower for kw in ["khuyến mãi", "nạp thẻ", "hoàn tiền", "khuyến mại", "mypoint", "ưu đãi nạp", "quà tặng"]):
            target_categories.append("tin_tuc")
            target_categories.append("mypoint")
            
        # 3. Trích xuất tên gói cước (hỗ trợ cả chữ thường và chữ hoa)
        # Chỉ nhận diện gói cước nếu là dạng alphanumeric hoặc thuộc whitelist gói cước chữ thuần túy
        words = re.findall(r'\b[a-zA-Z0-9]+\b', normalized_query)
        
        package_name = None
        exact_results = {"ids": [], "documents": [], "metadatas": []}
        
        VALID_ALPHABETIC_PACKAGES = {
            "FAG", "FBN", "FCM", "FDNA", "FDNI", "FDTH", "FHCM", "FHN", "FHP", "FKH", "FNA", "FPTH", "FQN", "FTN", "FVL",
            "BIGM", "BIGME", "BOOKING", "GAU", "GC", "GCA", "GHK", "GIN", "GITIHO", "GJ", "GK", "GKU", "GMA", "GS", "GSMA",
            "GTH", "GTW", "GUAE", "GUS", "GUU", "HM", "IELTS", "TOEIC", "KNS", "LM", "MEON", "MEET", "ML", "MLEARN", "MM",
            "MYPOINT", "ND", "RAS", "RB1", "RB2", "RB3", "RC1", "RC2", "RC3", "RH", "RH1", "RH2", "RMIN", "RP", "RS", "RSD",
            "RUD1", "RUD3", "RUD7", "SMAX", "WITALK", "XM", "Y5"
        }
        
        exclusions = {"SMS", "GB", "MB", "DATA", "HOT", "USD", "VND", "RAG", "API", "ESIM"}
        
        for word in words:
            word_upper = word.upper()
            if word_upper in exclusions:
                continue
                
            # Kiểm tra nếu là dạng alphanumeric (chứa cả chữ và số, ví dụ TK135, D5)
            is_alphanumeric = any(c.isdigit() for c in word) and any(c.isalpha() for c in word)
            
            # Hoặc là chữ thuần túy nhưng nằm trong whitelist
            is_valid_alpha = word.isalpha() and word_upper in VALID_ALPHABETIC_PACKAGES
            
            if is_alphanumeric or is_valid_alpha:
                package_name = word_upper
                print(f"🔍 Phát hiện từ khóa gói cước '{package_name}', tiến hành quét khớp chuỗi chính xác...")
                try:
                    # Lấy tất cả tài liệu chứa từ khóa này trong văn bản
                    get_results = self.collection.get(
                        where_document={"$contains": package_name}
                    )
                    if get_results and get_results.get("ids"):
                        exact_results = get_results
                        print(f"✓ Đã tìm thấy {len(exact_results['ids'])} tài liệu chứa từ khóa '{package_name}'.")
                        break
                except Exception as e:
                    print(f"⚠️ Lỗi khi quét khớp chuỗi chính xác: {e}")
        
        # 4. Truy vấn ngữ nghĩa từ ChromaDB sử dụng mở rộng câu truy vấn (Query Expansion)
        queries_to_run = [normalized_query]
        
        # Thêm các câu truy vấn từ khóa nếu phát hiện các chủ đề cụ thể để tối ưu hóa với mô hình embedding tiếng Anh
        if "esim" in query_lower or "e-sim" in query_lower:
            queries_to_run.extend(["eSIM MobiFone", "đổi eSIM My MobiFone", "phí đổi eSIM"])
        elif any(kw in query_lower for kw in ["roaming", "chuyển vùng", "cvqt"]):
            queries_to_run.extend(["chuyển vùng quốc tế MobiFone", "đăng ký roaming", "giá cước roaming"])
        elif "5g" in query_lower:
            queries_to_run.extend(["5G MobiFone", "đăng ký 5G", "gói cước 5G"])
            
        semantic_results_list = []
        for q_text in queries_to_run:
            try:
                res = self.collection.query(
                    query_texts=[q_text],
                    n_results=10  # Lấy 10 kết quả gần nhất cho mỗi câu mở rộng
                )
                semantic_results_list.append(res)
            except Exception as e:
                print(f"⚠️ Lỗi truy vấn ngữ nghĩa cho '{q_text}': {e}")
        
        # 4.2. Tìm kiếm từ khóa bằng lexical search (get) để đảm bảo không bỏ sót tài liệu chứa từ khóa chính xác
        lexical_results = []
        if "esim" in query_lower or "e-sim" in query_lower:
            keywords_to_search = ["eSIM", "esim", "ESIM", "E-sim", "e-sim"]
        elif "5g" in query_lower:
            keywords_to_search = ["5G", "5g"]
        elif any(kw in query_lower for kw in ["roaming", "chuyển vùng", "cvqt"]):
            keywords_to_search = ["roaming", "Roaming", "ROAMING", "chuyển vùng", "Chuyển vùng", "cvqt", "CVQT"]
        else:
            keywords_to_search = []
            
        for kw in keywords_to_search:
            try:
                res = self.collection.get(where_document={"$contains": kw})
                if res and res.get("ids"):
                    lexical_results.append(res)
            except Exception:
                pass
        
        # 5. Hợp nhất và chấm điểm các ứng viên (Re-ranking)
        all_candidates = []
        seen_ids = set()
        
        # Thêm kết quả khớp chuỗi chính xác trước
        if exact_results and exact_results.get("ids"):
            for i in range(len(exact_results["ids"])):
                doc_id = exact_results["ids"][i]
                doc = exact_results["documents"][i]
                meta = exact_results["metadatas"][i] or {}
                
                # Điểm ưu tiên cho khớp chuỗi chính xác
                score = 0.05
                
                # Nếu meta package_name khớp hoàn toàn (ví dụ: TK135)
                meta_pkg_name = str(meta.get("package_name", "")).upper()
                if meta_pkg_name == package_name:
                    score = 0.0  # Ưu tiên cao nhất cho gói cước chính xác
                elif package_name in meta_pkg_name:
                    score = 0.02 # Ưu tiên thứ hai cho các chu kỳ dài hơn
                    
                all_candidates.append({
                    "id": doc_id,
                    "document": doc,
                    "metadata": meta,
                    "score": score
                })
                seen_ids.add(doc_id)
                
        # Thêm kết quả truy vấn ngữ nghĩa từ tất cả các câu truy vấn mở rộng
        for semantic_results in semantic_results_list:
            if semantic_results and semantic_results.get("ids"):
                s_ids = semantic_results["ids"][0]
                s_docs = semantic_results["documents"][0]
                s_metas = semantic_results["metadatas"][0]
                s_dists = semantic_results["distances"][0] if semantic_results.get("distances") else [0.5] * len(s_ids)
                
                for i in range(len(s_ids)):
                    doc_id = s_ids[i]
                    if doc_id not in seen_ids:
                        meta = s_metas[i] or {}
                        dist = s_dists[i]
                        
                        # Áp dụng Boosting danh mục
                        category = meta.get("category", "")
                        if target_categories and category in target_categories:
                            dist = dist * 0.3  # Giảm khoảng cách để đẩy lên đầu
                            print(f"✨ Boosting document {doc_id} vì thuộc danh mục khớp '{category}'")
                            
                        doc_lower = s_docs[i].lower()
                        has_keyword_match = True
                        
                        # 1. Khớp từ khóa eSIM
                        if "esim" in query_lower or "e-sim" in query_lower:
                            if "esim" in doc_lower or "e-sim" in doc_lower:
                                has_keyword_match = True
                            else:
                                has_keyword_match = False
                                
                        # 2. Khớp từ khóa 5G
                        elif "5g" in query_lower:
                            if "5g" in doc_lower:
                                has_keyword_match = True
                            else:
                                has_keyword_match = False
                                
                        # 3. Khớp từ khóa Chuyển vùng quốc tế / Roaming
                        elif any(kw in query_lower for kw in ["roaming", "chuyển vùng", "đi nước ngoài", "cvqt"]):
                            if any(kw in doc_lower for kw in ["roaming", "chuyển vùng", "cvqt", "nước ngoài"]):
                                has_keyword_match = True
                            else:
                                has_keyword_match = False
                        
                        # Tính toán score dựa trên việc khớp từ khóa
                        if has_keyword_match:
                            score = 0.1 + dist * 0.5
                        else:
                            score = 5.0 + dist * 10.0
                            
                        all_candidates.append({
                            "id": doc_id,
                            "document": s_docs[i],
                            "metadata": meta,
                            "score": score
                        })
                        seen_ids.add(doc_id)
                        
        # Thêm kết quả từ tìm kiếm từ khóa (lexical) nếu chưa có trong danh sách ứng viên
        for l_res in lexical_results:
            l_ids = l_res["ids"]
            l_docs = l_res["documents"]
            l_metas = l_res["metadatas"]
            for i in range(len(l_ids)):
                doc_id = l_ids[i]
                if doc_id not in seen_ids:
                    meta = l_metas[i] or {}
                    dist = 0.8  # Khoảng cách mặc định cho kết quả từ khóa không qua semantic search
                    
                    category = meta.get("category", "")
                    if target_categories and category in target_categories:
                        dist = dist * 0.3
                        
                    score = 0.1 + dist * 0.5
                    
                    all_candidates.append({
                        "id": doc_id,
                        "document": l_docs[i],
                        "metadata": meta,
                        "score": score
                    })
                    seen_ids.add(doc_id)
                    
        # 6. Sắp xếp toàn bộ ứng viên theo điểm ưu tiên tăng dần
        all_candidates.sort(key=lambda x: x["score"])
        
        print("DEBUG: Top 10 sorted candidates:")
        for idx, item in enumerate(all_candidates[:10]):
            print(f"  {idx+1}. ID: {item['id']}, Score: {item['score']:.4f}, Category: {item['metadata'].get('category')}, Doc (first 50 chars): {item['document'][:50].strip().replace('\n', ' ')}")
        
        # 7. Loại bỏ trùng lặp nội dung (Deduplication) để tránh lãng phí context
        unique_docs = []
        unique_metadatas = []
        seen_contents = set()
        
        for item in all_candidates:
            content = item["document"].strip()
            norm_content = " ".join(content.split())
            if norm_content not in seen_contents:
                seen_contents.add(norm_content)
                unique_docs.append(item["document"])
                unique_metadatas.append(item["metadata"])
                
            if len(unique_docs) >= n_results:
                break
                
        return {
            "documents": [unique_docs],
            "metadatas": [unique_metadatas]
        }

    def _call_gemini_with_retry(self, prompt, temperature=0.4, top_p=0.9, max_tokens=None, max_retries=5):
        """Gọi Gemini API với cơ chế retry tự động"""
        if not gemini_client:
            raise AIServiceError(503, "Gemini chưa được cấu hình GEMINI_API_KEY hoặc thiếu thư viện google-genai.")

        for attempt in range(max_retries):
            try:
                # Bỏ qua max_output_tokens để tránh lỗi cắt cụt câu trả lời của mô hình gemini-3.5-flash
                config = genai_types.GenerateContentConfig(
                    temperature=temperature,
                    top_p=top_p,
                )
                response = gemini_client.models.generate_content(
                    model=GEMINI_MODEL,
                    contents=prompt,
                    config=config,
                )
                if not response.text:
                    raise AIServiceError(502, "Gemini API không trả về nội dung.")
                return response.text
            except AIServiceError:
                raise
            except Exception as e:
                error_msg = str(e)
                print(f"DEBUG: Gemini API call failed with exception: {error_msg}")
                if any(code in error_msg for code in ["429", "500", "502", "503", "504", "Timeout", "UNAVAILABLE"]):
                    if attempt < max_retries - 1:
                        wait_time = (attempt + 1) * 5.0
                        print(f"⚠️ Gemini lỗi tạm thời (lần {attempt+1}/{max_retries}), retry sau {wait_time}s...")
                        time.sleep(wait_time)
                        continue
                    raise AIServiceError(503, "Gemini API không phản hồi sau nhiều lần thử.")
                raise AIServiceError(502, "Gemini API trả về lỗi, vui lòng kiểm tra GEMINI_MODEL và API key.")
        raise AIServiceError(503, "Gemini API không phản hồi sau nhiều lần thử. Vui lòng thử lại sau.")

    def _call_llm_with_retry(self, prompt, temperature=0.4, top_p=0.9, max_tokens=512, max_retries=5):
        """Gọi LLM (chỉ sử dụng Gemini)."""
        return self._call_gemini_with_retry(prompt, temperature, top_p, max_tokens, max_retries)

    def answer_question(self, question, history=None, user_info=None):
        """Truy xuất thông tin liên quan và gửi OpenAI sinh câu trả lời"""
        # 1. Lấy ngữ cảnh tương quan (Tăng từ 3 lên 5 để tối ưu tư vấn)
        retrieved = self.retrieve(question, n_results=5)
        contexts = retrieved.get('documents', [[]])[0]
        sources = retrieved.get('metadatas', [[]])[0]
        
        if not contexts:
            context_text = "Không tìm thấy dữ liệu liên quan trong kho tri thức."
        else:
            context_text = "\n---\n".join(contexts)
            
        # 2. Đọc cấu hình động từ rag_config.json (nếu có)
        config_path = os.path.join(BASE_DIR, "rag_config.json")
        system_prompt = (
            "Bạn là Mia - Chuyên viên Chăm sóc Khách hàng số chuyên nghiệp, thân thiện và tận tâm của nhà mạng MobiFone. 🌟\n"
            "Tuyệt đối KHÔNG tự nhận mình là trợ lý ảo, AI, chatbot hay AI Agent. Hãy xưng hô lịch sự là 'Mia' hoặc 'Chuyên viên chăm sóc khách hàng'.\n"
            "Hãy trả lời câu hỏi của khách hàng một cách lịch sự, thân thiện, súc tích, ĐI THẲNG VÀO TRỌNG TÂM câu hỏi và CHỈ dựa trên thông tin ngữ cảnh chính thức được cung cấp dưới đây.\n\n"
            "[Quy tắc định dạng bắt buộc (Formatting)]:\n"
            "1. TẤT CẢ các phản hồi (bao gồm chào hỏi, chitchat xã giao, thông báo lỗi, từ chối, v.v.) BẮT BUỘC phải dùng định dạng Markdown rõ ràng (chữ in đậm để nhấn mạnh ý chính, dấu gạch đầu dòng phân biệt các mục) và bắt buộc sử dụng các biểu tượng cảm xúc (emoji/icon như 👋, 📶, 📱, 💸, 🌟, 🛠️, 🎁) để làm nổi bật thông tin. Tuyệt đối KHÔNG trả lời dưới dạng một đoạn văn thuần túy không có định dạng.\n"
            "2. Khi liệt kê các thông số gói cước hoặc dịch vụ, hãy sử dụng các dấu gạch đầu dòng rõ ràng, không viết thành một đoạn văn dài dòng.\n"
            "3. Nếu khách hàng hỏi bằng tiếng Anh (ví dụ: 'Hi, can you speak English?'), hãy phản hồi lịch sự bằng tiếng Anh rằng bạn có thể hỗ trợ khách hàng bằng cả tiếng Anh và tiếng Việt, và hỏi xem bạn có thể giúp gì cho họ.\n\n"
            "[Nguyên tắc phản hồi và Luồng hội thoại tối ưu]:\n"
            "1. KHÔNG YÊU CẦU HỎI TÊN KHÁCH HÀNG: Tuyệt đối không chủ động yêu cầu khách hàng cung cấp tên trong lời chào hay trong cuộc đối thoại. Nếu khách hàng đã đăng nhập, thông tin tên của họ sẽ được cung cấp sẵn cho bạn.\n"
            "2. THÔNG TIN SẢN PHẨM/GÓI CƯỚC RÕ RÀNG: Khi giới thiệu bất kỳ gói cước hay sản phẩm nào từ ngữ cảnh, bạn BẮT BUỘC phải cung cấp đầy đủ và chính xác: Giá cước cụ thể (đồng/chu kỳ), Thời hạn/Chu kỳ sử dụng (ngày/tháng), và các Lợi ích chi tiết (Dung lượng data tốc độ cao, số phút gọi miễn phí...). Tuyệt đối không viết chung chung mơ hồ.\n"
            "3. GIAO TIẾP TỪNG BƯỚC (PROGRESSIVE CONVERSATION): Tránh đặt nhiều câu hỏi hoặc cung cấp quá nhiều lựa chọn dồn dập cùng lúc khiến khách hàng bối rối. Hãy đưa ra hướng dẫn hoặc câu hỏi gợi mở từng bước.\n"
            "4. KẾT THÚC BẰNG CALL-TO-ACTION (CTA) RÕ RÀNG: Mọi phản hồi tư vấn sản phẩm/dịch vụ phải luôn kết thúc bằng một câu kêu gọi hành động cụ thể, rõ ràng để khách hàng dễ dàng đưa ra quyết định tiếp theo (Ví dụ: \"Bạn có muốn tôi hỗ trợ đăng ký gói TK135 này ngay bây giờ không?\").\n"
            "5. CHỈ TRẢ LỜI dựa trên thông tin có sẵn trong ngữ cảnh. Tuyệt đối KHÔNG tự bịa đặt thông số gói cước.\n"
            "6. Nếu khách hàng hỏi về một gói cước KHÔNG có trong ngữ cảnh: Hãy lịch sự trả lời: \"Hiện tại hệ thống của MobiFone chưa cập nhật thông tin chi tiết về gói cước mà bạn quan tâm trong cơ sở dữ liệu hiện hành. Để hỗ trợ tốt nhất, bạn có thể để lại Số điện thoại, chuyên viên kỹ thuật sẽ kiểm tra trực tiếp trên thuê bao của bạn và gọi lại tư vấn ngay ạ.\"\n"
            "7. Tuyệt đối KHÔNG sử dụng các kỹ thuật ép buộc hay hối thúc bán hàng giả tạo.\n"
            "8. Khi khách hàng cung cấp số điện thoại, tuyệt đối KHÔNG lặp lại số điện thoại đó ở tin nhắn tiếp theo.\n"
            "9. Đối với câu chào hỏi, cảm ơn hoặc hỏi thăm xã giao (không yêu cầu tra cứu dịch vụ): Trả lời giới thiệu bản thân là Mia, luôn thân thiện, lịch sự, KHÔNG yêu cầu Số điện thoại. Đồng thời gợi ý danh sách các chủ đề hỗ trợ (gói cước 4G/5G, đổi eSIM, hỗ trợ kỹ thuật...) bằng dấu gạch đầu dòng rõ ràng kèm emoji và đặt 1 câu hỏi dẫn dắt nhẹ nhàng."
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

        # Bổ sung thông tin khách hàng đăng nhập nếu có
        user_context = ""
        if user_info and isinstance(user_info, dict):
            user_context = "\n[Thông tin khách hàng đang đăng nhập]:\n"
            name = user_info.get("name")
            phone = user_info.get("phone")
            tier = user_info.get("tier")
            package = user_info.get("package")
            package_expiry = user_info.get("packageExpiry")
            if name:
                user_context += f"- Tên khách hàng: {name}\n"
            if phone:
                user_context += f"- Số điện thoại: {phone}\n"
            if tier:
                user_context += f"- Hạng hội viên: {tier}\n"
            if package:
                user_context += f"- Gói cước đang hoạt động: {package}\n"
            if package_expiry:
                user_context += f"- Thời hạn gói cước: {package_expiry}\n"

        # 3. Xây dựng Prompt Engineering chuẩn
        prompt = f"""{system_prompt}
"""
        if user_context:
            prompt += user_context

        prompt += f"""
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

[Yêu cầu bắt buộc về phần câu hỏi gợi ý tiếp theo]:
Cuối câu trả lời của bạn, hãy tạo thêm 3 câu hỏi gợi ý tiếp theo có liên quan chặt chẽ đến câu hỏi hiện tại hoặc ngữ cảnh hội thoại vừa rồi (Khách hàng có thể muốn hỏi các câu này tiếp theo). Các câu hỏi gợi ý phải ngắn gọn, thiết thực và có ích.
Định dạng phần gợi ý ở cuối câu trả lời của bạn theo đúng mẫu sau (không viết thêm lời giải thích nào khác ở phần gợi ý):
[GỢI Ý]
1. <Câu hỏi gợi ý 1>
2. <Câu hỏi gợi ý 2>
3. <Câu hỏi gợi ý 3>

[Câu trả lời của bạn]:"""

        # 4. Gọi LLM với cơ chế retry tự động và tham số tùy chỉnh
        answer = self._call_llm_with_retry(
            prompt,
            temperature=temperature,
            top_p=top_p,
            max_tokens=max_tokens
        )
        
        # Tách phần gợi ý câu hỏi ở cuối phản hồi
        import re
        suggested_questions = []
        parts = re.split(r'\[GỢI\s*Ý\]', answer, flags=re.IGNORECASE)
        if len(parts) > 1:
            answer = parts[0].strip()
            suggestions_block = parts[1].strip()
            for line in suggestions_block.split("\n"):
                line = line.strip()
                cleaned_line = re.sub(r'^\d+[\.\-\s]+', '', line).strip()
                cleaned_line = re.sub(r'^[\-\*\+\s]+', '', cleaned_line).strip()
                if cleaned_line and len(cleaned_line) > 3:
                    if not cleaned_line.startswith(('[', ']', '<', '>')):
                        suggested_questions.append(cleaned_line)
                        
        # Fallback nếu không có gợi ý sinh ra hoặc có lỗi định dạng
        if not suggested_questions:
            if any(kw in question.lower() for kw in ["gói", "đăng ký", "data"]):
                suggested_questions = [
                    "Các gói cước 4G/5G MobiFone hot nhất?",
                    "Cú pháp đăng ký gói cước như thế nào?",
                    "Tư vấn gói cước data dung lượng khủng?"
                ]
            elif any(kw in question.lower() for kw in ["esim", "sim"]):
                suggested_questions = [
                    "Thủ tục đổi eSIM MobiFone cần gì?",
                    "Phí đổi eSIM MobiFone là bao nhiêu?",
                    "eSIM có dùng chung số với SIM vật lý không?"
                ]
            else:
                suggested_questions = [
                    "Đăng ký gói cước nào nhiều ưu đãi nhất?",
                    "Hướng dẫn cài đặt eSIM MobiFone?",
                    "Cách đăng ký mạng 5G MobiFone?"
                ]
        
        # 5. Trích xuất danh sách nguồn tham khảo không trùng lặp
        unique_sources = []
        for src in sources:
            url = src.get("source_url")
            title = src.get("source_title")
            if url and url not in [s['url'] for s in unique_sources]:
                unique_sources.append({"title": title, "url": url})
                
        return answer, unique_sources, suggested_questions

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
    
    answer, sources, _ = bot.answer_question(cau_hoi)
    print(f"\n🤖 Bot trả lời:\n{answer}")
    
    print("\n🔗 Nguồn tham khảo chính thống từ MobiFone:")
    for src in sources:
        print(f"- {src['title']}: {src['url']}")
