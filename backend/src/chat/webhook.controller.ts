import { Controller, Get, Post, Body, Query, Res, HttpStatus } from '@nestjs/common';
import * as express from 'express';
import { ChatService } from './chat.service';

@Controller('chat/webhook')
export class WebhookController {
  constructor(private readonly chatService: ChatService) {}

  @Get('facebook')
  async verifyFacebook(
    @Query('hub.mode') mode: string,
    @Query('hub.verify_token') token: string,
    @Query('hub.challenge') challenge: string,
    @Res() res: express.Response,
  ) {
    console.log('[FB-WEBHOOK] Đang xác thực Webhook Facebook...');
    const config = await this.chatService.getRagConfig();
    const verifyToken = config?.fb_verify_token || 'my_secret_token';

    if (mode === 'subscribe' && token === verifyToken) {
      console.log('[FB-WEBHOOK] Xác thực Webhook Facebook thành công!');
      return res.status(HttpStatus.OK).send(challenge);
    } else {
      console.error('[FB-WEBHOOK] Xác thực Webhook Facebook thất bại! Token không khớp.');
      return res.sendStatus(HttpStatus.FORBIDDEN);
    }
  }

  @Post('facebook')
  async handleFacebookWebhook(@Body() body: any, @Res() res: express.Response) {
    if (body.object === 'page') {
      for (const entry of body.entry || []) {
        for (const event of entry.messaging || []) {
          if (event.message && event.message.text) {
            const senderId = event.sender.id;
            const text = event.message.text;
            // Gọi AI service và gửi trả lời bất đồng bộ
            this.chatService.handleFacebookMessage(senderId, text).catch(err => {
              console.error('[FB-WEBHOOK] Lỗi bất đồng bộ xử lý tin nhắn Facebook:', err);
            });
          }
        }
      }
      return res.status(HttpStatus.OK).send('EVENT_RECEIVED');
    } else {
      return res.sendStatus(HttpStatus.NOT_FOUND);
    }
  }

  @Post('zalo')
  async handleZaloWebhook(@Body() body: any, @Res() res: express.Response) {
    console.log('[ZALO-WEBHOOK] Nhận sự kiện từ Zalo OA Webhook:', body.event_name);
    
    // Zalo OA callback gửi tin nhắn text: user_send_text
    if (body.event_name === 'user_send_text' && body.message && body.message.text) {
      const senderId = body.sender.id;
      const text = body.message.text;
      
      // Gọi xử lý bất đồng bộ
      this.chatService.handleZaloMessage(senderId, text).catch(err => {
        console.error('[ZALO-WEBHOOK] Lỗi bất đồng bộ xử lý tin nhắn Zalo:', err);
      });
    }
    
    return res.status(HttpStatus.OK).send('EVENT_RECEIVED');
  }
}
