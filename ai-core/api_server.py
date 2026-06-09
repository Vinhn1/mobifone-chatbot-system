from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from rag_pipeline import MobiFoneRAG

# Khởi tạo FastAPI app
app = FastAPI(title="MobiFone AI Service")

# Khởi tạo RAG bot (chỉ khởi tạo 1 lần khi server start)
bot = MobiFoneRAG()

# Định nghĩa schema request/response bằng Pydantic
class ChatRequest(BaseModel):
    message: str

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
        answer, sources = bot.answer_question(request.message)
        return ChatResponse(answer=answer, sources=sources)
    except Exception as e:
        error_msg = str(e)
        if "503" in error_msg:
            raise HTTPException(status_code=503, detail="AI đang quá tải, vui lòng thử lại sau ít giây.")
        elif "429" in error_msg:
            raise HTTPException(status_code=429, detail="Đã vượt giới hạn API, vui lòng thử lại sau.")
        else:
            raise HTTPException(status_code=500, detail=f"Lỗi hệ thống: {error_msg}")

