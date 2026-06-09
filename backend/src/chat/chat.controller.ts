import { Controller, Post, Body, HttpException, HttpStatus } from '@nestjs/common';
import { ChatService } from './chat.service';

// Định nghĩa route bắt đầu bằng /chat
@Controller('chat')
export class ChatController {
   constructor(private readonly chatService: ChatService) {}

  @Post() // Định nghĩa route POST /chat
  async handleChat(@Body('message') message: string) {
    if (!message) {
      throw new HttpException('Tin nhắn không được để trống', HttpStatus.BAD_REQUEST);
    }
    try {
      const result = await this.chatService.sendMessageToAi(message);
      return result;
    } catch (error) {
      throw new HttpException(
        error.message || 'Lỗi xử lý chat',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
}
