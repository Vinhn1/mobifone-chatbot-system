import { Controller, Get, Param, Res, HttpStatus, Req } from '@nestjs/common';
import { AppService } from './app.service';
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
