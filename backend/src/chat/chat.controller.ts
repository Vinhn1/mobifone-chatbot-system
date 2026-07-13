import { Controller, Post, Get, Body, HttpException, HttpStatus, UseGuards, UseInterceptors, UploadedFile, Param, Delete, Res } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ChatService } from './chat.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/guards/roles.decorator';

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
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'sales')
  async getHistory() {
    return await this.chatService.getAllHistory();
  }

  @Get('history/:sessionId') // Lấy lịch sử chat của một session cụ thể (public cho widget)
  async getSessionHistory(@Param('sessionId') sessionId: string) {
    if (!sessionId) {
      throw new HttpException('Session ID không được trống', HttpStatus.BAD_REQUEST);
    }
    try {
      return await this.chatService.getSessionHistory(sessionId);
    } catch (error) {
      throw new HttpException(
        error.message || 'Lỗi lấy lịch sử chat',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Post('reply') // Sales/Admin gửi tin nhắn phản hồi thủ công
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'sales')
  async staffReply(
    @Body('sessionId') sessionId: string,
    @Body('message') message: string,
  ) {
    if (!sessionId || !message) {
      throw new HttpException('Thiếu sessionId hoặc message', HttpStatus.BAD_REQUEST);
    }
    try {
      return await this.chatService.sendStaffReply(sessionId, message);
    } catch (error) {
      throw new HttpException(
        error.message || 'Lỗi gửi phản hồi',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('config') // Lấy cấu hình RAG (Prompt + Params)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
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
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
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
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
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
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
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
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
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
