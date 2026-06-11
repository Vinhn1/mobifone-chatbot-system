import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { ChatHistoryService } from '../chat-history/chat-history.service';
import { LeadsService } from '../leads/leads.service';

@Injectable()
export class ChatService {
  constructor(
    private readonly httpService: HttpService,
    private readonly chatHistoryService: ChatHistoryService,
    private readonly leadsService: LeadsService,
  ) {}

  // Hàm phụ trợ phát hiện và trích xuất SĐT Việt Nam bằng Regex
  private extractPhoneNumber(text: string): string | null {
    // Tìm SĐT dạng: 03x, 05x, 07x, 08x, 09x hoặc có mã quốc gia +84/84
    const phoneRegex = /(?:\+84|84|0)(3|5|7|8|9)[0-9]{8}\b/;
    const match = text.match(phoneRegex);
    return match ? match[0] : null;
  }

  async sendMessageToAi(message: string, sessionId?: string) {
    const aiServiceUrl = 'http://localhost:8001/chat';
    let historyPayload: { role: string; message: string }[] = [];

    // 1. Lấy lịch sử hội thoại trước đó (nếu có sessionId)
    if (sessionId) {
      const chatLogs = await this.chatHistoryService.getHistory(sessionId, 10);
      historyPayload = chatLogs.map(log => ({
        role: log.role,
        message: log.message,
      }));

      // Lưu tin nhắn hiện tại của User vào DB
      await this.chatHistoryService.saveMessage(sessionId, 'user', message);
    }

    // 1.5 Tự động quét và trích xuất Lead (SĐT khách hàng) từ nội dung tin nhắn
    const extractedPhone = this.extractPhoneNumber(message);
    if (extractedPhone) {
      try {
        await this.leadsService.createLead({
          phone: extractedPhone,
          interest: `Trích xuất từ phiên chat: ${sessionId || 'Ẩn danh'}. Câu hỏi: "${message.substring(0, 100)}"`,
        });
        console.log(`[AUTO-LEAD] Đã tự động tạo Lead cho SĐT: ${extractedPhone}`);
      } catch (leadError) {
        console.error('Lỗi khi tự động lưu Lead từ tin nhắn chat:', leadError.message);
      }
    }

    try {
      // 2. Gửi sang AI Service kèm history
      const response = await firstValueFrom(
        this.httpService.post(aiServiceUrl, { 
          message,
          history: historyPayload
        })
      );
      
      const result = response.data;
      
      // 3. Lưu phản hồi của Bot vào DB (nếu có sessionId)
      if (sessionId && result && result.answer) {
        await this.chatHistoryService.saveMessage(sessionId, 'bot', result.answer);
      }

      return result;
    } catch (error) {
      console.error('Lỗi khi kết nối với AI Service:', error.message);
      throw new Error('Không thể kết nối đến AI Service.');
    }
  }

  // Lấy toàn bộ lịch sử chat cho Admin Dashboard
  async getAllHistory() {
    return await this.chatHistoryService.getAllHistory();
  }

  // Proxy: Lấy cấu hình RAG Prompt & Parameters từ AI Service
  async getRagConfig() {
    const aiServiceUrl = 'http://localhost:8001/config';
    try {
      const response = await firstValueFrom(this.httpService.get(aiServiceUrl));
      return response.data;
    } catch (error) {
      console.error('Lỗi khi lấy cấu hình từ AI Service:', error.message);
      throw new Error('Không thể kết nối đến AI Service.');
    }
  }

  // Proxy: Cập nhật cấu hình RAG Prompt & Parameters sang AI Service
  async updateRagConfig(cfg: any) {
    const aiServiceUrl = 'http://localhost:8001/config';
    try {
      const response = await firstValueFrom(this.httpService.post(aiServiceUrl, cfg));
      return response.data;
    } catch (error) {
      console.error('Lỗi khi cập nhật cấu hình sang AI Service:', error.message);
      throw new Error('Không thể kết nối đến AI Service.');
    }
  }

  // Proxy: Lấy danh sách tài liệu từ ChromaDB thông qua AI Service
  async getDocuments() {
    const aiServiceUrl = 'http://localhost:8001/documents';
    try {
      const response = await firstValueFrom(this.httpService.get(aiServiceUrl));
      return response.data;
    } catch (error) {
      console.error('Lỗi khi lấy danh sách tài liệu từ AI Service:', error.message);
      throw new Error('Không thể kết nối đến AI Service.');
    }
  }

  // Proxy: Xóa tài liệu khỏi ChromaDB thông qua AI Service
  async deleteDocument(name: string) {
    const aiServiceUrl = `http://localhost:8001/documents/${encodeURIComponent(name)}`;
    try {
      const response = await firstValueFrom(this.httpService.delete(aiServiceUrl));
      return response.data;
    } catch (error) {
      console.error('Lỗi khi xóa tài liệu từ AI Service:', error.message);
      throw new Error('Không thể kết nối đến AI Service.');
    }
  }

  // Proxy: Tải file tài liệu lên AI Service để nạp vector
  async uploadDocument(file: any) {
    const aiServiceUrl = 'http://localhost:8001/upload';
    
    // Sử dụng standard Node.js/Web FormData
    const formData = new FormData();
    const blob = new Blob([file.buffer], { type: file.mimetype });
    formData.append('file', blob, file.originalname);

    try {
      const response = await firstValueFrom(
        this.httpService.post(aiServiceUrl, formData)
      );
      return response.data;
    } catch (error) {
      const details = error.response?.data?.detail || error.message;
      console.error('Lỗi khi gửi file lên AI Service:', details);
      throw new Error(details);
    }
  }
}


