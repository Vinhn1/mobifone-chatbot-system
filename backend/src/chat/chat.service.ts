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
}


