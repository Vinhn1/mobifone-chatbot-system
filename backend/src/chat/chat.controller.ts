import { Controller, Post, Get, Body, HttpException, HttpStatus, UseGuards, UseInterceptors, UploadedFile, Param, Delete } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
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
      if (error instanceof HttpException) {
        throw error;
      }
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

  @Get('config') // Lấy cấu hình RAG (Prompt + Params)
  @UseGuards(JwtAuthGuard)
  async getConfig() {
    try {
      return await this.chatService.getRagConfig();
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Post('config') // Cập nhật cấu hình RAG
  @UseGuards(JwtAuthGuard)
  async updateConfig(@Body() cfg: any) {
    try {
      return await this.chatService.updateRagConfig(cfg);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('documents') // Lấy danh sách tài liệu tri thức
  @UseGuards(JwtAuthGuard)
  async getDocuments() {
    try {
      return await this.chatService.getDocuments();
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Delete('documents/:name') // Xóa tài liệu khỏi tri thức
  @UseGuards(JwtAuthGuard)
  async deleteDocument(@Param('name') name: string) {
    try {
      return await this.chatService.deleteDocument(name);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Post('upload') // Tải lên tài liệu mới (PDF, TXT, WORD, EXCEL)
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(@UploadedFile() file: any) {
    if (!file) {
      throw new HttpException('Vui lòng tải lên 1 file hợp lệ', HttpStatus.BAD_REQUEST);
    }
    try {
      return await this.chatService.uploadDocument(file);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
