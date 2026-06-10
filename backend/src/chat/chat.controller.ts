import { Controller, Post, Get, Body, HttpException, HttpStatus, UseGuards } from '@nestjs/common';
import { ChatService } from './chat.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

// Định nghĩa route bắt đầu bằng /chat
@Controller('chat')
export class ChatController {
   constructor(private readonly chatService: ChatService) {}

  @Post() // Định nghĩa route POST /chat
  async handleChat(
    @Body('message') message: string,
    @Body('sessionId') sessionId?: string,
  ) {
    if (!message) {
      throw new HttpException('Tin nhắn không được để trống', HttpStatus.BAD_REQUEST);
    }
    try {
      const result = await this.chatService.sendMessageToAi(message, sessionId);
      return result;
    } catch (error) {
      throw new HttpException(
        error.message || 'Lỗi xử lý chat',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('history') // Định nghĩa route GET /chat/history (Admin Dashboard)
  @UseGuards(JwtAuthGuard)
  async getHistory() {
    return await this.chatService.getAllHistory();
  }
}

