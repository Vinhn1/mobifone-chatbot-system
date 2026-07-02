import os
import sys
import json
import time
import subprocess
from typing import List, Optional
from pydantic import BaseModel
from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from rag_pipeline import AIServiceError, MobiFoneRAG

# Tự động kiểm tra và cài đặt các thư viện đọc tài liệu nếu thiếu
def install_dependencies():
    packages = ["pypdf", "python-docx", "openpyxl", "pandas", "python-pptx"]
    for package in packages:
        try:
            if package == "pypdf":
                import pypdf
            elif package == "python-docx":
                import docx
            elif package == "openpyxl":
                import openpyxl
            elif package == "pandas":
                import pandas
            elif package == "python-pptx":
                import pptx
        except ImportError:
            print(f"📦 Đang tự động cài đặt thư viện thiếu: {package}...")
            try:
                subprocess.check_call([sys.executable, "-m", "pip", "install", package])
                print(f"✅ Cài đặt thành công: {package}")
            except Exception as e:
                print(f"❌ Không thể tự động cài đặt {package}: {e}")

# Chạy kiểm tra cài đặt
install_dependencies()

# Khởi tạo FastAPI app
app = FastAPI(title="MobiFone AI Service")

# Cấu hình CORS để Frontend gọi trực tiếp được
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Khởi tạo RAG bot
bot = MobiFoneRAG()
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# Cấu hình StaticFiles để phục vụ ảnh trích xuất
from fastapi.staticfiles import StaticFiles
STATIC_DIR = os.path.join(BASE_DIR, "static")
os.makedirs(os.path.join(STATIC_DIR, "extracted_images"), exist_ok=True)
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")
import threading

# Đường dẫn lưu file cache gợi ý động
SUGGESTIONS_CACHE_PATH = os.path.join(BASE_DIR, "dynamic_suggestions.json")

# Danh sách gợi ý mặc định dự phòng
DEFAULT_SUGGESTIONS = [
    "Gói TK135 có gì?",
    "Đăng ký 5G?",
    "Xem ưu đãi hot",
    "Tư vấn gói phù hợp",
    "Hỗ trợ kỹ thuật"
]

