import { Controller, Get, Post, Delete, Param, Res, HttpStatus, Req, UseGuards, UseInterceptors, UploadedFile, Body, HttpException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AppService } from './app.service';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { RolesGuard } from './auth/guards/roles.guard';
import { Roles } from './auth/guards/roles.decorator';
import * as express from 'express';
import * as fs from 'fs';
import * as path from 'path';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  // Lấy danh sách các file xác thực Zalo đang có trên server
  @Get(['zalo_verifier/list', 'api/zalo_verifier/list'])
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'sales')
  async listZaloVerifiers() {
    try {
      const rootDir = process.cwd();
      const files = fs.readdirSync(rootDir);
      const verifierFiles = files.filter(f => f.startsWith('zalo_verifier') && f.endsWith('.html'));

      const result = verifierFiles.map(filename => {
        const filePath = path.join(rootDir, filename);
        const stats = fs.statSync(filePath);
        let content = '';
        try {
          content = fs.readFileSync(filePath, 'utf-8');
        } catch (_) {}

        return {
          filename,
          size: stats.size,
          updatedAt: stats.mtime,
          content,
          url: `/${filename}`,
        };
      });

      return { success: true, files: result };
    } catch (error) {
      throw new HttpException('Lỗi khi lấy danh sách file xác thực', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // Upload hoặc lưu thủ công file xác thực Zalo (HTML)
  @Post(['zalo_verifier/upload', 'api/zalo_verifier/upload'])
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @UseInterceptors(FileInterceptor('file'))
  async uploadZaloVerifier(
    @UploadedFile() file?: any,
    @Body('filename') bodyFilename?: string,
    @Body('content') bodyContent?: string,
  ) {
    let targetFilename = '';
    let targetContent = '';

    if (file) {
      targetFilename = file.originalname;
      targetContent = file.buffer.toString('utf-8');
    } else if (bodyFilename && bodyContent) {
      targetFilename = bodyFilename;
      targetContent = bodyContent;
    } else if (bodyFilename) {
      targetFilename = bodyFilename;
      targetContent = bodyFilename.replace('.html', '');
    } else {
      throw new HttpException('Vui lòng tải lên file HTML hoặc nhập Tên file + Nội dung xác thực', HttpStatus.BAD_REQUEST);
    }

    // Chuẩn hóa tên file format zalo_verifier....html
    targetFilename = targetFilename.trim();
    if (!targetFilename.endsWith('.html')) targetFilename += '.html';
    if (!targetFilename.startsWith('zalo_verifier')) {
      targetFilename = `zalo_verifier${targetFilename.startsWith('_') ? '' : '_'}${targetFilename}`;
    }

    try {
      const targetPath = path.join(process.cwd(), targetFilename);
      fs.writeFileSync(targetPath, targetContent, 'utf-8');

      // Lưu thêm vào thư mục cha và public nếu có
      const parentPath = path.join(process.cwd(), '..', targetFilename);
      try {
        fs.writeFileSync(parentPath, targetContent, 'utf-8');
      } catch (_) {}

      return {
        success: true,
        message: 'Lưu file xác thực Zalo thành công',
        filename: targetFilename,
        url: `/${targetFilename}`,
      };
    } catch (error) {
      throw new HttpException('Không thể lưu file xác thực trên server', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // Xóa file xác thực Zalo
  @Delete(['zalo_verifier/:filename', 'api/zalo_verifier/:filename'])
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  async deleteZaloVerifier(@Param('filename') filename: string) {
    if (!filename || !filename.startsWith('zalo_verifier')) {
      throw new HttpException('Tên file không hợp lệ', HttpStatus.BAD_REQUEST);
    }

    const pathsToDelete = [
      path.join(process.cwd(), filename),
      path.join(process.cwd(), '..', filename),
    ];

    let deleted = false;
    for (const p of pathsToDelete) {
      if (fs.existsSync(p)) {
        try {
          fs.unlinkSync(p);
          deleted = true;
        } catch (_) {}
      }
    }

    if (!deleted) {
      throw new HttpException('Không tìm thấy file để xóa', HttpStatus.NOT_FOUND);
    }

    return { success: true, message: 'Đã xóa file xác thực Zalo' };
  }

  // Route phục vụ Zalo Crawler khi truy cập /zalo_verifier...html
  @Get('zalo_verifier:code')
  async verifyZalo(
    @Req() req: express.Request,
    @Res() res: express.Response,
  ) {
    const filename = req.path.substring(1);
    const codeMatch = filename.match(/zalo_verifier(.*)\.html/);
    const code = codeMatch ? codeMatch[1] : '';

    const pathsToTry = [
      path.join(process.cwd(), filename),
      path.join(process.cwd(), '..', filename),
      path.join(__dirname, '..', filename),
    ];

    for (const p of pathsToTry) {
      if (fs.existsSync(p)) {
        const content = fs.readFileSync(p, 'utf-8');
        return res.status(HttpStatus.OK).header('Content-Type', 'text/html').send(content);
      }
    }

    // Fallback: trả về mã code nếu không tìm thấy file vật lý
    return res.status(HttpStatus.OK).header('Content-Type', 'text/html').send(code);
  }
}
