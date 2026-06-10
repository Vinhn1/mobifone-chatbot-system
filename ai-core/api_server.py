from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from rag_pipeline import MobiFoneRAG

# Khởi tạo FastAPI app
app = FastAPI(title="MobiFone AI Service")

# Khởi tạo RAG bot (chỉ khởi tạo 1 lần khi server start)
bot = MobiFoneRAG()

from typing import List, Optional

# Định nghĩa schema request/response bằng Pydantic
class MessageModel(BaseModel):
    role: str
    message: str

class ChatRequest(BaseModel):
    message: str
    history: Optional[List[MessageModel]] = None

class ChatResponse(BaseModel):
    answer: str
    sources: list


# Health check endpoint
@app.get("/health")
def health_check():
    count = bot.collection.count()
    return {"status": "ok", "knowledge_count": count}

# Chat endpoint - nhận câu hỏi, trả lời câu hỏi 
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

