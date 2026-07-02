import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChatHistoryService } from '../chat-history/chat-history.service';
import { LeadsService } from '../leads/leads.service';
import { NotificationsService } from '../notifications/notifications.service';
import { Package } from '../subscribers/package.entity';
import { Subscriber } from '../subscribers/subscriber.entity';
import * as https from 'https';


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
    @InjectRepository(Package)
    private readonly packageRepository: Repository<Package>,
    @InjectRepository(Subscriber)
    private readonly subscriberRepository: Repository<Subscriber>,
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

  async sendMessageToAi(message: string, sessionId?: string, userInfo?: any) {
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

    // Tự động tìm kiếm thông tin subscriber nếu userInfo chưa được truyền từ kênh chat
    if (!userInfo) {
      let phoneToSearch = extractedPhone;
      if (!phoneToSearch && sessionId) {
        // Quét lịch sử chat để tìm SĐT đã được nhập trước đó
        const chatLogs = await this.chatHistoryService.getHistory(sessionId, 20);
        for (const log of chatLogs) {
          if (log.role === 'user') {
            const found = this.extractPhoneNumber(log.message);
            if (found) {
              phoneToSearch = found;
              break;
            }
          }
        }
      }

      if (phoneToSearch) {
        try {
          const subscriber = await this.subscriberRepository.findOneBy({ phoneNumber: phoneToSearch });
          if (subscriber) {
            userInfo = {
              name: subscriber.name || `Khách hàng ${subscriber.phoneNumber.slice(-4)}`,
              phone: subscriber.phoneNumber,
              tier: 'Gold',
              package: subscriber.currentPackage || 'Không có gói',
              packageExpiry: subscriber.packageExpiry ? new Date(subscriber.packageExpiry).toLocaleDateString('vi-VN') : 'N/A'
            };
            console.log(`[AUTO-USERINFO] Đã tìm thấy subscriber tương ứng SĐT: ${phoneToSearch}`);
          }
        } catch (err) {
          console.error('Lỗi khi tự động lấy thông tin subscriber từ DB:', err.message);
        }
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
      // 2. Gửi sang AI Service kèm history và userInfo
      const response = await firstValueFrom(
        this.httpService.post(aiServiceUrl, { 
          message,
          history: historyPayload,
          userInfo
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
      
      const resultData = response.data;

      // Lưu trữ/đồng bộ hóa các gói cước trích xuất được từ tài liệu vào cơ sở dữ liệu
      if (resultData && resultData.packages && Array.isArray(resultData.packages)) {
        console.log(`[SYNC] Trích xuất được ${resultData.packages.length} gói cước từ file '${file.originalname}'. Bắt đầu đồng bộ...`);
        for (const pkg of resultData.packages) {
          if (!pkg.id) continue;
          
          try {
            const packageId = pkg.id.toUpperCase();
            
            // Upsert: kiểm tra xem gói cước đã tồn tại chưa
            let packageEntity = await this.packageRepository.findOneBy({ id: packageId });
            
            if (packageEntity) {
              console.log(`[SYNC] Gói cước ${packageId} đã tồn tại. Cập nhật thông tin mới.`);
              packageEntity.name = pkg.name || packageEntity.name;
              packageEntity.price = pkg.price || packageEntity.price;
              packageEntity.data = pkg.data || packageEntity.data;
              packageEntity.voice = pkg.voice || packageEntity.voice;
              packageEntity.validity = pkg.validity || packageEntity.validity;
              packageEntity.category = pkg.category || packageEntity.category;
              packageEntity.features = pkg.features || packageEntity.features;
              packageEntity.color = pkg.color || packageEntity.color;
              packageEntity.popular = pkg.popular !== undefined ? pkg.popular : packageEntity.popular;
              packageEntity.dataTotalGB = typeof pkg.dataTotalGB === 'number' ? pkg.dataTotalGB : packageEntity.dataTotalGB;
              packageEntity.voiceTotalMin = typeof pkg.voiceTotalMin === 'number' ? pkg.voiceTotalMin : packageEntity.voiceTotalMin;
            } else {
              console.log(`[SYNC] Tạo mới gói cước ${packageId}.`);
              packageEntity = this.packageRepository.create({
                id: packageId,
                name: pkg.name || pkg.id,
                price: pkg.price || '0đ',
                data: pkg.data || 'N/A',
                voice: pkg.voice || 'N/A',
                validity: pkg.validity || '30 ngày',
                category: pkg.category || 'data',
                features: pkg.features || [],
                color: pkg.color || '#0055A5',
                popular: pkg.popular || false,
                dataTotalGB: typeof pkg.dataTotalGB === 'number' ? pkg.dataTotalGB : 120,
                voiceTotalMin: typeof pkg.voiceTotalMin === 'number' ? pkg.voiceTotalMin : 600,
              });
            }
            
            await this.packageRepository.save(packageEntity);
            console.log(`[SYNC] Đã đồng bộ gói cước: ${packageId}`);
          } catch (syncErr) {
            console.error(`[SYNC-ERROR] Lỗi khi lưu gói cước ${pkg.id}:`, syncErr.message);
          }
        }
      }

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

      return resultData;
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

  // Làm sạch các định dạng markdown cho tin nhắn chat app (Messenger/Zalo)
  private cleanMarkdown(text: string): string {
    if (!text) return '';
    // 0. Đảm bảo xuống dòng trước các dấu gạch đầu dòng / chấm tròn nếu chúng đang viết liền trên cùng một dòng
    let cleaned = text.replace(/([\.\!\?\:])\s*[\-\–\—•\*]\s+/g, "$1\n\n- ");
    // 1. Chuyển các gạch đầu dòng dạng "* " hoặc "• " hoặc "– " hoặc "— " hoặc "+ " thành "- " để hiển thị chuẩn và đẹp trên Zalo
    cleaned = cleaned.replace(/^\s*[\*\-\–\—•\+]\s+/gm, '- ');
    // 2. Chuyển đổi các dòng gạch đầu dòng / danh sách số để ngăn cách bằng dòng trống (tránh dính liền)
    cleaned = cleaned.replace(/\n\s*([\-\+\•]\s+)/g, '\n\n- ');
    cleaned = cleaned.replace(/\n\s*(\d+\.\s+)/g, '\n\n$1');
    // Normalize newlines to avoid excessive blank lines
    cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
    // 3. Loại bỏ các dấu * dùng để in đậm/in nghiêng vì chat app (Zalo/FB) không hỗ trợ
    cleaned = cleaned.replace(/\*/g, '');
    return cleaned.trim();
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
    let answer = result?.answer || 'Xin lỗi, tôi gặp sự cố khi xử lý câu hỏi này.';

    // Làm sạch định dạng markdown/asterisks và định dạng gạch đầu dòng
    answer = this.cleanMarkdown(answer);

    // 3. Gửi tin nhắn trả lời qua Facebook Send API (chia nhỏ tin nhắn nếu dài hơn 2000 kí tự)
    const fbSendUrl = `https://graph.facebook.com/v18.0/me/messages?access_token=${fbPageToken}`;
    const chunks = this.splitMessage(answer, 2000);

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const isLastChunk = i === chunks.length - 1;
      const messagePayload: any = { text: chunk };

      // Đính kèm các câu hỏi gợi ý dạng Quick Replies ở chunk cuối cùng
      if (isLastChunk && result?.suggested_questions && Array.isArray(result.suggested_questions) && result.suggested_questions.length > 0) {
        messagePayload.quick_replies = result.suggested_questions.map((q: string) => ({
          content_type: 'text',
          title: q.length > 20 ? q.substring(0, 17) + '...' : q,
          payload: q
        }));
      }

      try {
        await firstValueFrom(
          this.httpService.post(fbSendUrl, {
            recipient: { id: senderId },
            messaging_type: 'RESPONSE',
            message: messagePayload
          }, {
            httpsAgent: new https.Agent({ rejectUnauthorized: false })
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

  // Hỗ trợ tự phân giải tên miền Zalo sang IP thực tế bằng DNS công cộng (Google & Cloudflare) để bỏ qua DNS bị hijack cục bộ
  private async resolveZaloDomain(domain: string): Promise<string> {
    return new Promise((resolve) => {
      try {
        const dns = require('dns');
        const resolver = new dns.Resolver();
        resolver.setServers(['8.8.8.8', '1.1.1.1']);
        resolver.resolve4(domain, (err, addresses) => {
          if (err || !addresses || addresses.length === 0) {
            // Dự phòng IP mặc định nếu lỗi phân giải
            if (domain === 'openapi.zalo.me') resolve('49.213.95.231');
            else if (domain === 'oauth.zaloapp.com') resolve('49.213.95.209');
            else resolve(domain);
          } else {
            resolve(addresses[0]);
          }
        });
      } catch (err) {
        console.error(`[ZALO-DNS] Lỗi khi tạo bộ phân giải DNS cho ${domain}:`, err.message);
        if (domain === 'openapi.zalo.me') resolve('49.213.95.231');
        else if (domain === 'oauth.zaloapp.com') resolve('49.213.95.209');
        else resolve(domain);
      }
    });
  }

  // Khởi tạo httpsAgent với cơ chế Custom DNS Lookup bypass DNS hijacking cục bộ
  private async getZaloHttpsAgent(): Promise<https.Agent> {
    const realOpenApiIp = await this.resolveZaloDomain('openapi.zalo.me');
    const realOAuthIp = await this.resolveZaloDomain('oauth.zaloapp.com');

    return new https.Agent({
      rejectUnauthorized: false,
      lookup: (hostname, options, callback) => {
        if (hostname === 'openapi.zalo.me') {
          if (options.all) {
            callback(null, [{ address: realOpenApiIp, family: 4 }]);
          } else {
            callback(null, realOpenApiIp, 4);
          }
        } else if (hostname === 'oauth.zaloapp.com') {
          if (options.all) {
            callback(null, [{ address: realOAuthIp, family: 4 }]);
          } else {
            callback(null, realOAuthIp, 4);
          }
        } else {
          const dns = require('dns');
          dns.lookup(hostname, options, callback);
        }
      }
    });
  }

  // Tự động làm mới access token của Zalo OA khi hết hạn
  async refreshZaloToken(config: any): Promise<string> {
    console.log('[ZALO-TOKEN] Đang tự động làm mới access token Zalo...');
    const url = 'https://oauth.zaloapp.com/v4/oa/access_token';

    const params = new URLSearchParams();
    params.append('refresh_token', config.zalo_refresh_token);
    params.append('app_id', config.zalo_app_id);
    params.append('grant_type', 'refresh_token');

    try {
      const zaloAgent = await this.getZaloHttpsAgent();
      const response = await firstValueFrom(
        this.httpService.post(url, params.toString(), {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'secret_key': config.zalo_secret_key
          },
          httpsAgent: zaloAgent
        })
      );

      const data = response.data;
      if (data && data.access_token && data.refresh_token) {
        console.log('[ZALO-TOKEN] Làm mới access token Zalo thành công!');
        const updatedConfig = {
          ...config,
          zalo_access_token: data.access_token,
          zalo_refresh_token: data.refresh_token
        };
        await this.updateRagConfig(updatedConfig);
        return data.access_token;
      } else {
        console.error('[ZALO-TOKEN] Phản hồi từ Zalo không hợp lệ:', JSON.stringify(data));
        throw new Error(data?.error_name || data?.message || 'Không có access token/refresh token');
      }
    } catch (error) {
      const errorDetail = error.response ? JSON.stringify(error.response.data) : error.message;
      console.error('[ZALO-TOKEN] Lỗi khi làm mới access token Zalo:', errorDetail);
      throw error;
    }
  }

  // Xử lý tin nhắn đến từ Zalo OA Webhook
  async handleZaloMessage(senderId: string, text: string) {
    console.log(`[ZALO-WEBHOOK] Nhận tin nhắn từ ${senderId}: "${text}"`);
    
    // 1. Lấy cấu hình động để kiểm tra xem Zalo có được bật hay không
    let config = await this.getRagConfig();
    if (!config?.zalo_enabled) {
      console.warn('[ZALO-WEBHOOK] Kênh Zalo OA hiện đang TẮT trong cấu hình.');
      return;
    }
    
    let zaloAccessToken = config.zalo_access_token;
    if (!zaloAccessToken) {
      console.error('[ZALO-WEBHOOK] Thiếu zalo_access_token trong cấu hình!');
      return;
    }

    // 2. Gọi AI sinh câu trả lời (lưu lịch sử chat theo format zalo_senderId)
    const result = await this.sendMessageToAi(text, `zalo_${senderId}`);
    let answer = result?.answer || 'Xin lỗi, tôi gặp sự cố khi xử lý câu hỏi này.';

    // Làm sạch định dạng markdown/asterisks và định dạng gạch đầu dòng
    answer = this.cleanMarkdown(answer);

    // 3. Gửi tin nhắn trả lời qua Zalo OpenAPI (chia nhỏ tin nhắn nếu dài hơn 2000 kí tự)
    const chunks = this.splitMessage(answer, 2000);
    const zaloSendUrl = 'https://openapi.zalo.me/v3.0/oa/message/cs';

    for (const chunk of chunks) {
      let currentToken = zaloAccessToken;
      
      try {
        const zaloAgent = await this.getZaloHttpsAgent();
        const sendRequest = async (tokenToUse: string) => {
          return await firstValueFrom(
            this.httpService.post(zaloSendUrl, {
              recipient: { user_id: senderId },
              message: { text: chunk }
            }, {
              headers: {
                'Content-Type': 'application/json',
                'access_token': tokenToUse
              },
              httpsAgent: zaloAgent
            })
          );
        };

        let response = await sendRequest(currentToken);
        
        // Zalo thỉnh thoảng trả về HTTP 200 kèm mã lỗi -216 trong body
        if (response.data && response.data.error === -216) {
          console.warn('[ZALO-WEBHOOK] Phát hiện token hết hạn (error -216) từ Zalo. Đang tự động làm mới token...');
          try {
            const newToken = await this.refreshZaloToken(config);
            currentToken = newToken;
            zaloAccessToken = newToken;
            config = await this.getRagConfig();
            
            console.log('[ZALO-WEBHOOK] Đang gửi lại tin nhắn với token mới...');
            const retryAgent = await this.getZaloHttpsAgent();
            response = await firstValueFrom(
              this.httpService.post(zaloSendUrl, {
                recipient: { user_id: senderId },
                message: { text: chunk }
              }, {
                headers: {
                  'Content-Type': 'application/json',
                  'access_token': newToken
                },
                httpsAgent: retryAgent
              })
            );
          } catch (refreshErr) {
            console.error('[ZALO-WEBHOOK] Không thể làm mới token Zalo OA để gửi lại:', refreshErr.message);
          }
        }

        if (response.data && response.data.error && response.data.error !== 0) {
          console.error('[ZALO-WEBHOOK] Phản hồi lỗi từ Zalo OpenAPI:', JSON.stringify(response.data));
        } else {
          console.log(`[ZALO-WEBHOOK] Đã phản hồi thành công một phần cho Zalo user ${senderId}`);
        }

      } catch (zaloError) {
        // Bắt lỗi HTTP status khác 200 (ví dụ 400/401 do token hết hạn)
        const responseData = zaloError.response?.data;
        if (responseData && (responseData.error === -216 || (responseData.error && responseData.error.code === -216))) {
          console.warn('[ZALO-WEBHOOK] Phát hiện token hết hạn (HTTP error -216) từ Zalo. Đang tự động làm mới token...');
          try {
            const newToken = await this.refreshZaloToken(config);
            zaloAccessToken = newToken;
            config = await this.getRagConfig();
            
            const retryAgent = await this.getZaloHttpsAgent();
            const retryResponse = await firstValueFrom(
              this.httpService.post(zaloSendUrl, {
                recipient: { user_id: senderId },
                message: { text: chunk }
              }, {
                headers: {
                  'Content-Type': 'application/json',
                  'access_token': newToken
                },
                httpsAgent: retryAgent
              })
            );
            
            if (retryResponse.data && retryResponse.data.error && retryResponse.data.error !== 0) {
              console.error('[ZALO-WEBHOOK] Phản hồi lỗi từ Zalo OpenAPI sau khi retry:', JSON.stringify(retryResponse.data));
            } else {
              console.log(`[ZALO-WEBHOOK] Đã phản hồi thành công một phần sau khi tự động refresh token cho Zalo user ${senderId}`);
            }
          } catch (retryErr) {
            console.error('[ZALO-WEBHOOK] Lỗi khi gửi lại tin nhắn Zalo sau khi refresh token:', retryErr.message);
          }
        } else {
          const errorDetail = zaloError.response 
            ? JSON.stringify(zaloError.response.data) 
            : zaloError.message;
          console.error('[ZALO-WEBHOOK] Lỗi khi gửi tin nhắn qua Zalo OpenAPI:', errorDetail);
        }
      }
    }
  }

  // Lấy gợi ý câu hỏi động từ AI Service
  async getDynamicSuggestions(): Promise<string[]> {
    const aiServiceUrl = this.getAiServiceUrl('/suggestions');
    try {
      const response = await firstValueFrom(
        this.httpService.get(aiServiceUrl, { timeout: this.aiRequestTimeoutMs })
      );
      return response.data;
    } catch (error) {
      console.warn('Lỗi khi lấy gợi ý động từ AI Service, dùng danh sách mặc định:', error.message);
      return [
        "Gói TK135 có gì?",
        "Đăng ký 5G?",
        "Xem ưu đãi hot",
        "Tư vấn gói phù hợp",
        "Hỗ trợ kỹ thuật"
      ];
    }
  }

  // Lấy ảnh trích xuất từ AI Service (Proxy)
  async getExtractedImage(filename: string): Promise<any> {
    const url = `${this.aiServiceBaseUrl}/static/extracted_images/${filename}`;
    try {
      const response = await firstValueFrom(
        this.httpService.get(url, { responseType: 'arraybuffer', timeout: this.aiRequestTimeoutMs })
      );
      return response.data;
    } catch (error) {
      this.handleAiServiceError(error, `Lỗi khi lấy ảnh trích xuất ${filename}`);
    }
  }
}

