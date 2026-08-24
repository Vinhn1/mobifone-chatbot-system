import { Controller, Post, Get, Body, HttpException, HttpStatus, UseGuards, UseInterceptors, UploadedFile, Param, Delete, Res, Query } from '@nestjs/common';
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

  @Get('session/:sessionId/mode') // Lấy trạng thái session mode ('bot' | 'human')
  async getSessionMode(@Param('sessionId') sessionId: string) {
    if (!sessionId) {
      throw new HttpException('Session ID không được trống', HttpStatus.BAD_REQUEST);
    }
    const mode = await this.chatService.getSessionMode(sessionId);
    return { sessionId, mode };
  }

  @Post('session/:sessionId/mode') // Đổi trạng thái session mode thủ công (Admin/Sales)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'sales')
  async setSessionMode(
    @Param('sessionId') sessionId: string,
    @Body('mode') mode: 'bot' | 'human',
  ) {
    if (!sessionId || !mode || (mode !== 'bot' && mode !== 'human')) {
      throw new HttpException('Vui lòng truyền sessionId và mode hợp lệ (bot/human)', HttpStatus.BAD_REQUEST);
    }
    try {
      return await this.chatService.setSessionMode(sessionId, mode);
    } catch (error) {
      throw new HttpException(
        error.message || 'Lỗi đổi trạng thái session',
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
  @Roles('admin', 'sales')
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
  @Roles('admin', 'sales')
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
  @Roles('admin', 'sales')
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

  @Delete('documents') // Xóa tài liệu qua Query parameter
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'sales')
  async deleteDocumentByQuery(@Query('name') name: string) {
    try {
      return await this.chatService.deleteDocument(name);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Delete('documents/*name') // Xóa tài liệu (wildcard match cho URL có dấu /)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'sales')
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


  @Post('ingest-url') // Crawl một trang web MobiFone và nạp nội dung vào Knowledge Base
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'sales')
  async ingestFromUrl(
    @Body('url') url: string,
    @Body('cookies') cookies?: string,
    @Body('deep_crawl') deep_crawl?: boolean,
  ) {
    if (!url || !url.trim()) {
      throw new HttpException('URL không được để trống', HttpStatus.BAD_REQUEST);
    }
    // Validate định dạng URL cơ bản trước khi gửi xuống AI Service
    const trimmedUrl = url.trim();
    const urlToValidate = trimmedUrl.startsWith('http') ? trimmedUrl : `https://${trimmedUrl}`;
    try {
      new URL(urlToValidate);
    } catch {
      throw new HttpException('URL không hợp lệ', HttpStatus.BAD_REQUEST);
    }
    try {
      return await this.chatService.ingestFromUrl(trimmedUrl, cookies, deep_crawl);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('documents/web-chunks') // Lấy danh sách các đoạn chunks từ trang web (Bảo mật: Chỉ WEB)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'sales')
  async getWebDocumentChunks(@Query('name') name: string) {
    if (!name || !name.trim()) {
      throw new HttpException('Tên tài liệu / URL không được để trống', HttpStatus.BAD_REQUEST);
    }
    try {
      return await this.chatService.getWebDocumentChunks(name.trim());
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Post('ingest-html') // Nạp trực tiếp nội dung HTML/DOM từ trình duyệt
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'sales')
  async ingestFromHtml(
    @Body('source_title') sourceTitle: string,
    @Body('html_content') htmlContent: string,
    @Body('source_url') sourceUrl?: string,
  ) {
    if (!htmlContent || !htmlContent.trim()) {
      throw new HttpException('Nội dung HTML không được để trống', HttpStatus.BAD_REQUEST);
    }
    try {
      return await this.chatService.ingestFromHtml(sourceTitle || 'Trang web DOM', htmlContent, sourceUrl);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Post('upload') // Tải lên tài liệu mới (PDF, TXT, WORD, EXCEL) hoặc file chat mẫu
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'sales')
  @UseInterceptors(FileInterceptor('file', {
    limits: { fileSize: 100 * 1024 * 1024 } // Giới hạn 100MB
  }))
  async uploadFile(@UploadedFile() file: any, @Body('ingest_type') ingestType: string) {
    if (!file) {
      throw new HttpException('Vui lòng tải lên 1 file hợp lệ', HttpStatus.BAD_REQUEST);
    }
    const type: 'rag' | 'conversation' = ingestType === 'conversation' ? 'conversation' : 'rag';
    try {
      return await this.chatService.uploadDocument(file, type);
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

  @Post('mining/parse-text')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'sales')
  async parseMiningText(@Body('raw_text') rawText: string) {
    if (!rawText) {
      throw new HttpException('Nội dung văn bản chat không được trống', HttpStatus.BAD_REQUEST);
    }
    return await this.chatService.parseMiningText(rawText);
  }

  @Post('mining/parse-file')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'sales')
  @UseInterceptors(FileInterceptor('file'))
  async parseMiningFile(@UploadedFile() file: any) {
    if (!file) {
      throw new HttpException('Vui lòng chọn file chat', HttpStatus.BAD_REQUEST);
    }
    return await this.chatService.parseMiningFile(file);
  }

  @Post('mining/approve-qa')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'sales')
  async approveMiningQa(@Body('qa_list') qaList: any[]) {
    if (!qaList || !Array.isArray(qaList)) {
      throw new HttpException('Danh sách Q&A không hợp lệ', HttpStatus.BAD_REQUEST);
    }
    return await this.chatService.approveMiningQa(qaList);
  }

  @Get('mining/playbooks')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'sales')
  async getMiningPlaybooks(@Query('stage') stage?: string) {
    return await this.chatService.getMiningPlaybooks(stage);
  }
}
