import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class ChatService {
    // Inject HttpService vào service này
  constructor(private readonly httpService: HttpService) {}
  async sendMessageToAi(message: string) {
    const aiServiceUrl = 'http://localhost:8001/chat';
    try {
      // Gửi request POST tới FastAPI và đợi kết quả bằng firstValueFrom
      const response = await firstValueFrom(
        this.httpService.post(aiServiceUrl, { message })
      );
      
      // Trả về dữ liệu nhận được từ FastAPI (gồm { answer, sources })
      return response.data;
    } catch (error) {
      // Log lỗi và quăng lỗi ra ngoài
      console.error('Lỗi khi kết nối với AI Service:', error.message);
      throw new Error('Không thể kết nối đến AI Service.');
    }
  }
}
