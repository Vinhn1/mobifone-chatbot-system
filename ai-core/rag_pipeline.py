import os
import sys
import json
import time
import threading
import chromadb
from chromadb.config import Settings as ChromaSettings
from chromadb.utils import embedding_functions
from dotenv import load_dotenv

# Global lock đảm bảo chỉ 1 thread ghi vào ChromaDB (hnswlib không thread-safe)
chroma_write_lock = threading.Lock()

# ─── Phase 1: Import các module nâng cấp ───────────────────────────────────
try:
    from query_reformulator import reformulate_query
    _REFORMULATOR_AVAILABLE = True
except Exception as e:
    _REFORMULATOR_AVAILABLE = False
    print(f"[PIPELINE] query_reformulator not loaded ({e}) -- reformulation disabled")

try:
    from hybrid_retriever import BM25Index, reciprocal_rank_fusion
    _HYBRID_AVAILABLE = True
except Exception as e:
    _HYBRID_AVAILABLE = False
    print(f"[PIPELINE] hybrid_retriever not loaded ({e}) -- BM25 disabled")

try:
    from reranker import rerank as crossencoder_rerank
    _RERANKER_AVAILABLE = True
except Exception as e:
    _RERANKER_AVAILABLE = False
    print(f"[PIPELINE] reranker not loaded ({e}) -- cross-encoder reranking disabled")

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

# Simple Vietnamese Stopwords for dynamic keyword search
VIETNAMESE_STOPWORDS = {
    "và", "hoặc", "của", "cho", "là", "các", "những", "được", "bị", "bởi", "thì", "mà", "nào", "gì", "đâu", "ở", "lúc", 
    "khi", "tại", "sao", "thế", "hãy", "tôi", "bạn", "chào", "vui", "hỗ", "trợ", "cần", "muốn", "vào",
    "với", "ra", "như", "đã", "đang", "sẽ", "đọc", "lại", "có", "không", "biết", "hỏi", "xin",
    "cảm", "ơn", "nhà", "mạng", "cung", "cấp", "dịch", "vụ", "thông", "tin", "chi", "tiết", "cho", "về", "nhé",
    "đây", "đó", "này", "kia", "đều", "tất", "cả", "mình", "sử", "dụng", "dùng", "đăng", "ký", "tìm", "kiếm", "tra", "cứu",
    "bao", "nhiêu", "tốc", "độ", "chu", "kỳ", "số", "lượng", "hạn", "mức", "phí", "tiền", "đồng", "vnđ", "vnd",
    "tư", "vấn", "tư vấn", "giới", "thiệu", "giúp", "giùm", "xem", "em", "anh", "chị"
}