def generate_dynamic_suggestions():
    """Gọi Gemini phân tích kho tri thức và sinh 5 câu hỏi gợi ý tối ưu nhất."""
    print("[SUGGESTIONS] Đang khởi chạy tiến trình sinh gợi ý động bằng AI...")
    try:
        # Lấy tất cả metadata hiện có trong Vector DB để phân tích
        data = bot.collection.get(include=["metadatas"])
        metadatas = data.get("metadatas", []) or []
        
        # Lọc ra danh sách tiêu đề tài liệu và gói cước độc bản
        doc_titles = list(set([meta.get("source_title") for meta in metadatas if meta and meta.get("source_title")]))
        package_names = list(set([meta.get("package_name") for meta in metadatas if meta and meta.get("package_name")]))
        
        # Nếu chưa có bất kỳ tài liệu hay gói cước nào, dùng danh sách mặc định
        if not doc_titles and not package_names:
            print("[SUGGESTIONS] Không tìm thấy dữ liệu trong Vector DB, dùng gợi ý mặc định.")
            suggestions = DEFAULT_SUGGESTIONS
        else:
            prompt = f"""Bạn là một chuyên gia tư vấn dịch vụ của nhà mạng MobiFone.
Hãy phân tích danh sách các tài liệu hướng dẫn và gói cước hiện đang được nạp vào hệ thống dưới đây:

Tài liệu tri thức: {", ".join(doc_titles[:15]) if doc_titles else "Chưa có"}
Gói cước di động: {", ".join(package_names[:15]) if package_names else "Chưa có"}

Yêu cầu:
1. Đề xuất chính xác 5 câu hỏi hoặc phím tắt gợi ý (suggestions) ngắn gọn mà khách hàng sẽ quan tâm nhất (Ví dụ: "Gói TK135 có ưu đãi gì?", "Đăng ký eSIM thế nào?").
2. Mỗi câu hỏi gợi ý phải cực kỳ ngắn gọn, súc tích (tối đa 25 ký tự) để hiển thị đẹp mắt trên giao diện widget của điện thoại hoặc góc màn hình máy tính.
3. Trả về kết quả dưới dạng một mảng JSON các chuỗi (string array). Ví dụ: ["Gói TK135 có gì?", "Đăng ký eSIM?", "Lỗi không nhận sóng?"]
4. Chỉ trả về JSON nguyên bản duy nhất, không bọc trong thẻ markdown ```json hay ```. Không ghi bất kỳ dòng giải thích, giới thiệu nào khác ngoài chuỗi JSON hợp lệ.
"""
            llm_response = bot._call_llm_with_retry(prompt, temperature=0.3)
            cleaned_response = llm_response.strip()
            
            # Làm sạch thẻ markdown ```json nếu LLM vẫn trả về
            if cleaned_response.startswith("```"):
                lines = cleaned_response.splitlines()
                if lines[0].startswith("```"):
                    lines = lines[1:]
                if lines and lines[-1].startswith("```"):
                    lines = lines[:-1]
                cleaned_response = "\n".join(lines).strip()
                
            try:
                suggestions = json.loads(cleaned_response)
                if not isinstance(suggestions, list) or len(suggestions) < 3:
                    raise ValueError("Dữ liệu trả về không phải là mảng hoặc số lượng gợi ý quá ít.")
                suggestions = [str(item) for item in suggestions[:6]] # Lấy tối đa 6 cái
                print(f"[SUGGESTIONS] Đã sinh thành công {len(suggestions)} gợi ý động từ AI.")
            except Exception as parse_err:
                print(f"⚠️ [SUGGESTIONS] Lỗi parse JSON gợi ý từ LLM: {parse_err}. Nội dung thô: {cleaned_response}")
                suggestions = DEFAULT_SUGGESTIONS
                
    except Exception as e:
        print(f"⚠️ [SUGGESTIONS] Lỗi trong tiến trình sinh gợi ý: {e}")
        suggestions = DEFAULT_SUGGESTIONS
        
    # Ghi đè vào file cache
    try:
        with open(SUGGESTIONS_CACHE_PATH, "w", encoding="utf-8") as f:
            json.dump(suggestions, f, ensure_ascii=False, indent=2)
        print("[SUGGESTIONS] Đã cập nhật file cache gợi ý thành công.")
    except Exception as write_err:
        print(f"⚠️ [SUGGESTIONS] Không thể ghi file cache gợi ý: {write_err}")
    return suggestions

def get_cached_suggestions() -> list:
    """Lấy danh sách gợi ý từ cache, nếu chưa có thì chạy sinh mới."""
    if os.path.exists(SUGGESTIONS_CACHE_PATH):
        try:
            with open(SUGGESTIONS_CACHE_PATH, "r", encoding="utf-8") as f:
                data = json.load(f)
                if isinstance(data, list) and len(data) > 0:
                    return data
        except Exception as read_err:
            print(f"⚠️ [SUGGESTIONS] Lỗi đọc file cache gợi ý: {read_err}")
    
    # Sinh mới nếu chưa có hoặc lỗi
    return generate_dynamic_suggestions()

@app.on_event("startup")
def startup_event():
    """Khi khởi động server, tự động nạp hoặc tái tạo cache gợi ý ở background thread."""
    threading.Thread(target=generate_dynamic_suggestions, daemon=True).start()

# API endpoint lấy gợi ý động
@app.get("/suggestions")
def get_suggestions():
    try:
        suggestions = get_cached_suggestions()
        return suggestions
    except Exception as e:
        return DEFAULT_SUGGESTIONS

# Schema Pydantic
class MessageModel(BaseModel):
    role: str
    message: str

class ChatRequest(BaseModel):
    message: str
    history: Optional[List[MessageModel]] = None
    userInfo: Optional[dict] = None

class ChatResponse(BaseModel):
    answer: str
    sources: list
    suggested_questions: Optional[List[str]] = []
    images: Optional[List[str]] = []

