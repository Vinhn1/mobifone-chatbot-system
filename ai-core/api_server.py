import os
import sys
import json
import time
import subprocess
from typing import List, Optional
from pydantic import BaseModel
from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from rag_pipeline import MobiFoneRAG

# Tự động kiểm tra và cài đặt các thư viện đọc tài liệu nếu thiếu
def install_dependencies():
    packages = ["pypdf", "python-docx", "openpyxl", "pandas"]
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

# Schema Pydantic
class MessageModel(BaseModel):
    role: str
    message: str

class ChatRequest(BaseModel):
    message: str
    history: Optional[List[MessageModel]] = None

class ChatResponse(BaseModel):
    answer: str
    sources: list

class ConfigModel(BaseModel):
    system_prompt: str
    temperature: float
    top_p: float
    max_tokens: int
    fb_enabled: Optional[bool] = False
    fb_verify_token: Optional[str] = ""
    fb_page_token: Optional[str] = ""
    zalo_enabled: Optional[bool] = False
    zalo_app_id: Optional[str] = ""
    zalo_secret_key: Optional[str] = ""

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
            
        answer, sources = bot.answer_question(request.message, history=history_list)
        return ChatResponse(answer=answer, sources=sources)
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
                data.setdefault("zalo_enabled", False)
                data.setdefault("zalo_app_id", "")
                data.setdefault("zalo_secret_key", "")
                return data
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Không thể đọc file cấu hình: {e}")
    else:
        # Trả về mặc định
        return {
            "system_prompt": "Bạn là một Trợ lý ảo AI thông minh, hỗ trợ tư vấn bán hàng và chăm sóc khách hàng chuyên nghiệp của nhà mạng MobiFone...",
            "temperature": 0.4,
            "top_p": 0.9,
            "max_tokens": 512,
            "fb_enabled": False,
            "fb_verify_token": "",
            "fb_page_token": "",
            "zalo_enabled": False,
            "zalo_app_id": "",
            "zalo_secret_key": ""
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
        return {"status": "success", "message": f"Đã xóa tài liệu '{name}' khỏi Vector DB"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi khi xóa tài liệu: {e}")

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
            import docx
            doc = docx.Document(temp_file_path)
            text_content = "\n".join([p.text for p in doc.paragraphs])
        elif file_ext in [".xlsx", ".xls"]:
            import pandas as pd
            df_dict = pd.read_excel(temp_file_path, sheet_name=None)
            text_list = []
            for sheet_name, df in df_dict.items():
                text_list.append(f"Sheet: {sheet_name}\n" + df.to_string())
            text_content = "\n".join(text_list)
        else:
            raise HTTPException(status_code=400, detail="Định dạng file không hỗ trợ. Chỉ nhận TXT, JSON, PDF, DOCX, XLSX.")
    except Exception as e:
        # Dọn dẹp file temp
        if os.path.exists(temp_file_path):
            os.remove(temp_file_path)
        raise HTTPException(status_code=500, detail=f"Lỗi khi trích xuất nội dung file: {str(e)}")
    
    # Dọn dẹp file temp
    if os.path.exists(temp_file_path):
        os.remove(temp_file_path)
        
    if not text_content.strip() or len(text_content.strip()) < 10:
        raise HTTPException(status_code=400, detail="Nội dung file trống hoặc quá ngắn, không thể nạp vector.")

    # 3. Chia nhỏ văn bản (Chunking)
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

    # 4. Nạp vào ChromaDB
    documents = []
    metadatas = []
    ids = []
    upload_date = time.strftime("%d %b %Y")
    
    for idx, chunk in enumerate(chunks):
        documents.append(chunk)
        metadatas.append({
            "source_title": filename,
            "source_url": f"upload://{filename}",
            "type": file_ext.replace(".", "").upper(),
            "size_bytes": size_bytes,
            "upload_date": upload_date
        })
        ids.append(f"upload_{filename}_{int(time.time())}_{idx}")
        
    try:
        # Nạp theo lô nhỏ
        batch_size = 100
        for i in range(0, len(documents), batch_size):
            end_idx = min(i + batch_size, len(documents))
            bot.collection.add(
                documents=documents[i:end_idx],
                metadatas=metadatas[i:end_idx],
                ids=ids[i:end_idx]
            )
        return {
            "status": "success",
            "message": f"Đã nạp thành công tài liệu '{filename}'",
            "chunks_count": len(chunks),
            "size": f"{size_bytes / 1024:.1f} KB"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi khi nạp vector vào ChromaDB: {e}")
