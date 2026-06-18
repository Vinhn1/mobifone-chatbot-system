import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { ChatHistoryService } from '../chat-history/chat-history.service';
import { LeadsService } from '../leads/leads.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class ChatService {
  private readonly aiServiceBaseUrl: string;
  private readonly aiRequestTimeoutMs: number;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    private readonly chatHistoryService: ChatHistoryService,
    private readonly leadsService: LeadsService,
    private readonly notificationsService: NotificationsService,
  ) {
    this.aiServiceBaseUrl = this.configService.get<string>('AI_SERVICE_BASE_URL', 'http://localhost:8001');
    this.aiRequestTimeoutMs = this.configService.get<number>('AI_SERVICE_TIMEOUT_MS', 60000);
  }

  private getAiServiceUrl(path: string): string {
    return `${this.aiServiceBaseUrl}${path}`;
  }

  private getAiErrorDetail(error: any, fallbackMessage: string): string {
    const responseData = error.response?.data;
    return responseData?.detail || responseData?.message || error.message || fallbackMessage;
  }

  private handleAiServiceError(error: any, context: string, fallbackMessage = 'Không thể kết nối đến AI Service.'): never {
    const status = error.response?.status || HttpStatus.SERVICE_UNAVAILABLE;
    const detail = this.getAiErrorDetail(error, fallbackMessage);
    console.error(`${context}:`, detail);
    throw new HttpException(detail, status);
  }

  // Hàm phụ trợ phát hiện và trích xuất SĐT Việt Nam bằng Regex
  private extractPhoneNumber(text: string): string | null {
    // Tìm SĐT dạng: 03x, 05x, 07x, 08x, 09x hoặc có mã quốc gia +84/84
    const phoneRegex = /(?:\+84|84|0)(3|5|7|8|9)[0-9]{8}\b/;
    const match = text.match(phoneRegex);
    return match ? match[0] : null;
  }

  async sendMessageToAi(message: string, sessionId?: string) {
    const aiServiceUrl = this.getAiServiceUrl('/chat');
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

    // Phát sự kiện tin nhắn User đến Admin Dashboard
    try {
      this.notificationsService.emitNotification('new-message', {
        sessionId: sessionId || 'anonymous',
        sender: 'user',
        message,
      });
    } catch (err) {
      console.error('Lỗi khi phát sự kiện user message:', err.message);
    }

    try {
      // 2. Gửi sang AI Service kèm history
      const response = await firstValueFrom(
        this.httpService.post(aiServiceUrl, { 
          message,
          history: historyPayload
        }, {
          timeout: this.aiRequestTimeoutMs,
        })
      );
      
      const result = response.data;
      
      // 3. Lưu phản hồi của Bot vào DB (nếu có sessionId)
      if (sessionId && result && result.answer) {
        await this.chatHistoryService.saveMessage(sessionId, 'bot', result.answer);
      }

      // Phát sự kiện tin nhắn Bot đến Admin Dashboard
      if (result && result.answer) {
        try {
          this.notificationsService.emitNotification('new-message', {
            sessionId: sessionId || 'anonymous',
            sender: 'bot',
            message: result.answer,
          });
        } catch (err) {
          console.error('Lỗi khi phát sự kiện bot reply:', err.message);
        }
      }

      return result;
    } catch (error) {
      this.handleAiServiceError(error, 'Lỗi khi kết nối với AI Service');
    }
  }

  // Lấy toàn bộ lịch sử chat cho Admin Dashboard
  async getAllHistory() {
    return await this.chatHistoryService.getAllHistory();
  }

  // Proxy: Lấy cấu hình RAG Prompt & Parameters từ AI Service
  async getRagConfig() {
    const aiServiceUrl = this.getAiServiceUrl('/config');
    try {
      const response = await firstValueFrom(this.httpService.get(aiServiceUrl, { timeout: this.aiRequestTimeoutMs }));
      return response.data;
    } catch (error) {
      this.handleAiServiceError(error, 'Lỗi khi lấy cấu hình từ AI Service');
    }
  }

  // Proxy: Cập nhật cấu hình RAG Prompt & Parameters sang AI Service
  async updateRagConfig(cfg: any) {
    const aiServiceUrl = this.getAiServiceUrl('/config');
    try {
      const response = await firstValueFrom(this.httpService.post(aiServiceUrl, cfg, { timeout: this.aiRequestTimeoutMs }));
      return response.data;
    } catch (error) {
      this.handleAiServiceError(error, 'Lỗi khi cập nhật cấu hình sang AI Service');
    }
  }

  // Proxy: Lấy danh sách tài liệu từ ChromaDB thông qua AI Service
  async getDocuments() {
    const aiServiceUrl = this.getAiServiceUrl('/documents');
    try {
      const response = await firstValueFrom(this.httpService.get(aiServiceUrl, { timeout: this.aiRequestTimeoutMs }));
      return response.data;
    } catch (error) {
      this.handleAiServiceError(error, 'Lỗi khi lấy danh sách tài liệu từ AI Service');
    }
  }

  // Proxy: Xóa tài liệu khỏi ChromaDB thông qua AI Service
  async deleteDocument(name: string) {
    const aiServiceUrl = this.getAiServiceUrl(`/documents/${encodeURIComponent(name)}`);
    try {
      const response = await firstValueFrom(this.httpService.delete(aiServiceUrl, { timeout: this.aiRequestTimeoutMs }));
      return response.data;
    } catch (error) {
      this.handleAiServiceError(error, 'Lỗi khi xóa tài liệu từ AI Service');
    }
  }

  // Proxy: Tải file tài liệu lên AI Service để nạp vector
  async uploadDocument(file: any) {
    const aiServiceUrl = this.getAiServiceUrl('/upload');
    
    // Phát trạng thái bắt đầu đồng bộ
    try {
      this.notificationsService.emitNotification('doc-status', {
        name: file.originalname,
        status: 'processing',
        progress: 30,
        message: 'Đang tải file và trích xuất dữ liệu...',
      });
    } catch (err) {
      console.error('Lỗi khi phát sự kiện bắt đầu nạp tài liệu:', err.message);
    }
    
    // Sử dụng standard Node.js/Web FormData
    const formData = new FormData();
    const blob = new Blob([file.buffer], { type: file.mimetype });
    formData.append('file', blob, file.originalname);

    try {
      const response = await firstValueFrom(
        this.httpService.post(aiServiceUrl, formData, { timeout: this.aiRequestTimeoutMs })
      );
      
      // Phát trạng thái đồng bộ thành công
      try {
        this.notificationsService.emitNotification('doc-status', {
          name: file.originalname,
          status: 'synced',
          progress: 100,
          message: 'Đã hoàn thành đồng bộ tri thức!',
        });
      } catch (err) {
        console.error('Lỗi khi phát sự kiện hoàn thành nạp tài liệu:', err.message);
      }

      return response.data;
    } catch (error) {
      // Phát trạng thái đồng bộ lỗi
      try {
        this.notificationsService.emitNotification('doc-status', {
          name: file.originalname,
          status: 'error',
          progress: 0,
          message: `Lỗi nạp tri thức: ${error.message || 'Lỗi kết nối AI Service'}`,
        });
      } catch (err) {
        console.error('Lỗi khi phát sự kiện thất bại nạp tài liệu:', err.message);
      }
      this.handleAiServiceError(error, 'Lỗi khi gửi file lên AI Service');
    }
  }

  // Hàm bổ trợ chia nhỏ tin nhắn nếu vượt quá giới hạn ký tự (ví dụ: 2000 ký tự của FB Messenger/Zalo)
  private splitMessage(text: string, maxLength = 2000): string[] {
    if (text.length <= maxLength) return [text];
    
    const chunks: string[] = [];
    let currentChunk = '';
    
    const lines = text.split('\n');
    for (const line of lines) {
      if ((currentChunk + '\n' + line).length > maxLength) {
        if (currentChunk) {
          chunks.push(currentChunk);
          currentChunk = '';
        }
        
        if (line.length > maxLength) {
          let tempLine = line;
          while (tempLine.length > maxLength) {
            chunks.push(tempLine.substring(0, maxLength));
            tempLine = tempLine.substring(maxLength);
          }
          currentChunk = tempLine;
        } else {
          currentChunk = line;
        }
      } else {
        currentChunk = currentChunk ? currentChunk + '\n' + line : line;
      }
    }
    
    if (currentChunk) {
      chunks.push(currentChunk);
    }
    
    return chunks;
  }

  // Xử lý tin nhắn đến từ Facebook Messenger Webhook
  async handleFacebookMessage(senderId: string, text: string) {
    console.log(`[FB-WEBHOOK] Nhận tin nhắn từ ${senderId}: "${text}"`);
    
    // 1. Lấy cấu hình động để kiểm tra xem Facebook có được bật hay không
    const config = await this.getRagConfig();
    if (!config?.fb_enabled) {
      console.warn('[FB-WEBHOOK] Kênh Facebook Messenger hiện đang TẮT trong cấu hình.');
      return;
    }
    
    const fbPageToken = config.fb_page_token;
    if (!fbPageToken) {
      console.error('[FB-WEBHOOK] Thiếu fb_page_token trong cấu hình!');
      return;
    }

    // 2. Gọi AI sinh câu trả lời (lưu lịch sử chat theo format facebook_senderId)
    const result = await this.sendMessageToAi(text, `facebook_${senderId}`);
    const answer = result?.answer || 'Xin lỗi, tôi gặp sự cố khi xử lý câu hỏi này.';

    // 3. Gửi tin nhắn trả lời qua Facebook Send API (chia nhỏ tin nhắn nếu dài hơn 2000 kí tự)
    const fbSendUrl = `https://graph.facebook.com/v18.0/me/messages?access_token=${fbPageToken}`;
    const chunks = this.splitMessage(answer, 2000);

    for (const chunk of chunks) {
      try {
        await firstValueFrom(
          this.httpService.post(fbSendUrl, {
            recipient: { id: senderId },
            messaging_type: 'RESPONSE',
            message: { text: chunk }
          })
        );
        console.log(`[FB-WEBHOOK] Đã phản hồi thành công một phần cho ${senderId}`);
      } catch (fbError) {
        const errorDetail = fbError.response 
          ? JSON.stringify(fbError.response.data) 
          : fbError.message;
        console.error('[FB-WEBHOOK] Lỗi khi gửi tin nhắn qua Facebook Send API:', errorDetail);
      }
    }
  }

  // Xử lý tin nhắn đến từ Zalo OA Webhook
  async handleZaloMessage(senderId: string, text: string) {
    console.log(`[ZALO-WEBHOOK] Nhận tin nhắn từ ${senderId}: "${text}"`);
    
    // 1. Lấy cấu hình động để kiểm tra xem Zalo có được bật hay không
    const config = await this.getRagConfig();
    if (!config?.zalo_enabled) {
      console.warn('[ZALO-WEBHOOK] Kênh Zalo OA hiện đang TẮT trong cấu hình.');
      return;
    }
    
    const zaloAccessToken = config.zalo_access_token;
    if (!zaloAccessToken) {
      console.error('[ZALO-WEBHOOK] Thiếu zalo_access_token trong cấu hình!');
      return;
    }

    // 2. Gọi AI sinh câu trả lời (lưu lịch sử chat theo format zalo_senderId)
    const result = await this.sendMessageToAi(text, `zalo_${senderId}`);
    const answer = result?.answer || 'Xin lỗi, tôi gặp sự cố khi xử lý câu hỏi này.';

    // 3. Gửi tin nhắn trả lời qua Zalo OpenAPI (chia nhỏ tin nhắn nếu dài hơn 2000 kí tự)
    const zaloSendUrl = 'https://openapi.zalo.me/v3.0/oa/message/transaction';
    const chunks = this.splitMessage(answer, 2000);

    for (const chunk of chunks) {
      try {
        await firstValueFrom(
          this.httpService.post(zaloSendUrl, {
            recipient: { user_id: senderId },
            message: { text: chunk }
          }, {
            headers: {
              'Content-Type': 'application/json',
              'access_token': zaloAccessToken
            }
          })
        );
        console.log(`[ZALO-WEBHOOK] Đã phản hồi thành công một phần cho Zalo user ${senderId}`);
      } catch (zaloError) {
        const errorDetail = zaloError.response 
          ? JSON.stringify(zaloError.response.data) 
          : zaloError.message;
        console.error('[ZALO-WEBHOOK] Lỗi khi gửi tin nhắn qua Zalo OpenAPI:', errorDetail);
      }
    }
  }
}