def extract_query_keywords(query: str) -> list:
    import re
    # Remove special characters, keep words and numbers
    clean = re.sub(r'[^\w\s\-\.]', ' ', query.lower())
    words = clean.split()
    
    # Filter stopwords
    filtered_words = [w for w in words if w not in VIETNAMESE_STOPWORDS and len(w) > 1]
    
    # Generate bi-grams to capture compound terms like "thành lập", "gói ngày", "data ngày", "gói cước", "trụ sở"
    bigrams = []
    for i in range(len(words) - 1):
        pair = f"{words[i]} {words[i+1]}"
        if pair in ["gói ngày", "gói cước", "data ngày", "theo ngày", "gói tháng", "gói năm", "thành lập", "slogan", "trụ sở"]:
            bigrams.append(pair)
            
    for i in range(len(filtered_words) - 1):
        bigrams.append(f"{filtered_words[i]} {filtered_words[i+1]}")
        
    # Return unique keywords (bi-grams first, then individual words)
    return list(dict.fromkeys(bigrams + filtered_words))


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
        # anonymized_telemetry=False tắt telemetry để tránh network call không cần thiết
        self.chroma_client = chromadb.PersistentClient(
            path=db_path,
            settings=ChromaSettings(anonymized_telemetry=False)
        )
        
        # 2. Sử dụng mô hình nhúng mặc định của ChromaDB (nhẹ, chạy offline bằng onnxruntime)
        self.embedding_function = embedding_functions.DefaultEmbeddingFunction()
        
        # 3. Tạo hoặc lấy Collection lưu trữ vector cho Sự thật (Facts)
        self.collection = self.chroma_client.get_or_create_collection(
            name=collection_name,
            embedding_function=self.embedding_function
        )

        # 4. Tầng 2: Collection riêng lưu trữ Kịch bản CSKH Bán hàng & Thuyết phục (Behavior Playbook)
        self.playbook_collection = self.chroma_client.get_or_create_collection(
            name="mobifone_sales_playbook",
            embedding_function=self.embedding_function
        )

        # 5. [Phase 1] BM25 Index cho hybrid search (lazy-build khi retrieve() lần đầu)
        self._bm25_index: "BM25Index | None" = BM25Index() if _HYBRID_AVAILABLE else None
        self._bm25_built = False

        # 6. [Phase 2] Metrics state cache cho lượt chat gần nhất
        self._last_intent = None
        self._last_was_reformulated = False
        
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
        has_rag_triggers = any(kw in query_lower for kw in ["gói", "đăng ký", "hủy", "esim", "e-sim", "5g", "khai báo", "mất sóng", "sóng", "nạp thẻ", "mypoint", "cước", "tiền", "sim", "lịch sử", "nhạc chờ", "funring", "ứng dụng", "thành lập", "là gì", "tốt không", "khách hàng", "wifi", "tivi", "internet", "cáp quang", "mobifiber", "băng thông", "nhà", "thiết bị"])
        
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
        dynamic_keywords = extract_query_keywords(normalized_query)
        
        # 2. Định tuyến danh mục (Category Routing) dựa trên từ khóa câu hỏi
        target_categories = []
        is_day_package_query = any(kw in query_lower for kw in [
            "gói ngày", "gói cước ngày", "data ngày", "theo ngày", "1 ngày", "3 ngày", "7 ngày",
            "dùng trong ngày", "ngắn ngày", "gói 1 ngày", "gói data ngày", "cước ngày", "gói theo ngày"
        ])
        
        if any(kw in query_lower for kw in ["esim", "e-sim"]):
            target_categories.append("dich_vu")
        if any(kw in query_lower for kw in ["5g", "mạng 5g"]):
            target_categories.append("5g")
        if any(kw in query_lower for kw in ["gói cước", "gói", "đăng ký gói", "goi cuoc", "dang ky"]) or is_day_package_query:
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
        
        VALID_ALPHABETIC_PACKAGES = {
            "FAG", "FBN", "FCM", "FDNA", "FDNI", "FDTH", "FHCM", "FHN", "FHP", "FKH", "FNA", "FPTH", "FQN", "FTN", "FVL",
            "BIGM", "BIGME", "BOOKING", "GAU", "GC", "GCA", "GHK", "GIN", "GITIHO", "GJ", "GK", "GKU", "GMA", "GS", "GSMA",
            "GTH", "GTW", "GUAE", "GUS", "GUU", "HM", "IELTS", "TOEIC", "KNS", "LM", "MEON", "MEET", "ML", "MLEARN", "MM",
            "MYPOINT", "ND", "RAS", "RB1", "RB2", "RB3", "RC1", "RC2", "RC3", "RH", "RH1", "RH2", "RMIN", "RP", "RS", "RSD",
            "RUD1", "RUD3", "RUD7", "SMAX", "WITALK", "XM", "Y5"
        }
        
        exclusions = {"SMS", "GB", "MB", "DATA", "HOT", "USD", "VND", "RAG", "API", "ESIM", "4G", "5G", "3G", "LTE"}
        
        candidates = []
        for i in range(len(words)):
            word = words[i]
            word_upper = word.upper()
            if word_upper in exclusions:
                continue
                
            is_alphanumeric = any(c.isdigit() for c in word) and any(c.isalpha() for c in word)
            is_valid_alpha = word.isalpha() and word_upper in VALID_ALPHABETIC_PACKAGES
            
            if is_alphanumeric or is_valid_alpha:
                candidates.append(word)
                candidates.append(word_upper)
                
                # Check lookahead for numeric suffix (e.g. "6WiFi 1")
                if i + 1 < len(words):
                    next_word = words[i+1]
                    if next_word.isdigit():
                        candidates.append(f"{word} {next_word}")
                        candidates.append(f"{word_upper} {next_word}")
                        
                # Check lookahead for short word + numeric suffix (e.g. "6WiFi CBCS 1")
                if i + 2 < len(words):
                    next_word = words[i+1]
                    next_next_word = words[i+2]
                    if len(next_word) <= 6 and next_next_word.isdigit() and next_word.upper() not in exclusions:
                        candidates.append(f"{word} {next_word} {next_next_word}")
                        candidates.append(f"{word_upper} {next_word.upper()} {next_next_word}")
                        
        candidates = list(dict.fromkeys(candidates))
        
        package_name = None
        exact_results = {"ids": [], "documents": [], "metadatas": []}
        
        seen_exact_ids = set()
        for candidate in candidates:
            print(f"🔍 Quét khớp chuỗi chính xác cho từ khóa gói cước: '{candidate}'...")
            try:
                get_results = self.collection.get(
                    where_document={"$contains": candidate}
                )
                if get_results and get_results.get("ids"):
                    ids = get_results["ids"]
                    docs = get_results["documents"]
                    metas = get_results["metadatas"]
                    for idx in range(len(ids)):
                        doc_id = ids[idx]
                        if doc_id not in seen_exact_ids:
                            exact_results["ids"].append(doc_id)
                            exact_results["documents"].append(docs[idx])
                            exact_results["metadatas"].append(metas[idx])
                            seen_exact_ids.add(doc_id)
                            if not package_name or len(candidate) > len(package_name):
                                package_name = candidate.upper()
            except Exception as e:
                print(f"⚠️ Lỗi khi quét khớp chuỗi chính xác cho '{candidate}': {e}")
        
        # 4. Truy vấn ngữ nghĩa từ ChromaDB sử dụng mở rộng câu truy vấn (Query Expansion)
        queries_to_run = [normalized_query]
        
        # Thêm các câu truy vấn từ khóa nếu phát hiện các chủ đề cụ thể để tối ưu hóa với mô hình embedding
        if is_day_package_query:
            queries_to_run.extend([
                "gói cước data theo ngày 1 ngày 3 ngày 7 ngày ngắn ngày",
                "danh sách gói cước data ngày MobiFone",
                "bảng giá gói cước ngày chu kỳ 24h"
            ])
        elif "esim" in query_lower or "e-sim" in query_lower:
            queries_to_run.extend(["eSIM MobiFone", "đổi eSIM My MobiFone", "phí đổi eSIM"])
        elif any(kw in query_lower for kw in ["roaming", "chuyển vùng", "cvqt"]):
            queries_to_run.extend(["chuyển vùng quốc tế MobiFone", "đăng ký roaming", "giá cước roaming"])
        elif "5g" in query_lower:
            queries_to_run.extend(["5G MobiFone", "đăng ký 5G", "gói cước 5G"])
        elif any(kw in query_lower for kw in ["wifi", "tivi", "cáp quang", "mobifiber", "internet"]):
            # [Thay đổi C] Cải thiện WiFi query expansion — ưu tiên bảng giá đầy đủ 9 gói
            queries_to_run.extend([
                # Query 1: Bắt chunk chứa bảng giá đầy đủ (có cả WiFi 1Plus, 6WiFi, 12WiFi)
                "bảng giá gói cước wifi cáp quang MobiFiber WiFi 1Plus WiFi 2Plus WiFi 3Plus 6WiFi 12WiFi",
                # Query 2: Gói 6 tháng — giá gồm VAT 990.000đ tặng 2 tháng
                "6WiFi 1Plus 990000 350 Mbps 6 tháng tặng 2 tháng miễn phí tổng 8 tháng",
                # Query 3: Gói 12 tháng — giá gồm VAT 1.980.000đ tặng 4 tháng
                "12WiFi 1Plus 1980000 350 Mbps 12 tháng tặng 4 tháng miễn phí tổng 16 tháng",
            ])
            
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
        keywords_to_search = []
        
        # 1. Khớp từ khóa eSIM
        if "esim" in query_lower or "e-sim" in query_lower:
            keywords_to_search.extend(["eSIM", "esim", "ESIM", "E-sim", "e-sim"])
        
        # 2. Khớp từ khóa 5G
        if "5g" in query_lower:
            keywords_to_search.extend(["5G", "5g"])
            
        # 3. Khớp từ khóa Chuyển vùng quốc tế / Roaming
        if any(kw in query_lower for kw in ["roaming", "chuyển vùng", "cvqt"]):
            keywords_to_search.extend(["roaming", "Roaming", "ROAMING", "chuyển vùng", "Chuyển vùng", "cvqt", "CVQT"])

        # 4. Khớp từ khóa liên quan đến Tồn kho / Bảng biểu (Excel)
        inventory_mapping = {
            "sim vật lý": ["SIM vật lý", "sim vật lý", "SIM vật lý 4G", "SIM vật lý 5G"],
            "wi-pod": ["Wi-Pod", "wi-pod", "Wi-pod"],
            "mobiwatch": ["MobiWatch", "mobiwatch", "Mobiwatch"],
            "mobitab": ["MobiTab", "mobitab", "Mobitab"],
            "thẻ nạp": ["Thẻ nạp", "thẻ nạp"],
            "tồn kho": ["tồn kho", "Tồn kho"],
            "tồn cuối": ["tồn cuối", "Tồn cuối"],
            "nhập kỳ": ["nhập kỳ", "Nhập kỳ"],
            "xuất kỳ": ["xuất kỳ", "Xuất kỳ"],
            "tồn": ["tồn", "Tồn"],
            "kho": ["kho", "Kho"],
            "nhập": ["nhập", "Nhập", "Nhập kỳ này"],
            "xuất": ["xuất", "Xuất", "Xuất kỳ này"],
            "sản phẩm": ["sản phẩm", "Sản phẩm", "Tên sản phẩm"],
            "tổng cộng": ["tổng cộng", "Tổng cộng", "TỔNG CỘNG"],
            "máy tính bảng": ["máy tính bảng", "MobiTab", "mobitab"],
            "đồng hồ": ["đồng hồ", "MobiWatch", "mobiwatch"],
            "thiết bị": ["thiết bị", "Thiết bị"]
        }
        for key, vals in inventory_mapping.items():
            if key in query_lower:
                keywords_to_search.extend(vals)
                
        # 5. Khớp từ khóa liên quan đến chất lượng dịch vụ (CLDV)
        quality_mapping = {
            "tốc độ download": ["tốc độ download", "Download", "download"],
            "tốc độ upload": ["tốc độ upload", "Upload", "upload"],
            "độ trễ": ["độ trễ", "độ trễ", "trễ"],
            "rớt cuộc gọi": ["rớt cuộc gọi", "rớt cuộc gọi", "tỷ lệ rớt"]
        }
        for key, vals in quality_mapping.items():
            if key in query_lower:
                keywords_to_search.extend(vals)
                
        # Loại bỏ các từ khóa trùng lặp và tích hợp từ khóa động trích xuất trực tiếp từ câu hỏi
        keywords_to_search = list(set(keywords_to_search))
        keywords_to_search.extend(dynamic_keywords)
        keywords_to_search = list(set(keywords_to_search))
        
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
                if package_name:
                    if meta_pkg_name == package_name:
                        score = 0.0  # Ưu tiên cao nhất cho gói cước chính xác
                    elif package_name in meta_pkg_name:
                        score = 0.02 # Ưu tiên thứ hai cho các chu kỳ dài hơn
                        
                # Ưu tiên từ khóa khớp dài hơn và chi tiết hơn trong nội dung tài liệu
                doc_lower = doc.lower()
                longest_match_len = 0
                for cand in candidates:
                    if cand.lower() in doc_lower:
                        longest_match_len = max(longest_match_len, len(cand))
                if longest_match_len > 0:
                    score = score - min(0.04, longest_match_len * 0.005)
                    
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
                        
                        doc_type = str(meta.get("type", "")).upper()
                        category = meta.get("category", "")
                        is_uploaded = doc_id.startswith("upload_") or doc_type in ["DOCX", "PDF", "XLSX", "XLS"]
                        
                        # Áp dụng Boosting danh mục hoặc loại tài liệu bảng tính
                        is_package_query = "goi_cuoc" in target_categories
                        is_doc_id_query = any(k in query_lower for k in ["số hiệu", "công văn", "văn bản", "số:", "quyết định", "thông báo", "hướng dẫn"])
                        has_pdf_context = any(k in query_lower for k in ["hướng dẫn", "công văn", "quy định", "fwa", "cpe", "mobifiber", "hợp đồng", "văn bản", "triển khai"])

                        if is_doc_id_query and (is_uploaded or doc_type in ["PDF", "DOCX"]):
                            dist = dist * 0.05
                            if "[THÔNG TIN ĐỊNH DANH VĂN BẢN CHÍNH THỨC]:" in s_docs[i]:
                                dist = dist * 0.2  # Ưu tiên số 1 cho chunk định danh văn bản
                                print(f"✨ [Document ID Header Boost] Document {doc_id} chứa thông tin định danh văn bản chính thức")
                        elif is_doc_id_query and doc_type == "WEB":
                            dist = dist * 3.0  # Giảm ưu tiên web khi đang hỏi số hiệu công văn
                        elif doc_type in ["XLSX", "XLS", "CSV"]:
                            dist = dist * 0.2
                            print(f"✨ Boosting document {doc_id} vì là tài liệu bảng tính ({doc_type})")
                        elif is_uploaded and has_pdf_context:
                            dist = dist * 0.25
                            print(f"✨ Boosting document {doc_id} vì là tài liệu tải lên phù hợp ngữ cảnh ({doc_type})")
                        elif target_categories and category in target_categories:
                            dist = dist * 0.1  # Giảm khoảng cách mạnh để ưu tiên trang danh mục gói cước
                            print(f"✨ Boosting document {doc_id} vì thuộc danh mục khớp '{category}'")
                        elif doc_type == "WEB" and is_package_query:
                            dist = dist * 0.15
                            print(f"✨ Boosting document {doc_id} vì là trang web gói cước")

                        # [Thay đổi D] Boost mạnh cho chunk chứa bảng giá đầy đủ WiFi
                        # Chunk đầy đủ có cả 6WiFi 1Plus VÀ 12WiFi 1Plus → ưu tiên tuyệt đối
                        # tránh trường hợp chunk overlap (chỉ có 6WiFi 3Plus) bị rank cao hơn
                        if any(kw in query_lower for kw in ["wifi", "cáp quang", "mobifiber", "internet"]):
                            doc_lower_check = s_docs[i].lower()
                            if "6wifi 1plus" in doc_lower_check and "12wifi 1plus" in doc_lower_check:
                                dist = dist * 0.5  # Giảm dist 50% = tăng priority mạnh
                                print(f"✨ [WiFi Full-Table Boost] Document {doc_id} chứa bảng giá WiFi đầy đủ")

                        # [Cơ chế Doanh nghiệp] Time-decay & Recency Weighting: Ưu tiên văn bản mới nhất (2026 > 2025)
                        doc_year = meta.get("doc_year")
                        if doc_year:
                            try:
                                y_val = int(doc_year)
                                if y_val >= 2026:
                                    dist = dist * 0.85  # Thưởng 15% cho tài liệu mới nhất năm 2026
                                    print(f"✨ [Recency Boost] Document {doc_id} được ưu tiên vì ban hành năm {y_val}")
                                elif y_val <= 2024:
                                    dist = dist * 1.15  # Phạt nhẹ cho tài liệu cũ
                            except Exception:
                                pass

                        doc_lower = s_docs[i].lower()
                        
                        # Áp dụng thêm keyword boost cho semantic search
                        matched_kws = [kw for kw in dynamic_keywords if kw in doc_lower]
                        if matched_kws:
                            keyword_boost_factor = max(0.01, 0.3 - (len(matched_kws) * 0.05))
                            dist = dist * keyword_boost_factor
                            print(f"✨ Keyword Boosting document {doc_id} với factor {keyword_boost_factor:.2f} vì chứa các từ khóa: {matched_kws}")
                            
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
                    
                    doc_type = str(meta.get("type", "")).upper()
                    is_learned_qa = doc_id.startswith("wifi_playbook_") or doc_id.startswith("cskh_qa_") or category == "CSKH_Learned_QA"
                    is_uploaded_doc = doc_id.startswith("upload_") or doc_type in ["DOCX", "PDF", "XLSX", "XLS"]
                    if is_learned_qa:
                        dist = 0.05
                        print(f"✨ Boosting CSKH Playbook document {doc_id}")
                    elif doc_type in ["XLSX", "XLS", "CSV"]:
                        dist = 0.2
                        print(f"✨ Boosting document {doc_id} vì là tài liệu bảng tính ({doc_type})")
                    elif is_uploaded_doc and has_pdf_context:
                        dist = 0.25
                        print(f"✨ Boosting document {doc_id} vì là tài liệu tải lên phù hợp ngữ cảnh ({doc_type})")
                    elif target_categories and category in target_categories:
                        dist = dist * 0.1
                        print(f"✨ Boosting document {doc_id} vì thuộc danh mục khớp '{category}'")
                    elif doc_type == "WEB" and is_package_query:
                        dist = dist * 0.15
                        print(f"✨ Boosting document {doc_id} vì là trang web gói cước")
                        
                    doc_lower = l_docs[i].lower()
                    matched_kws = [kw for kw in dynamic_keywords if kw in doc_lower]
                    if matched_kws:
                        keyword_boost_factor = max(0.01, 0.3 - (len(matched_kws) * 0.05))
                        dist = dist * keyword_boost_factor
                        print(f"✨ Keyword Boosting lexical document {doc_id} với factor {keyword_boost_factor:.2f} vì chứa các từ khóa: {matched_kws}")
                        
                    score = 0.1 + dist * 0.5
                    
                    all_candidates.append({
                        "id": doc_id,
                        "document": l_docs[i],
                        "metadata": meta,
                        "score": score
                    })
                    seen_ids.add(doc_id)
                    
        # 6. [Phase 1] BM25 Hybrid: build index lần đầu, sau đó dùng RRF fusion
        if _HYBRID_AVAILABLE and self._bm25_index is not None and not self._bm25_built:
            try:
                all_docs = self.collection.get()
                if all_docs and all_docs.get("documents"):
                    self._bm25_index.build(all_docs["documents"], all_docs["ids"])
                    self._bm25_built = True
                    print(f"[HYBRID] BM25 index built with {len(all_docs['documents'])} docs")
            except Exception as e:
                print(f"[HYBRID] BM25 build failed: {e}")

        if _HYBRID_AVAILABLE and self._bm25_built and self._bm25_index is not None:
            try:
                # Lấy top-20 từ BM25 để fusion
                bm25_results = self._bm25_index.top_k(normalized_query, k=20)
                # Chuyển all_candidates sang format (id, score, text) cho vector side
                vector_results = [(c["id"], c["score"], c["document"]) for c in all_candidates]
                # RRF fusion
                fused = reciprocal_rank_fusion(vector_results, bm25_results, k_rrf=60, alpha=0.6)
                # Merge metadata lại
                id_to_meta = {c["id"]: c["metadata"] for c in all_candidates}
                fused_candidates = []
                for doc_id, fused_score, doc_text in fused:
                    meta = id_to_meta.get(doc_id, {})
                    fused_candidates.append({"id": doc_id, "document": doc_text, "metadata": meta, "score": 1.0 - fused_score})
                all_candidates = fused_candidates
                print(f"[HYBRID] RRF fusion: {len(bm25_results)} BM25 + {len(vector_results)} vector -> {len(fused_candidates)} merged")
            except Exception as e:
                print(f"[HYBRID] RRF fusion failed: {e} -- using original order")
                all_candidates.sort(key=lambda x: x["score"])
        else:
            # Fallback: sắp xếp theo điểm gốc
            all_candidates.sort(key=lambda x: x["score"])

        print("DEBUG: Top 10 sorted candidates after fusion:")
        for idx, item in enumerate(all_candidates[:10]):
            doc_preview = item['document'][:50].strip().replace('\n', ' ')
            print(f"  {idx+1}. ID: {item['id']}, Score: {item['score']:.4f}, Category: {item['metadata'].get('category')}, Doc: {doc_preview}")

        # 7. Loại bỏ trùng lặp nội dung (Deduplication)
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

        # 8. [Phase 1] Cross-Encoder Reranking (sau khi đã có top n_results candidates)
        if _RERANKER_AVAILABLE and len(unique_docs) > 1:
            try:
                rerank_inputs = [
                    {"id": f"doc_{i}", "document": d, "metadata": m, "score": 0.5}
                    for i, (d, m) in enumerate(zip(unique_docs, unique_metadatas))
                ]
                reranked = crossencoder_rerank(query, rerank_inputs, top_k=min(n_results, len(rerank_inputs)))
                unique_docs = [r["document"] for r in reranked]
                unique_metadatas = [r["metadata"] for r in reranked]
                print(f"[RERANKER] Applied cross-encoder reranking on {len(rerank_inputs)} candidates")
            except Exception as e:
                print(f"[RERANKER] Reranking failed: {e} -- using fusion order")

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

    def _classify_sentiment_and_intent(self, question: str, chat_history: list = None) -> dict:
        """
        [Phase 2 - Task 2.1] Pre-RAG Classifier nâng cấp:
        - Nhận diện tâm lý KH & giai đoạn hội thoại CSKH
        - Phát hiện escalation (cần chuyển người thật)
        - Nhận diện lead capture opportunity
        - Detect đối thủ được nhắc đến để kích hoạt battlecard
        - Sử dụng lịch sử hội thoại để classify chính xác hơn
        """
        try:
            # Tóm tắt ngắn lịch sử hội thoại gần nhất (tối đa 3 lượt)
            history_context = ""
            if chat_history:
                recent = chat_history[-6:] if len(chat_history) >= 6 else chat_history
                for msg in recent:
                    role = "KH" if msg.get("role") == "user" else "Mia"
                    content = msg.get("message", "").strip()[:120]
                    if content:
                        history_context += f"{role}: {content}\n"

            history_section = ""
            if history_context:
                history_section = f"""
Lịch sử hội thoại gần nhất (để hiểu ngữ cảnh):
{history_context.strip()}
"""

            prompt = f"""Bạn là Trợ lý AI Phân loại Ý định & Tâm lý Khách hàng CSKH MobiFone.
Phân tích tin nhắn khách hàng và trả về DUY NHẤT chuỗi JSON (không markdown).
{history_section}
Tin nhắn khách hàng: "{question}"

Yêu cầu phân loại:
1. "sentiment": "ANGRY" | "HESITANT" | "READY_TO_BUY" | "INFO_SEEKING"
2. "sales_stage":
   - "xu_ly_tu_choi_gia"   (chê đắt, so sánh giá)
   - "kham_pha_nhu_cau"    (hỏi chung, tư vấn gói)
   - "chot_don_closing"    (hỏi cách mua, đăng ký)
   - "khach_phan_nan"      (phàn nàn mạng yếu, lỗi, trừ tiền sai)
   - "upsell_cross_sell"   (muốn gói nhiều data hơn, gói gia đình)
   - "so_sanh_doi_thu"     (nhắc Viettel, VNPT, FPT, VinaPhone)
   - "xu_ly_do_du"         (do dự, cần nghĩ thêm, chưa quyết định)
   - "retention_winback"   (muốn hủy, cắt mạng, chuyển mạng đi)
3. "tactic": Hướng dẫn ngắn 1 câu cho Mia ứng xử tình huống này.
4. "escalation_required": true | false
   → true nếu: KH nổi giận mạnh, yêu cầu gặp quản lý/trưởng phòng, đe dọa kiện,
     phàn nàn về vấn đề kỹ thuật nghiêm trọng (mất mạng >24h, trừ tiền sai liên tục),
     hoặc yêu cầu hoàn tiền khẩn cấp.
5. "lead_capture": true | false
   → true nếu: KH hỏi về lắp đặt, đăng ký dịch vụ mới, muốn chốt gói cụ thể,
     hoặc đang ở giai đoạn "chot_don_closing".
6. "competitor_mentioned": "" | "viettel" | "vnpt" | "fpt" | "vinaphone"
   → Tên đối thủ nếu KH nhắc đến, chuỗi rỗng nếu không.

Cấu trúc JSON duy nhất:
{{
  "sentiment": "HESITANT",
  "sales_stage": "xu_ly_tu_choi_gia",
  "tactic": "Đồng cảm -> Chia nhỏ chi phí theo ngày -> Nhấn mạnh ưu đãi tặng thêm",
  "escalation_required": false,
  "lead_capture": false,
  "competitor_mentioned": ""
}}
"""
            resp = self._call_gemini_with_retry(prompt, temperature=0.1, max_tokens=200)
            cleaned = resp.strip()
            if cleaned.startswith("```"):
                lines = cleaned.splitlines()
                if lines[0].startswith("```"): lines = lines[1:]
                if lines and lines[-1].startswith("```"): lines = lines[:-1]
                cleaned = "\n".join(lines).strip()
            result = json.loads(cleaned)

            # Đảm bảo có đủ các field (backward compatible)
            result.setdefault("escalation_required", False)
            result.setdefault("lead_capture", False)
            result.setdefault("competitor_mentioned", "")

            # Log escalation để tracking
            if result.get("escalation_required"):
                print(f"[ESCALATION] Detected for question: {question[:80]}")
            if result.get("lead_capture"):
                print(f"[LEAD-CAPTURE] Opportunity detected: stage={result.get('sales_stage')}")

            return result

        except Exception as e:
            print(f"[PRE-RAG] Cảnh báo Classifier: {e}")
            return {
                "sentiment": "INFO_SEEKING",
                "sales_stage": "kham_pha_nhu_cau",
                "tactic": "Xác nhận nhu cầu và tư vấn thông tin chính xác",
                "escalation_required": False,
                "lead_capture": False,
                "competitor_mentioned": "",
            }


    def _retrieve_playbook_examples(self, question: str, sales_stage: str = None, n_results: int = 2) -> list:
        """
        Lấy các câu ứng xử mẫu và kỹ thuật tư vấn thực chiến từ collection mobifone_sales_playbook
        """
        try:
            where_clause = None
            if sales_stage and sales_stage != "kham_pha_nhu_cau":
                where_clause = {"sales_stage": sales_stage}
            
            results = self.playbook_collection.query(
                query_texts=[question],
                n_results=n_results,
                where=where_clause
            )

            # Fallback nếu lọc theo stage không có tài liệu nào
            if (not results or not results.get("documents") or len(results["documents"][0]) == 0) and where_clause:
                results = self.playbook_collection.query(
                    query_texts=[question],
                    n_results=n_results
                )
            
            playbook_list = []
            if results and results.get("documents") and len(results["documents"]) > 0:
                docs = results["documents"][0]
                metas = results["metadatas"][0] if results.get("metadatas") else []
                for doc, meta in zip(docs, metas):
                    playbook_list.append({
                        "text": doc,
                        "tactic": meta.get("sales_tactic", "Kỹ thuật tư vấn CSKH"),
                        "stage": meta.get("sales_stage", sales_stage)
                    })
            return playbook_list
        except Exception as e:
            print(f"[PLAYBOOK-RAG] Cảnh báo Playbook Retrieval: {e}")
            return []
    def answer_question(self, question, history=None, user_info=None):
        """Alias tương thích ngược cho api_server.py gọi answer_question."""
        return self.generate_response(question, chat_history=history, user_info=user_info)

    def _enrich_query_with_history(self, question: str, chat_history: list) -> str:
        """
        Conversational Context Injection (Thay đổi A):
        Nếu câu hỏi hiện tại ngắn/mơ hồ (không chứa từ khóa chủ đề rõ ràng),
        tự động bổ sung từ khóa ngữ cảnh từ 2 lượt hội thoại cuối để cải thiện
        chất lượng ChromaDB retrieval.

        Không refactor signature của retrieve() — zero breaking change.
        """
        if not chat_history or len(question.strip()) > 40:
            return question  # Câu hỏi dài/rõ ràng → không cần enrich

        # Các từ khóa rõ ràng trong câu hỏi hiện tại → không cần enrich
        EXPLICIT_TOPIC_MARKERS = [
            "wifi", "cáp quang", "mobifiber", "internet",
            "gói ngày", "data ngày", "d5", "d7", "d10",
            "esim", "e-sim", "roaming", "chuyển vùng", "5g",
            "gói cước", "đăng ký"
        ]
        q_lower = question.lower()
        if any(marker in q_lower for marker in EXPLICIT_TOPIC_MARKERS):
            return question  # Câu hỏi đã có chủ đề rõ → không cần enrich

        # Định nghĩa các topic và từ khóa nhận diện từ lịch sử
        TOPIC_KEYWORDS = {
            "wifi": ("wifi cáp quang mobifiber internet",
                     ["wifi", "cáp quang", "mobifiber", "internet", "6wifi", "12wifi", "fiber", "lắp mạng", "băng thông"]),
            "goi_ngay": ("gói ngày data ngày",
                          ["gói ngày", "data ngày", "d5", "d7", "d10", "me5", "theo ngày", "1 ngày"]),
            "esim": ("esim e-sim",
                     ["esim", "e-sim"]),
            "roaming": ("chuyển vùng quốc tế roaming",
                         ["roaming", "chuyển vùng", "cvqt", "nước ngoài"]),
            "5g": ("5G MobiFone",
                   ["5g", "mạng 5g"]),
        }

        # Lấy 4 messages cuối (tương đương 2 lượt hội thoại)
        recent = chat_history[-4:] if len(chat_history) >= 4 else chat_history
        recent_text = " ".join(m.get("message", "") for m in recent).lower()

        for topic, (append_str, keywords) in TOPIC_KEYWORDS.items():
            if any(kw in recent_text for kw in keywords):
                enriched = f"{question} {append_str}"
                print(f"🔗 [Context Injection] Enrich query: '{question}' → '{enriched}' (topic: {topic})")
                return enriched

        return question

    def _normalize_wifi_promo_context(self, fact_contexts: list, fact_metadatas: list) -> list:
        """
        Đọc pay_months/bonus_months/price_per_month từ ChromaDB metadata (được inject
        lúc ingest bởi ingest_wifi_playbook.py) và prepend note chuẩn hóa vào mỗi doc.

        Không dùng dict hardcode — khi giá thay đổi chỉ cần sửa wifi_packages.json
        và re-ingest, không cần động vào code này.

        Dùng `is not None` thay vì truthy-check để tránh bỏ qua giá trị 0 hợp lệ.
        """
        normalized = []
        for doc, meta in zip(fact_contexts, fact_metadatas):
            pay_m   = meta.get("pay_months")
            bonus_m = meta.get("bonus_months")
            ppm     = meta.get("price_per_month")
            dname   = meta.get("package_name")  # field duy nhất ghi bởi ingest script

            if pay_m is not None and bonus_m is not None and ppm is not None and dname:
                total_m = int(pay_m) + int(bonus_m)
                ppm_fmt = f"{int(ppm):,}".replace(",", ".")
                note = (
                    f"[GHI CHÚ HỆ THỐNG — {dname}]: "
                    f"Đóng trước {pay_m} tháng, MobiFone tặng thêm {bonus_m} tháng miễn phí, "
                    f"tổng sử dụng {total_m} tháng. "
                    f"Giá quy đổi thực tế: {ppm_fmt}đ/tháng."
                )
                normalized.append(note + "\n\n" + doc)
            else:
                normalized.append(doc)  # doc không phải WiFi promo → giữ nguyên

        return normalized


    def generate_response(self, question, chat_history=None, user_info=None):
        import re
        """Truy xuất thông tin liên quan và gửi LLM sinh câu trả lời"""
        # 1. [Phase 1 — Task 1.1] Query Reformulation: viết lại câu hỏi follow-up mơ hồ
        # Thay thế _enrich_query_with_history (keyword matching) bằng LLM-based reformulation
        was_reformulated = False
        if _REFORMULATOR_AVAILABLE:
            reformulated, was_reformulated = reformulate_query(
                question=question,
                chat_history=chat_history,
                gemini_client=gemini_client,
                gemini_model=GEMINI_MODEL,
            )
            enriched_question = reformulated
            if was_reformulated:
                print(f"[PIPELINE] Query reformulated: {repr(question)} -> {repr(reformulated)}")
        else:
            # Fallback về enrich cũ nếu module chưa có
            enriched_question = self._enrich_query_with_history(question, chat_history)

        self._last_was_reformulated = was_reformulated

        # [P3] n_results=10 để cải thiện Context Recall trước khi rerank về top-5
        retrieved = self.retrieve(enriched_question, n_results=10)
        contexts = retrieved.get('documents', [[]])[0]
        sources = retrieved.get('metadatas', [[]])[0]

        fact_contexts = []
        fact_metadatas = []  # metadata tương ứng với từng fact doc (để normalize giá WiFi)
        playbook_contexts = []

        for doc, meta in zip(contexts, sources):
            meta_type = str(meta.get("type") or meta.get("ingest_type") or "").lower()
            meta_source = str(meta.get("source") or meta.get("source_url") or "").lower()
            meta_category = str(meta.get("category") or "").lower()

            # BẢO VỆ TUYỆT ĐỐI NGUYÊN TẮC GROUNDING:
            # Tất cả chat mẫu/kịch bản bán hàng chỉ được đưa vào playbook_contexts để học phong thái.
            # TUYỆT ĐỐI KHÔNG BAO GIỜ đưa chat mẫu vào fact_contexts làm dữ liệu sự thật!
            is_playbook = (
                meta_type in ["conversation", "qa_pair", "sales_playbook", "playbook"] or
                "chat_mining" in meta_source or
                "playbook" in meta_source or
                "playbook" in meta_category or
                "cskh_learned" in meta_category or
                "cskh_qa" in meta_category
            )

            if is_playbook:
                playbook_contexts.append(doc)
            else:
                fact_contexts.append(doc)
                fact_metadatas.append(meta)
        
        # 1.5. Chặn ảo tưởng (Hallucination Block) & Programmatic context injection
        import re
        injected_facts = []
        question_lower = question.lower()
        
        # ============================================================
        # PROGRAMMATIC OOD CHECKER - Hallucination Block v2.0
        # Tiêm ngữ cảnh chính xác cho:
        #   (A) Gói cước của nhà mạng đối thủ (Viettel, VinaPhone...)
        #   (B) Gói cước không tồn tại/ngừng hoạt động trong hệ thống MobiFone
        # LƯU Ý: F70, MXH100, MXH150, TK90, TK135, F90N, DATA50, MSHD, MSHD+,
        #         FAMILY, DN01 đều CÓ trong DB — KHÔNG được đưa vào dict này.
        # ============================================================
        ood_knowledge = {
            # --- GÓI CƯỚC VIETTEL (đối thủ) ---
            "v90": (
                "[THÔNG TIN XÁC THỰC] Gói cước V90 là gói cước của nhà mạng VIETTEL (đối thủ cạnh tranh), "
                "KHÔNG phải gói cước của MobiFone. MobiFone KHÔNG cung cấp gói cước V90. "
                "Gói tương đương tại MobiFone là TK90 (90.000đ/30 ngày, 2GB/ngày) hoặc F90N (90.000đ/30 ngày, 10GB). "
                "Hãy từ chối khéo léo, nêu rõ V90 thuộc Viettel, và giới thiệu gói MobiFone tương đương."
            ),
            "v120": (
                "[THÔNG TIN XÁC THỰC] Gói cước V120 là gói cước của nhà mạng VIETTEL (đối thủ cạnh tranh), "
                "KHÔNG phải gói cước của MobiFone. MobiFone KHÔNG cung cấp gói cước V120. "
                "Hãy từ chối khéo léo, nêu rõ V120 thuộc Viettel, và đề nghị khách hàng để lại SĐT để "
                "chuyên viên tư vấn gói cước MobiFone có mức giá 120k tương đương."
            ),
            "st90": (
                "[THÔNG TIN XÁC THỰC] Gói cước ST90 là gói cước của nhà mạng VIETTEL (đối thủ cạnh tranh), "
                "KHÔNG phải gói cước của MobiFone. MobiFone KHÔNG cung cấp gói cước ST90. "
                "Gói tương đương tại MobiFone là TK90 (90.000đ/30 ngày, 2GB/ngày). "
                "Hãy từ chối khéo léo, nêu rõ ST90 thuộc Viettel, và giới thiệu TK90 của MobiFone."
            ),
            "sd120": (
                "[THÔNG TIN XÁC THỰC] Gói cước SD120 là gói cước của nhà mạng VIETTEL (đối thủ cạnh tranh), "
                "KHÔNG phải gói cước của MobiFone. MobiFone KHÔNG cung cấp gói cước SD120. "
                "Hãy từ chối khéo léo, nêu rõ SD120 thuộc Viettel, và đề nghị để lại SĐT để tư vấn gói tương đương."
            ),
            "v70c": (
                "[THÔNG TIN XÁC THỰC] Gói cước V70C là gói cước của nhà mạng VIETTEL (đối thủ cạnh tranh), "
                "KHÔNG phải gói cước của MobiFone. MobiFone KHÔNG cung cấp gói cước V70C. "
                "Gói tương đương tại MobiFone là F70 (70.000đ/30 ngày, 7GB tốc độ cao). "
                "Hãy từ chối khéo léo, nêu rõ V70C thuộc Viettel, và giới thiệu F70 của MobiFone."
            ),
            "mimax": (
                "[THÔNG TIN XÁC THỰC] Gói cước Mimax là dòng gói cước của nhà mạng VIETTEL (đối thủ cạnh tranh), "
                "KHÔNG phải gói cước của MobiFone. MobiFone KHÔNG cung cấp gói cước Mimax. "
                "Hãy từ chối khéo léo, nêu rõ Mimax thuộc Viettel, và giới thiệu các gói TK hoặc F tương đương của MobiFone."
            ),
            # Alias cho các biến thể Mimax (mimax70, mimax90, mimax125, mimax200, mimaxsv)
            # Cần tách riêng vì regex word-boundary không match "mimax" trong "mimax70"
            "mimax70": (
                "[THÔNG TIN XÁC THỰC] Gói cước Mimax70 là gói cước của nhà mạng VIETTEL (đối thủ cạnh tranh), "
                "KHÔNG phải gói cước của MobiFone. MobiFone KHÔNG cung cấp gói cước Mimax70. "
                "Gói tương đương tại MobiFone là F70 (70.000đ/30 ngày, 7GB tốc độ cao). "
                "Hãy từ chối khéo léo, nêu rõ Mimax70 thuộc Viettel, và giới thiệu F70 của MobiFone."
            ),
            "mimax90": (
                "[THÔNG TIN XÁC THỰC] Gói cước Mimax90 là gói cước của nhà mạng VIETTEL (đối thủ cạnh tranh), "
                "KHÔNG phải gói cước của MobiFone. MobiFone KHÔNG cung cấp gói cước Mimax90. "
                "Gói tương đương tại MobiFone là TK90 (90.000đ/30 ngày, 2GB/ngày). "
                "Hãy từ chối khéo léo, nêu rõ Mimax90 thuộc Viettel, và giới thiệu TK90 của MobiFone."
            ),
            "mimax125": (
                "[THÔNG TIN XÁC THỰC] Gói cước Mimax125 là gói cước của nhà mạng VIETTEL (đối thủ cạnh tranh), "
                "KHÔNG phải gói cước của MobiFone. MobiFone KHÔNG cung cấp gói cước Mimax125. "
                "Gói tương đương tại MobiFone là TK135 (135.000đ/30 ngày, 4GB/ngày). "
                "Hãy từ chối khéo léo, nêu rõ Mimax125 thuộc Viettel, và giới thiệu TK135 của MobiFone."
            ),
            "mimax200": (
                "[THÔNG TIN XÁC THỰC] Gói cước Mimax200 là gói cước của nhà mạng VIETTEL (đối thủ cạnh tranh), "
                "KHÔNG phải gói cước của MobiFone. MobiFone KHÔNG cung cấp gói cước Mimax200. "
                "Hãy từ chối khéo léo, nêu rõ Mimax200 thuộc Viettel, và đề nghị để lại SĐT để tư vấn gói phù hợp."
            ),
            "mimaxsv": (
                "[THÔNG TIN XÁC THỰC] Gói cước MimaxSV là gói cước sinh viên của nhà mạng VIETTEL (đối thủ cạnh tranh), "
                "KHÔNG phải gói cước của MobiFone. MobiFone KHÔNG cung cấp gói cước MimaxSV. "
                "Gói tương đương cho sinh viên tại MobiFone là F70 (70.000đ/30 ngày, phổ biến sinh viên). "
                "Hãy từ chối khéo léo, nêu rõ MimaxSV thuộc Viettel, và giới thiệu F70 của MobiFone."
            ),
            "tre": (
                "[THÔNG TIN XÁC THỰC] Gói cước TRE là dòng gói cước của nhà mạng VIETTEL (đối thủ cạnh tranh), "
                "KHÔNG phải gói cước của MobiFone. MobiFone KHÔNG cung cấp gói cước TRE. "
                "Hãy từ chối khéo léo, nêu rõ TRE thuộc Viettel, và đề nghị để lại SĐT để tư vấn gói MobiFone phù hợp."
            ),
            "st150k": (
                "[THÔNG TIN XÁC THỰC] Gói cước ST150K là gói cước của nhà mạng VIETTEL (đối thủ cạnh tranh), "
                "KHÔNG phải gói cước của MobiFone. MobiFone KHÔNG cung cấp gói cước ST150K. "
                "Gói tương đương tại MobiFone là TK135 (135.000đ/30 ngày, 4GB/ngày). "
                "Hãy từ chối khéo léo, nêu rõ ST150K thuộc Viettel, và giới thiệu TK135 của MobiFone."
            ),
            "sd70": (
                "[THÔNG TIN XÁC THỰC] Gói cước SD70 là gói cước của nhà mạng VIETTEL (đối thủ cạnh tranh), "
                "KHÔNG phải gói cước của MobiFone. MobiFone KHÔNG cung cấp gói cước SD70. "
                "Gói tương đương tại MobiFone là F70 (70.000đ/30 ngày, 7GB tốc độ cao). "
                "Hãy từ chối khéo léo, nêu rõ SD70 thuộc Viettel, và giới thiệu F70 của MobiFone."
            ),
            "12st90": (
                "[THÔNG TIN XÁC THỰC] Gói cước 12ST90 là gói cước của nhà mạng VIETTEL (đối thủ cạnh tranh), "
                "KHÔNG phải gói cước của MobiFone. MobiFone KHÔNG cung cấp gói cước 12ST90. "
                "Hãy từ chối khéo léo, nêu rõ 12ST90 thuộc Viettel, và đề nghị để lại SĐT để tư vấn gói dài kỳ tương đương."
            ),
            # --- GÓI CƯỚC VINAPHONE (đối thủ) ---
            "u1500": (
                "[THÔNG TIN XÁC THỰC] Gói cước U1500 là gói cước của nhà mạng VINAPHONE (đối thủ cạnh tranh), "
                "KHÔNG phải gói cước của MobiFone. MobiFone KHÔNG cung cấp gói cước U1500. "
                "Hãy từ chối khéo léo, nêu rõ U1500 thuộc VinaPhone, và đề nghị để lại SĐT để tư vấn gói MobiFone phù hợp."
            ),
            "vd149": (
                "[THÔNG TIN XÁC THỰC] Gói cước VD149 là gói cước của nhà mạng VINAPHONE (đối thủ cạnh tranh), "
                "KHÔNG phải gói cước của MobiFone. MobiFone KHÔNG cung cấp gói cước VD149. "
                "Hãy từ chối khéo léo, nêu rõ VD149 thuộc VinaPhone, và đề nghị để lại SĐT để tư vấn gói MobiFone phù hợp."
            ),
            "big90": (
                "[THÔNG TIN XÁC THỰC] Gói cước BIG90 là gói cước của nhà mạng VINAPHONE (đối thủ cạnh tranh), "
                "KHÔNG phải gói cước của MobiFone. MobiFone KHÔNG cung cấp gói cước BIG90. "
                "Gói tương đương tại MobiFone là TK90 (90.000đ/30 ngày, 2GB/ngày). "
                "Hãy từ chối khéo léo, nêu rõ BIG90 thuộc VinaPhone, và giới thiệu TK90 của MobiFone."
            ),
            "vd89": (
                "[THÔNG TIN XÁC THỰC] Gói cước VD89 là gói cước của nhà mạng VINAPHONE (đối thủ cạnh tranh), "
                "KHÔNG phải gói cước của MobiFone. MobiFone KHÔNG cung cấp gói cước VD89. "
                "Hãy từ chối khéo léo, nêu rõ VD89 thuộc VinaPhone, và đề nghị để lại SĐT để tư vấn gói MobiFone phù hợp."
            ),
            # --- GÓI CƯỚC NGỪNG KINH DOANH TRÊN MOBIFONE ---
            "mobicard": (
                "[THÔNG TIN XÁC THỰC] Bộ hòa mạng/Gói cước MobiCard đã NGỪNG cung cấp đăng ký mới trên hệ thống MobiFone. "
                "MobiFone hiện không còn kinh doanh gói MobiCard cho thuê bao mới. "
                "Hãy thông báo rõ ràng và đề nghị để lại SĐT để tư vấn gói hòa mạng hiện hành phù hợp nhất."
            ),
            "mobigold": (
                "[THÔNG TIN XÁC THỰC] Bộ hòa mạng/Gói cước MobiGold đã NGỪNG cung cấp đăng ký mới trên hệ thống MobiFone. "
                "MobiFone hiện không còn kinh doanh gói MobiGold cho thuê bao mới. "
                "Hãy thông báo rõ ràng và đề nghị để lại SĐT để tư vấn gói hòa mạng hiện hành phù hợp nhất."
            ),
            "mobiq": (
                "[THÔNG TIN XÁC THỰC] Bộ hòa mạng/Gói cước MobiQ đã NGỪNG cung cấp đăng ký mới trên hệ thống MobiFone. "
                "MobiFone hiện không còn kinh doanh gói MobiQ cho thuê bao mới. "
                "Hãy thông báo rõ ràng và đề nghị để lại SĐT để tư vấn gói hòa mạng hiện hành phù hợp nhất."
            ),
            # --- GÓI CƯỚC KHÔNG TỒN TẠI TRONG DB MOBIFONE ---
            "f120": (
                "[THÔNG TIN XÁC THỰC] Gói cước F120 KHÔNG tồn tại hoặc đã ngừng cung cấp trên hệ thống MobiFone hiện tại. "
                "Đây là thông tin xác thực từ cơ sở dữ liệu nội bộ MobiFone. "
                "Hãy thông báo rõ ràng rằng Mia không tìm thấy gói F120 trong hệ thống và đề nghị để lại SĐT để tư vấn gói phù hợp."
            ),
            "f200": (
                "[THÔNG TIN XÁC THỰC] Gói cước F200 KHÔNG tồn tại hoặc đã ngừng cung cấp trên hệ thống MobiFone hiện tại. "
                "Đây là thông tin xác thực từ cơ sở dữ liệu nội bộ MobiFone. "
                "Hãy thông báo rõ ràng rằng Mia không tìm thấy gói F200 trong hệ thống và đề nghị để lại SĐT để tư vấn gói phù hợp."
            ),
            "mc99": (
                "[THÔNG TIN XÁC THỰC] Gói cước MC99 KHÔNG tồn tại hoặc không khả dụng trong cơ sở dữ liệu MobiFone hiện tại. "
                "Đây là thông tin xác thực — Mia đã tra cứu và không tìm thấy gói MC99. "
                "Hãy thông báo THẲNG THẮN và RÕ RÀNG rằng gói MC99 không có trong hệ thống (không phải 'chưa cập nhật'), "
                "sau đó đề nghị để lại SĐT để tư vấn gói cước khác có mức giá tương đương 99k."
            ),
            "kc999": (
                "[THÔNG TIN XÁC THỰC] Gói cước KC999 KHÔNG tồn tại hoặc không khả dụng trong cơ sở dữ liệu MobiFone hiện tại. "
                "Đây là thông tin xác thực — Mia đã tra cứu và không tìm thấy gói KC999. "
                "Hãy thông báo THẲNG THẮN và RÕ RÀNG rằng gói KC999 không có trong hệ thống, "
                "sau đó đề nghị để lại SĐT để tư vấn gói cước MobiFone phù hợp."
            ),
            "v30": (
                "[THÔNG TIN XÁC THỰC] Gói cước V30 KHÔNG tồn tại hoặc không khả dụng trong cơ sở dữ liệu MobiFone hiện tại. "
                "Hãy thông báo rõ ràng rằng Mia không tìm thấy gói V30 và đề nghị để lại SĐT để tư vấn gói phù hợp."
            ),
            "dmax": (
                "[THÔNG TIN XÁC THỰC] Gói cước Dmax KHÔNG tồn tại hoặc không khả dụng trong cơ sở dữ liệu MobiFone hiện tại. "
                "Hãy thông báo rõ ràng rằng Mia không tìm thấy gói Dmax và đề nghị để lại SĐT để tư vấn gói phù hợp."
            ),
        }
        
        # Áp dụng programmatic check: quét câu hỏi theo từ khóa gói cước
        # Dùng word-boundary để tránh khớp nhầm (ví dụ 'sd70' không khớp 'mshd70')
        for key, fact in ood_knowledge.items():
            pattern = r'(?<![a-z0-9])' + re.escape(key) + r'(?![a-z0-9])'
            if re.search(pattern, question_lower):
                injected_facts.append(fact)
                print(f"🛡️ [OOD Blocker] Tiêm fact cho gói/từ khóa: '{key}'")

        # Kiểm tra đề cập tên nhà mạng đối thủ tổng quát (không phải gói cụ thể)
        viettel_specific_keys = ["v90", "v120", "st90", "sd120", "v70c", "mimax", "tre", "st150k", "sd70", "12st90"]
        vinaphone_specific_keys = ["u1500", "vd149", "big90", "vd89"]
        
        if "viettel" in question_lower and not any(k in question_lower for k in viettel_specific_keys):
            injected_facts.append(
                "[THÔNG TIN XÁC THỰC] MobiFone KHÔNG hỗ trợ, không cung cấp và không tư vấn về "
                "các gói cước, dịch vụ của nhà mạng Viettel (đây là đối thủ cạnh tranh). "
                "Hãy lịch sự từ chối và giới thiệu các gói cước tương đương của MobiFone."
            )
        if "vinaphone" in question_lower and not any(k in question_lower for k in vinaphone_specific_keys):
            injected_facts.append(
                "[THÔNG TIN XÁC THỰC] MobiFone KHÔNG hỗ trợ, không cung cấp và không tư vấn về "
                "các gói cước, dịch vụ của nhà mạng VinaPhone (đây là đối thủ cạnh tranh). "
                "Hãy lịch sự từ chối và giới thiệu các gói cước tương đương của MobiFone."
            )
        if any(carrier in question_lower for carrier in ["gmobile", "reddi", "indochina telecom", "vietnamobile"]):
            injected_facts.append(
                "[THÔNG TIN XÁC THỰC] MobiFone KHÔNG hỗ trợ, không cung cấp và không tư vấn về "
                "các gói cước, dịch vụ của nhà mạng viễn thông khác (đây là đối thủ cạnh tranh). "
                "Hãy lịch sự từ chối và giới thiệu các gói cước tương đương của MobiFone."
            )
            
        if injected_facts:
            fact_contexts = injected_facts + fact_contexts

        # ============================================================
        # [ANTI-HALLUCINATION SHIELD] WiFi Package Price Table Injection
        # Khi câu hỏi liên quan đến gói WiFi/MobiFiber/cáp quang:
        # BẮT BUỘC inject TOÀN BỘ bảng giá chính xác từ wifi_packages.json
        # vào fact_context — bất kể RAG retrieval có lấy đúng chunk hay không.
        # Đây là tường lửa chống LLM hallucination giá cước WiFi.
        # ============================================================
        wifi_keywords = [
            "wifi", "wi-fi", "mobifiber", "cáp quang", "cap quang", "internet",
            "băng thông", "bang thong", "gói mạng", "goi mang",
            "6wifi", "12wifi", "1plus", "2plus", "3plus", "vieon",
            "lắp mạng", "lap mang", "đăng ký mạng", "dang ky mang",
            "tốc độ", "toc do", "mbps", "modem"
        ]
        is_wifi_query = any(kw in question.lower() for kw in wifi_keywords)
        if not is_wifi_query and chat_history:
            # Kiểm tra lịch sử hội thoại: nếu 3 tin nhắn gần nhất liên quan WiFi
            recent_msgs = " ".join([
                str(m.get("content", "")) for m in chat_history[-6:]
            ]).lower()
            is_wifi_query = any(kw in recent_msgs for kw in wifi_keywords)

        if is_wifi_query:
            wifi_pkg_path = os.path.join(BASE_DIR, "data", "wifi_packages.json")
            if os.path.exists(wifi_pkg_path):
                try:
                    with open(wifi_pkg_path, "r", encoding="utf-8") as f:
                        pkg_data = json.load(f)
                    packages = pkg_data.get("packages", [])

                    # Nhóm theo chu kỳ
                    groups = {"1": [], "6": [], "12": []}
                    for p in packages:
                        key = str(p.get("pay_months", 1))
                        if key in groups:
                            groups[key].append(p)

                    def fmt_currency(n):
                        return f"{int(n):,}".replace(",", ".") + "đ"

                    lines = [
                        "[BẢNG GIÁ CHÍNH THỨC MOBIFIBER — ĐÃ BAO GỒM VAT — NGUỒN SỰ THẬT DUY NHẤT]",
                        "TUYỆT ĐỐI CHỈ DÙNG GIÁ TỪ BẢNG NÀY. KHÔNG DÙNG GIÁ TỰ NHỚ HOẶC SUY LUẬN.\n"
                    ]

                    if groups["1"]:
                        lines.append("Nhóm 1: Đóng từng tháng (Đơn kỳ linh hoạt):")
                        for p in groups["1"]:
                            lines.append(
                                f"  - {p['display_name']} | Tốc độ: {p['speed_mbps']} Mbps | "
                                f"Giá: {fmt_currency(p['base_price'])}/tháng"
                            )

                    if groups["6"]:
                        lines.append("\nNhóm 2: Đóng trước 6 tháng — TẶNG THÊM 2 THÁNG MIỄN PHÍ = TỔNG 8 THÁNG SỬ DỤNG:")
                        for p in groups["6"]:
                            lines.append(
                                f"  - {p['display_name']} | Tốc độ: {p['speed_mbps']} Mbps | "
                                f"Tổng thanh toán: {fmt_currency(p['base_price'])} (đóng 6 tháng + tặng 2 tháng miễn phí) | "
                                f"Quy đổi: {fmt_currency(p['price_per_month'])}/tháng"
                            )

                    if groups["12"]:
                        lines.append("\nNhóm 3: Đóng trước 12 tháng — TẶNG THÊM 4 THÁNG MIỄN PHÍ = TỔNG 16 THÁNG SỬ DỤNG:")
                        for p in groups["12"]:
                            lines.append(
                                f"  - {p['display_name']} | Tốc độ: {p['speed_mbps']} Mbps | "
                                f"Tổng thanh toán: {fmt_currency(p['base_price'])} (đóng 12 tháng + tặng 4 tháng miễn phí) | "
                                f"Quy đổi: {fmt_currency(p['price_per_month'])}/tháng"
                            )

                    lines.append("\nĐặc quyền đi kèm TẤT CẢ các gói: Miễn phí Modem WiFi 6 | Miễn phí lắp đặt | Khảo sát đo sóng tận nhà miễn phí")
                    wifi_table_text = "\n".join(lines)
                    fact_contexts.insert(0, wifi_table_text)
                    print(f"[WiFi Shield] Injected price table: {len(packages)} packages into fact_contexts")
                except Exception as e:
                    print(f"[WiFi Shield] Loi doc wifi_packages.json: {e}")

        # ============================================================
        # Chuẩn hóa giá WiFi từ metadata ChromaDB (đọc pay_months/price_per_month inject lúc ingest)
        # Không dùng dict hardcode — giá thay đổi chỉ cần sửa wifi_packages.json + re-ingest
        fact_contexts = self._normalize_wifi_promo_context(fact_contexts, fact_metadatas)

        if not fact_contexts:
            fact_section = (
                "[DỮ LIỆU SỰ THẬT CHÍNH THỨC CỦA MOBIFONE (FILES & WEB)]:\n"
                "⚠️ KHÔNG CÓ DỮ LIỆU TÀI LIỆU CHÍNH THỨC TRONG CƠ SỞ DỮ LIỆU (RAG FILES = 0).\n"
                "YÊU CẦU BẮT BUỘC: Bạn BẢO VỆ TUYỆT ĐỐI nguyên tắc Grounding, PHẢI phản hồi từ chối bịa đặt: "
                "'Hiện tại Mia chưa tìm thấy thông tin chính thức về dịch vụ/gói cước này trong cơ sở dữ liệu hệ thống MobiFone. "
                "Bạn vui lòng liên hệ tổng đài 18001090 hoặc để lại Số điện thoại để chuyên viên hỗ trợ tra cứu trực tiếp cho bạn nhé!'. "
                "TUYỆT ĐỐI KHÔNG ĐƯỢC BỊA ĐẶT TÊN GÓI HOẶC GIÁ CƯỚC!"
            )
        else:
            fact_section = (
                "[DỮ LIỆU SỰ THẬT CHÍNH THỨC CỦA MOBIFONE (FILES & WEB)]:\n" +
                "\n---\n".join(fact_contexts)
            )

        if playbook_contexts:
            playbook_section = (
                "\n\n[MẪU PHONG THÁI & KỸ THUẬT GIAO TIẾP CSKH (CONVERSATION)]:\n"
                "(CHỈ DÙNG ĐỂ THAM KHẢO VĂN PHONG VÀ KỸ THUẬT CHỐT SALE. TUYỆT ĐỐI KHÔNG TRÍCH XUẤT TÊN GÓI HOẶC GIÁ TIỀN TỪ CÁC ĐOẠN CHAT NÀY NẾU PHẦN DỮ LIỆU SỰ THẬT RỖNG)\n" +
                "\n---\n".join(playbook_contexts)
            )
        else:
            playbook_section = ""
            
        # 2. Đọc cấu hình động từ rag_config.json (nếu có)
        config_path = os.path.join(BASE_DIR, "rag_config.json")
        # Fallback toi thieu - TUYET DOI KHONG chua gia cuoc hay ten goi cung.
        # Toan bo Rules va gia cuoc se duoc nap tu rag_config.json ngay ben duoi.
        # Khi rag_config.json loi parse, bot dung prompt nay - an toan tuyet doi.
        system_prompt = (
            "Ban la Mia - Chuyen vien Cham soc Khach hang so chuyen nghiep cua MobiFone.\n"
            "Tuyet doi KHONG tu nhan minh la tro ly ao, AI, chatbot hay AI Agent.\n"
            "CHI dua tren thong tin ngu canh chinh thuc duoc cung cap de tra loi.\n"
            "TUYET DOI KHONG tu tao gia cuoc, ten goi, chu ky neu khong co trong ngu canh.\n"
            "Neu khong tim thay thong tin, huong dan khach lien he tong dai 18001090.\n"
        )
        temperature = 0.0  # Set to 0.0 to prevent hallucination / enforce strict factual grounding
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

        # 2.5. Tầng 2: Pre-RAG Classifier & Behavior Playbook Retrieval
        class_info = self._classify_sentiment_and_intent(question, chat_history)
        self._last_intent = class_info
        playbooks = self._retrieve_playbook_examples(question, sales_stage=class_info.get("sales_stage"))

        competitor_addon = ""
        comp_name = class_info.get("competitor_mentioned", "").lower()
        if comp_name:
            try:
                battlecard_path = os.path.join(BASE_DIR, "data", "playbooks", "competitor_battlecards.json")
                if os.path.exists(battlecard_path):
                    with open(battlecard_path, "r", encoding="utf-8") as bf:
                        bc_data = json.load(bf)
                        comp_info = bc_data.get("competitors", {}).get(comp_name)
                        if comp_info:
                            advs = "\n".join(f"  + {adv}" for adv in comp_info.get("mobifone_advantages", []))
                            competitor_addon = (
                                f"\n• ĐỐI THỦ ĐƯỢC NHẮC ĐẾN: {comp_info.get('name')}\n"
                                f"• ƯU THẾ VƯỢT TRỘI CỦA MOBIFONE CẦN NHẤN MẠNH:\n{advs}\n"
                                f"• MẪU PHẢN HỒI THUYẾT PHỤC: {comp_info.get('response_template', '')}\n"
                            )
            except Exception as e:
                print(f"[BATTLECARD] Lỗi đọc battlecard {comp_name}: {e}")

        behavior_prompt_addon = (
            f"\n\n══════════════════════════════════════════════════════════\n"
            f"[TẦNG 2: NGHỆ THUẬT GIAO TIẾP & TÂM LÝ BÁN HÀNG CSKH THỰC CHIẾN]\n"
            f"══════════════════════════════════════════════════════════\n"
            f"• Trạng thái cảm xúc khách hàng: {class_info.get('sentiment', 'BÌNH THƯỜNG')}\n"
            f"• Tình huống/Giai đoạn bán hàng: {class_info.get('sales_stage', 'kham_pha_nhu_cau')}\n"
            f"• CHIẾN LƯỢC PHẢN HỒI YÊU CẦU: {class_info.get('tactic', 'Tư vấn lịch sự, chuyên nghiệp')}\n"
            f"{competitor_addon}\n"
        )

        if playbooks:
            behavior_prompt_addon += "[ĐOẠN HỘI THOẠI VÀ NGHỆ THUẬT ỨNG XỬ MẪU TỪ CSKH XUẤT SẮC]:\n"
            for idx, pb in enumerate(playbooks):
                behavior_prompt_addon += f"Mẫu #{idx+1} (Kỹ thuật: {pb['tactic']}):\n{pb['text']}\n\n"

        behavior_prompt_addon += (
            "HƯỚNG DẪN TƯ VẤN THỰC CHIẾN:\n"
            "1. Kết hợp CHÍNH XÁC dữ liệu sự thật gói cước (Tầng 1) với PHONG THÁI CSKH & KỸ THUẬT CHỐT ĐƠN (Tầng 2).\n"
            "2. Nếu khách chê giá đắt: Hãy tỏ ra đồng cảm, nhấn mạnh giá trị và chia nhỏ chi phí theo ngày (ví dụ 90k/tháng = 3k/ngày) trước khi chốt.\n"
            "3. Nếu khách bực bội: Hãy xoa dịu ngắn gọn, chia sẻ thông cảm trước khi đưa giải pháp.\n"
            "4. Kết thúc bằng câu hỏi gợi mở leading question để dẫn dắt hành động mua hàng.\n"
            "══════════════════════════════════════════════════════════"
        )

        # 3. Xây dựng Prompt Engineering chuẩn
        prompt = f"""{system_prompt}{behavior_prompt_addon}
"""
        if user_context:
            prompt += user_context

        prompt += f"""
{fact_section}
{playbook_section}
"""

        # Bổ sung lịch sử trò chuyện nếu có
        if chat_history:
            prompt += "\n[Lịch sử hội thoại gần đây giữa Khách hàng và MobiFone]:\n"
            for msg in chat_history:
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
        

        
        # Post-processing Privacy Safeguard: Programmatically prevent the bot from repeating phone numbers in the question
        try:
            phone_pattern = r'(?:\+?84|0)(?:\s*\d){8,10}'
            
            # Lấy ra tất cả các chuỗi số liên tiếp từ câu hỏi
            raw_query_digits = re.findall(r'\d+', question)
            query_phones = []
            
            for num in raw_query_digits:
                if 9 <= len(num) <= 11 and (num.startswith('0') or num.startswith('84')):
                    query_phones.append(num)
                    
            # Tìm kiếm theo pattern định dạng số điện thoại trong câu hỏi
            matched_phones = re.findall(phone_pattern, question)
            for p in matched_phones:
                cleaned = re.sub(r'\D', '', p)
                if cleaned not in query_phones:
                    query_phones.append(cleaned)
                    
            # Tẩy sạch số điện thoại khỏi câu trả lời
            for phone in query_phones:
                if phone in answer:
                    answer = answer.replace(phone, "")
                # Tẩy cả định dạng có khoảng trắng/chấm trong câu trả lời nếu khớp với phone
                phone_chars = [re.escape(c) for c in phone]
                phone_regex = r'\s*[-.\s]*\s*'.join(phone_chars)
                answer = re.sub(phone_regex, "", answer)
                
            # Làm sạch các khoảng trắng dư thừa do việc xóa SĐT tạo ra (giữ nguyên dấu xuống dòng)
            answer = re.sub(r'[^\S\r\n]+', ' ', answer).strip()
        except Exception as pe:
            print(f"⚠️ Lỗi xử lý Data Privacy Safeguard: {pe}")
        
        # Tách phần gợi ý câu hỏi ở cuối phản hồi
        import re
        suggested_questions = []
        matches = list(re.finditer(r'(?:^|\n)(?:\[GỢI\s*Ý.*?\]|\*\*gợi\s*ý.*?\*\*|gợi\s*ý.*?:)', answer, flags=re.IGNORECASE))
        if matches:
            last_match = matches[-1]
            start, end = last_match.span()
            answer_text = answer[:start].strip()
            suggestions_block = answer[end:].strip()
            answer = answer_text
            # Split by newlines first
            raw_lines = suggestions_block.split("\n")
            items = []
            for line in raw_lines:
                line = line.strip()
                if not line:
                    continue
                # Split inline numbered lists (e.g. "1. Question A 2. Question B")
                # and inline bulleted lists (e.g. "- Question A - Question B")
                parts_inline = re.split(r'\s+(?=\b\d+[\.\-\)]\s+)|\s+(?=\s*[\-\*\•\+]\s+)', line)
                for part in parts_inline:
                    part = part.strip()
                    if part:
                        items.append(part)
            
            for item in items:
                # Strip leading numbers like "1. ", "2) ", "- "
                cleaned_item = re.sub(r'^\d+[\.\-\)]\s*', '', item).strip()
                cleaned_item = re.sub(r'^\d+\.\s*', '', cleaned_item).strip()
                cleaned_item = re.sub(r'^[\-\*\+\s]+', '', cleaned_item).strip()
                if cleaned_item and len(cleaned_item) > 3:
                    if not cleaned_item.startswith(('[', ']', '<', '>')):
                        suggested_questions.append(cleaned_item)
                        
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
        
        # 5. Trích xuất danh sách nguồn tham khảo không trùng lặp (không lấy hình ảnh để tắt tính năng phản hồi ảnh)
        unique_sources = []
        extracted_images = []
        for src in sources:
            url = src.get("source_url")
            title = src.get("source_title")
            if url and url not in [s['url'] for s in unique_sources]:
                unique_sources.append({"title": title, "url": url})
                
        return answer, unique_sources, suggested_questions, extracted_images


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
    
    answer, sources, _, _ = bot.answer_question(cau_hoi)
    print(f"\n🤖 Bot trả lời:\n{answer}")
    
    print("\n🔗 Nguồn tham khảo chính thống từ MobiFone:")
    for src in sources:
        print(f"- {src['title']}: {src['url']}")