class ConfigModel(BaseModel):
    system_prompt: str
    temperature: float
    top_p: float
    max_tokens: int
    fb_enabled: Optional[bool] = False
    fb_verify_token: Optional[str] = ""
    fb_page_token: Optional[str] = ""
    fb_page_id: Optional[str] = ""
    zalo_enabled: Optional[bool] = False
    zalo_app_id: Optional[str] = ""
    zalo_secret_key: Optional[str] = ""
    zalo_access_token: Optional[str] = ""
    zalo_refresh_token: Optional[str] = ""
    zalo_oa_id: Optional[str] = ""

# Health check
@app.get("/health")
def health_check():
    try:
        count = bot.collection.count()
        return {"status": "ok", "knowledge_count": count}
    except Exception as e:
        return {"status": "error", "message": str(e)}

# Chat endpoint
@app.post("/chat", response_model=ChatResponse)
def chat(request: ChatRequest):
    try:
        history_list = []
        if request.history:
            history_list = [{"role": msg.role, "message": msg.message} for msg in request.history]
            
        answer, sources, suggested_questions, images = bot.answer_question(request.message, history=history_list, user_info=request.userInfo)
        return ChatResponse(answer=answer, sources=sources, suggested_questions=suggested_questions, images=images)
    except AIServiceError as e:
        raise HTTPException(status_code=e.status_code, detail=e.detail)
    except Exception as e:
        error_msg = str(e)
        if "503" in error_msg:
            raise HTTPException(status_code=503, detail="AI đang quá tải, vui lòng thử lại sau ít giây.")
        elif "429" in error_msg:
            raise HTTPException(status_code=429, detail="Đã vượt giới hạn API, vui lòng thử lại sau.")
        else:
            raise HTTPException(status_code=500, detail=f"Lỗi hệ thống: {error_msg}")

# Lấy cấu hình Prompt Playground
@app.get("/config")
def get_config():
    config_path = os.path.join(BASE_DIR, "rag_config.json")
    if os.path.exists(config_path):
        try:
            with open(config_path, "r", encoding="utf-8") as f:
                data = json.load(f)
                # Đảm bảo các thuộc tính mới tồn tại nếu đọc từ file cũ
                data.setdefault("fb_enabled", False)
                data.setdefault("fb_verify_token", "")
                data.setdefault("fb_page_token", "")
                data.setdefault("fb_page_id", "")
                data.setdefault("zalo_enabled", False)
                data.setdefault("zalo_app_id", "")
                data.setdefault("zalo_secret_key", "")
                data.setdefault("zalo_access_token", "")
                data.setdefault("zalo_refresh_token", "")
                data.setdefault("zalo_oa_id", "")
                return data
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Không thể đọc file cấu hình: {e}")
    else:
        # Trả về mặc định
        return {
            "system_prompt": "Bạn là Chuyên viên Chăm sóc Khách hàng chuyên nghiệp của nhà mạng MobiFone.\nTuyệt đối KHÔNG tự nhận mình là trợ lý ảo, AI, chatbot hay AI Agent. Hãy xưng hô lịch sự là 'MobiFone' hoặc 'Chuyên viên chăm sóc khách hàng'.\nHãy trả lời câu hỏi của khách hàng một cách lịch sự, thân thiện, súc tích, ĐI THẲNG VÀO TRỌNG TÂM câu hỏi và CHỈ dựa trên thông tin ngữ cảnh chính thức được cung cấp dưới đây.\n\n[Nguyên tắc phản hồi]:\n1. CHỈ TRẢ LỜI dựa trên thông tin có sẵn trong ngữ cảnh. Tuyệt đối KHÔNG tự bịa đặt thông số gói cước (giá tiền, dung lượng data, phút gọi) nếu ngữ cảnh không nhắc đến hoặc gói cước đó không tồn tại trong tài liệu được cung cấp.\n2. Nếu khách hàng hỏi về một gói cước KHÔNG có trong ngữ cảnh (Ví dụ: MC99, gói cước lạ): Hãy lịch sự trả lời: \"Hiện tại hệ thống của MobiFone chưa cập nhật thông tin chi tiết về gói cước mà bạn quan tâm trong cơ sở dữ liệu hiện hành. Để hỗ trợ tốt nhất, bạn có thể để lại Số điện thoại, chuyên viên kỹ thuật sẽ kiểm tra trực tiếp trên thuê bao của bạn và gọi lại tư vấn ngay ạ.\"\n3. Tuyệt đối KHÔNG sử dụng các kỹ thuật ép buộc hay hối thúc bán hàng giả tạo như \"chỉ còn 3 suất cuối\", \"áp dụng trong hôm nay\" hoặc tạo áp lực tâm lý để ép lấy thông tin cá nhân.\n4. Khi khách hàng cung cấp số điện thoại, tuyệt đối KHÔNG lặp lại số điện thoại đó ở tin nhắn tiếp theo nhằm bảo mật thông tin cá nhân của khách hàng (Data Privacy).\n5. Khi liệt kê ưu đãi của gói cước, hãy sử dụng các dấu gạch đầu dòng rõ ràng, không viết thành một đoạn văn dài dòng (Formatting). Sử dụng các ký tự icon (như 🌟, 📦, 📶, 💸, 📝) để phân tách thông tin, giúp người đọc dễ nhìn.\n6. Đối với câu chào hỏi, cảm ơn hoặc hỏi thăm xã giao (không yêu cầu tra cứu dịch vụ): Trả lời một cách tự nhiên, thân thiện, lịch sự và tuyệt đối KHÔNG yêu cầu khách hàng cung cấp Số điện thoại.",
            "temperature": 0.3,
            "top_p": 0.9,
            "max_tokens": 512,
            "fb_enabled": False,
            "fb_verify_token": "",
            "fb_page_token": "",
            "fb_page_id": "",
            "zalo_enabled": False,
            "zalo_app_id": "",
            "zalo_secret_key": "",
            "zalo_access_token": "",
            "zalo_refresh_token": "",
            "zalo_oa_id": ""
        }

