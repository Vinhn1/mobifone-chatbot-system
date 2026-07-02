import { Controller, Post, Get, Body, HttpException, HttpStatus, UseGuards, UseInterceptors, UploadedFile, Param, Delete, Res } from '@nestjs/common';
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
    @Body('userInfo') userInfo?: any,
  ) {
    if (!message) {
      throw new HttpException('Tin nhắn không được để trống', HttpStatus.BAD_REQUEST);
    }
    try {
      const result = await this.chatService.sendMessageToAi(message, sessionId, userInfo);
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

  @Get('suggestions') // Lấy gợi ý câu hỏi động từ AI Service (không yêu cầu JWT để Widget dùng)
  async getSuggestions() {
    try {
      return await this.chatService.getDynamicSuggestions();
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('public-config') // Lấy cấu hình công khai (Facebook/Zalo) cho Chat Widget (không yêu cầu JWT)
  async getPublicConfig() {
    try {
      const config = await this.chatService.getRagConfig();
      return {
        fb_enabled: config?.fb_enabled ?? false,
        fb_page_id: config?.fb_page_id ?? '',
        zalo_enabled: config?.zalo_enabled ?? false,
        zalo_oa_id: config?.zalo_oa_id ?? '',
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('images/:filename') // Lấy ảnh trích xuất từ tài liệu (không yêu cầu JWT để Widget hiển thị)
  async getExtractedImage(@Param('filename') filename: string, @Res() res: any) {
    try {
      const buffer = await this.chatService.getExtractedImage(filename);
      let contentType = 'image/png';
      if (filename.toLowerCase().endsWith('.jpg') || filename.toLowerCase().endsWith('.jpeg')) {
        contentType = 'image/jpeg';
      } else if (filename.toLowerCase().endsWith('.gif')) {
        contentType = 'image/gif';
      } else if (filename.toLowerCase().endsWith('.svg')) {
        contentType = 'image/svg+xml';
      }
      res.setHeader('Content-Type', contentType);
      res.send(Buffer.from(buffer));
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
