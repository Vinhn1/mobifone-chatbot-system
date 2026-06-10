import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { ChatHistoryService } from '../chat-history/chat-history.service';

@Injectable()
export class ChatService {
  constructor(
    private readonly httpService: HttpService,
    private readonly chatHistoryService: ChatHistoryService,
  ) {}

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
}