# Cập nhật cấu hình Prompt Playground
@app.post("/config")
def update_config(cfg: ConfigModel):
    config_path = os.path.join(BASE_DIR, "rag_config.json")
    try:
        with open(config_path, "w", encoding="utf-8") as f:
            json.dump(cfg.dict(), f, ensure_ascii=False, indent=2)
        return {"status": "success", "message": "Đã lưu cấu hình RAG thành công"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Không thể lưu cấu hình: {e}")

# Lấy danh sách tài liệu trong Vector DB
@app.get("/documents")
def get_documents():
    try:
        # Lấy tất cả metadata trong database
        data = bot.collection.get(include=["metadatas"])
        metadatas = data.get("metadatas", [])
        
        # Nhóm dữ liệu theo tên tài liệu
        docs_dict = {}
        for meta in metadatas:
            if not meta:
                continue
            title = meta.get("source_title", "Tài liệu không tên")
            doc_type = meta.get("type", "UNKNOWN")
            size_bytes = meta.get("size_bytes", 0)
            upload_date = meta.get("upload_date", "N/A")
            
            if title not in docs_dict:
                docs_dict[title] = {
                    "name": title,
                    "type": doc_type,
                    "size": f"{size_bytes / (1024 * 1024):.1f} MB" if size_bytes > 1024 * 1024 else f"{size_bytes / 1024:.1f} KB",
                    "status": "Synced",
                    "progress": 100,
                    "chunks": 0,
                    "vectors": 0,
                    "upload_date": upload_date
                }
            
            docs_dict[title]["chunks"] += 1
            docs_dict[title]["vectors"] += 1
            
        return list(docs_dict.values())
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi truy xuất tài liệu: {e}")

# Xóa tài liệu khỏi Vector DB
@app.delete("/documents/{name}")
def delete_document(name: str):
    try:
        bot.collection.delete(where={"source_title": name})
        # Cập nhật gợi ý động trong background thread để tránh làm chậm response delete
        threading.Thread(target=generate_dynamic_suggestions, daemon=True).start()
        return {"status": "success", "message": f"Đã xóa tài liệu '{name}' khỏi Vector DB"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi khi xóa tài liệu: {e}")

# Helper functions for image extraction and document processing
import hashlib

def save_extracted_image(img_bytes: bytes, original_filename: str, ext: str = ".png") -> str:
    # Sử dụng mã hash MD5 của dữ liệu ảnh để làm tên file, tránh trùng lặp
    hasher = hashlib.md5()
    hasher.update(img_bytes)
    img_hash = hasher.hexdigest()
    
    # Loại bỏ ký tự đặc biệt khỏi tên file gốc
    safe_filename = "".join(c for c in os.path.splitext(original_filename)[0] if c.isalnum() or c in ("-", "_")).strip()
    if not safe_filename:
        safe_filename = "doc"
        
    filename = f"{safe_filename}_{img_hash}{ext}"
    
    # Lưu vào thư mục static/extracted_images
    dest_dir = os.path.join(BASE_DIR, "static", "extracted_images")
    os.makedirs(dest_dir, exist_ok=True)
    dest_path = os.path.join(dest_dir, filename)
    with open(dest_path, "wb") as f:
        f.write(img_bytes)
        
    return filename

def extract_docx_images_and_text(temp_file_path: str, filename: str) -> str:
    import docx
    doc = docx.Document(temp_file_path)
    docx_parts = []
    
    # Duyệt qua các paragraph
    for p in doc.paragraphs:
        p_text = p.text.strip()
        
        # Tìm các thẻ blip chứa ảnh
        blip_elements = p._element.xpath('.//*[local-name()="blip"]')
        p_images = []
        for blip in blip_elements:
            rId = None
            for attr_name, attr_val in blip.items():
                if attr_name.endswith('embed'):
                    rId = attr_val
                    break
            if rId:
                try:
                    image_part = doc.part.related_parts[rId]
                    image_bytes = image_part.blob
                    _, ext = os.path.splitext(image_part.partname)
                    if not ext:
                        ext = ".png"
                    img_filename = save_extracted_image(image_bytes, filename, ext)
                    p_images.append(img_filename)
                except Exception as img_err:
                    print(f"⚠️ Lỗi lấy dữ liệu ảnh từ rId {rId}: {img_err}")
                    
        if p_images:
            img_placeholders = " ".join([f"[IMAGE:{img}]" for img in p_images])
            if p_text:
                p_text = f"{p_text} {img_placeholders}"
            else:
                p_text = img_placeholders
                
        if p_text:
            docx_parts.append(p_text)
            
    # Duyệt qua các bảng
    for table in doc.tables:
        for row in table.rows:
            row_text = []
            for cell in row.cells:
                cell_text = cell.text.strip().replace("\n", " ")
                
                blip_elements = cell._element.xpath('.//*[local-name()="blip"]')
                cell_images = []
                for blip in blip_elements:
                    rId = None
                    for attr_name, attr_val in blip.items():
                        if attr_name.endswith('embed'):
                            rId = attr_val
                            break
                    if rId:
                        try:
                            image_part = doc.part.related_parts[rId]
                            image_bytes = image_part.blob
                            _, ext = os.path.splitext(image_part.partname)
                            if not ext:
                                ext = ".png"
                            img_filename = save_extracted_image(image_bytes, filename, ext)
                            cell_images.append(img_filename)
                        except Exception as img_err:
                            print(f"⚠️ Lỗi lấy ảnh từ cell rId {rId}: {img_err}")
                            
                if cell_images:
                    img_placeholders = " ".join([f"[IMAGE:{img}]" for img in cell_images])
                    if cell_text:
                        cell_text = f"{cell_text} {img_placeholders}"
                    else:
                        cell_text = img_placeholders
                        
                row_text.append(cell_text)
                
            cleaned_row = []
            for val in row_text:
                if not cleaned_row or val != cleaned_row[-1]:
                    cleaned_row.append(val)
            if cleaned_row:
                docx_parts.append(" | ".join(cleaned_row))
                
    return "\n".join(docx_parts)

def extract_pptx_slides_and_text(temp_file_path: str, filename: str) -> list:
    from pptx import Presentation
    prs = Presentation(temp_file_path)
    slide_chunks = []
    
    def extract_images_from_shape(shape, original_filename, extracted_imgs):
        # MSO_SHAPE_TYPE.PICTURE = 13
        if shape.shape_type == 13 or hasattr(shape, "image"):
            try:
                image = shape.image
                ext = f".{image.ext}" if image.ext else ".png"
                img_filename = save_extracted_image(image.blob, original_filename, ext)
                extracted_imgs.append(img_filename)
            except Exception as e:
                print(f"⚠️ Lỗi trích xuất ảnh từ shape: {e}")
        elif shape.shape_type == 6: # MSO_SHAPE_TYPE.GROUP
            for sub_shape in shape.shapes:
                extract_images_from_shape(sub_shape, original_filename, extracted_imgs)
                
    for slide_idx, slide in enumerate(prs.slides):
        slide_text_parts = []
        slide_images = []
        
        for shape in slide.shapes:
            # Trích xuất text
            if hasattr(shape, "text") and shape.text.strip():
                slide_text_parts.append(shape.text.strip())
                
            # Trích xuất text từ table nếu có
            if shape.has_table:
                for row in shape.table.rows:
                    row_text = [cell.text.strip().replace("\n", " ") for cell in row.cells]
                    cleaned_row = []
                    for val in row_text:
                        if not cleaned_row or val != cleaned_row[-1]:
                            cleaned_row.append(val)
                    if cleaned_row:
                        slide_text_parts.append(" | ".join(cleaned_row))
                        
            # Trích xuất ảnh
            extract_images_from_shape(shape, filename, slide_images)
            
        slide_text = "\n".join(slide_text_parts).strip()
        
        # Nếu slide không có text nhưng có hình ảnh, tạo text mặc định mô tả slide
        if not slide_text and slide_images:
            slide_text = f"Hình ảnh minh họa/sơ đồ từ Slide {slide_idx + 1} của tài liệu {filename}"
            
        if slide_text or slide_images:
            # Thêm placeholder ảnh trực tiếp vào slide_text để hỗ trợ tìm kiếm ngữ cảnh có ảnh
            if slide_images:
                img_placeholders = " ".join([f"[IMAGE:{img}]" for img in slide_images])
                slide_text = f"{slide_text}\n{img_placeholders}"
                
            slide_chunks.append({
                "text": slide_text,
                "metadata": {
                    "slide_index": slide_idx + 1,
                    "images": ",".join(slide_images) if slide_images else ""
                }
            })
            
    return slide_chunks

# Upload tài liệu và nạp vector tức thì (Hot-reload Ingestion)
@app.post("/upload")
async def upload_document(file: UploadFile = File(...)):
    filename = file.filename
    content_type = file.content_type
    
    # 1. Đọc nội dung file nhị phân
    file_bytes = await file.read()
    size_bytes = len(file_bytes)
    
    # Tạo thư mục temp để lưu tạm file
    temp_dir = os.path.join(BASE_DIR, "temp_uploads")
    os.makedirs(temp_dir, exist_ok=True)
    temp_file_path = os.path.join(temp_dir, filename)
    
    with open(temp_file_path, "wb") as f:
        f.write(file_bytes)
        
    text_content = ""
    file_ext = os.path.splitext(filename)[1].lower()
    is_pptx = False
    pptx_chunks = []
    
    # 2. Phân tách và trích xuất text tùy theo định dạng file
    try:
        if file_ext == ".txt":
            text_content = file_bytes.decode("utf-8", errors="ignore")
        elif file_ext == ".json":
            json_data = json.loads(file_bytes.decode("utf-8", errors="ignore"))
            if isinstance(json_data, list):
                text_content = "\n".join([json.dumps(item, ensure_ascii=False) for item in json_data])
            else:
                text_content = json.dumps(json_data, ensure_ascii=False)
        elif file_ext == ".pdf":
            import pypdf
            reader = pypdf.PdfReader(temp_file_path)
            text_list = []
            for page in reader.pages:
                text_list.append(page.extract_text() or "")
            text_content = "\n".join(text_list)
        elif file_ext in [".docx", ".doc"]:
            text_content = extract_docx_images_and_text(temp_file_path, filename)
        elif file_ext in [".xlsx", ".xls"]:
            import pandas as pd
            df_dict = pd.read_excel(temp_file_path, sheet_name=None)
            text_list = []
            for sheet_name, df in df_dict.items():
                text_list.append(f"Sheet: {sheet_name}\n" + df.to_string())
            text_content = "\n".join(text_list)
        elif file_ext == ".pptx":
            is_pptx = True
            pptx_chunks = extract_pptx_slides_and_text(temp_file_path, filename)
            text_content = "\n".join([chunk["text"] for chunk in pptx_chunks])
        else:
            raise HTTPException(status_code=400, detail="Định dạng file không hỗ trợ. Chỉ nhận TXT, JSON, PDF, DOCX, XLSX, PPTX.")
    except Exception as e:
        # Dọn dẹp file temp
        if os.path.exists(temp_file_path):
            os.remove(temp_file_path)
        raise HTTPException(status_code=500, detail=f"Lỗi khi trích xuất nội dung file: {str(e)}")
    
    # Dọn dẹp file temp
    if os.path.exists(temp_file_path):
        os.remove(temp_file_path)
        
    if not is_pptx and (not text_content.strip() or len(text_content.strip()) < 10):
        raise HTTPException(status_code=400, detail="Nội dung file trống hoặc quá ngắn, không thể nạp vector.")

    # 3. Chia nhỏ văn bản (Chunking) & Nạp vào ChromaDB
    documents = []
    metadatas = []
    ids = []
    upload_date = time.strftime("%d %b %Y")
    
    if is_pptx:
        if not pptx_chunks:
            raise HTTPException(status_code=400, detail="Không thể trích xuất nội dung từ file PPTX.")
        for idx, item in enumerate(pptx_chunks):
            documents.append(item["text"])
            metadatas.append({
                "source_title": filename,
                "source_url": f"upload://{filename}",
                "type": "PPTX",
                "size_bytes": size_bytes,
                "upload_date": upload_date,
                "slide_index": item["metadata"]["slide_index"],
                "images": item["metadata"]["images"]
            })
            ids.append(f"upload_{filename}_{int(time.time())}_{idx}")
    else:
        words = text_content.split()
        chunk_size = 300  # số từ mỗi mảnh
        overlap = 50
        step = chunk_size - overlap
        
        chunks = []
        for i in range(0, len(words), step):
            chunk = " ".join(words[i:i + chunk_size])
            if chunk.strip():
                chunks.append(chunk)
                
        if not chunks:
            raise HTTPException(status_code=400, detail="Không thể tạo các mảnh dữ liệu văn bản.")
            
        for idx, chunk in enumerate(chunks):
            import re
            img_matches = re.findall(r'\[IMAGE:(.*?)\]', chunk)
            chunk_images = ",".join(list(set(img_matches)))
            
            documents.append(chunk)
            metadatas.append({
                "source_title": filename,
                "source_url": f"upload://{filename}",
                "type": file_ext.replace(".", "").upper(),
                "size_bytes": size_bytes,
                "upload_date": upload_date,
                "images": chunk_images
            })
            ids.append(f"upload_{filename}_{int(time.time())}_{idx}")

    try:
        # Tự động xóa các vector cũ cùng tên (nếu có) để tránh trùng lặp dữ liệu
        try:
            bot.collection.delete(where={"source_title": filename})
        except Exception as delete_err:
            print(f"⚠️ Cảnh báo khi dọn dẹp tài liệu cũ: {delete_err}")

        # Nạp theo lô nhỏ
        batch_size = 100
        for i in range(0, len(documents), batch_size):
            end_idx = min(i + batch_size, len(documents))
            bot.collection.add(
                documents=documents[i:end_idx],
                metadatas=metadatas[i:end_idx],
                ids=ids[i:end_idx]
            )
            
        # 5. Gọi Gemini trích xuất thông tin gói cước nếu có trong tài liệu tri thức
        extracted_packages = []
        try:
            # Chỉ gửi một phần nội dung nếu tệp quá lớn để tránh quá tải token
            preview_content = text_content[:15000]
            
            prompt = f"""Bạn là một chuyên gia phân tích dữ liệu của nhà mạng MobiFone.
Hãy đọc kỹ văn bản dưới đây và trích xuất danh sách tất cả các gói cước di động/viễn thông MobiFone được giới thiệu.
Với mỗi gói cước, hãy trích xuất các thông tin sau theo đúng cấu trúc JSON:
- id: Mã gói cước viết hoa liền nhau, ví dụ: "TK135", "KC150"
- name: Tên gói cước viết hoa liền nhau, giống id
- price: Giá gói cước định dạng chuỗi có chữ 'đ' hoặc 'đồng', ví dụ: "135.000đ", "90.000đ"
- data: Mô tả dung lượng data, ví dụ: "4GB/ngày", "1.5GB/ngày", "Không giới hạn"
- voice: Mô tả ưu đãi cuộc gọi thoại, ví dụ: "Nội mạng miễn phí + 20p ngoại mạng", "1000p nội mạng"
- validity: Chu kỳ gói cước, ví dụ: "30 ngày", "24 giờ"
- category: Thể loại gói cước, chỉ chọn một trong ba giá trị sau: "data", "voice", hoặc "unlimited"
- features: Danh sách mảng chuỗi các đặc điểm nổi bật, ví dụ: ["5G Ready", "MobiFone TV+", "Xem YouTube miễn phí"]
- color: Mã màu HEX phù hợp làm màu chủ đạo cho card gói cước này, ví dụ: "#E4002B", "#0055A5", "#059669", "#7C3AED", "#DC2626", "#4F46E5"
- popular: Giá trị boolean (true hoặc false) biểu thị gói cước này có phải là gói nổi bật phổ biến không
- dataTotalGB: Tổng dung lượng GB trong một chu kỳ (ví dụ: 4GB/ngày * 30 ngày = 120, hoặc 1GB/ngày * 30 ngày = 30, hoặc không giới hạn = 999), lưu dạng số nguyên (integer)
- voiceTotalMin: Tổng số phút gọi thoại nội mạng + ngoại mạng trong một chu kỳ, lưu dạng số nguyên (integer). Nếu không đề cập thì mặc định lưu 600.

Hãy trả về kết quả dưới dạng một mảng JSON các đối tượng gói cước.
LƯU Ý QUAN TRỌNG: Chỉ trả về JSON nguyên bản, không kèm ký tự markdown như ```json hay ```. Không có bất cứ ký tự giải thích nào khác ngoài chuỗi JSON hợp lệ. Nếu không tìm thấy bất kỳ gói cước nào trong văn bản, hãy trả về mảng rỗng [].

Văn bản cần phân tích:
{preview_content}
"""
            llm_response = bot._call_llm_with_retry(prompt, temperature=0.1)
            
            # Làm sạch dữ liệu phản hồi từ mô hình
            cleaned_response = llm_response.strip()
            if cleaned_response.startswith("```"):
                lines = cleaned_response.splitlines()
                if lines[0].startswith("```"):
                    lines = lines[1:]
                if lines and lines[-1].startswith("```"):
                    lines = lines[:-1]
                cleaned_response = "\n".join(lines).strip()
            
            extracted_packages = json.loads(cleaned_response)
            if not isinstance(extracted_packages, list):
                extracted_packages = []
            print(f"[EXTRACT] Trích xuất thành công {len(extracted_packages)} gói cước từ '{filename}'")
        except Exception as extract_err:
            print(f"⚠️ Cảnh báo: Lỗi khi trích xuất gói cước bằng Gemini: {extract_err}")
            extracted_packages = []

        # Cập nhật gợi ý động trong background thread để tránh làm chậm response upload
        threading.Thread(target=generate_dynamic_suggestions, daemon=True).start()

        return {
            "status": "success",
            "message": f"Đã nạp thành công tài liệu '{filename}'",
            "chunks_count": len(pptx_chunks) if is_pptx else len(chunks),
            "size": f"{size_bytes / 1024:.1f} KB",
            "packages": extracted_packages
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi khi nạp vector vào ChromaDB: {e}")
