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
      const host = res.req.headers.host || 'localhost:3000';
      const protocol = res.req.headers['x-forwarded-proto'] || res.req.protocol || 'http';
      const baseUrl = `${protocol}://${host}`;

      for (const entry of body.entry || []) {
        for (const event of entry.messaging || []) {
          if (event.message && event.message.text) {
            const senderId = event.sender.id;
            const text = event.message.text;
            // Gọi AI service và gửi trả lời bất đồng bộ
            this.chatService.handleFacebookMessage(senderId, text, baseUrl).catch(err => {
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
    const eventName = body?.event_name;
    console.log('[ZALO-WEBHOOK] Nhận sự kiện từ Zalo OA Webhook:', eventName, JSON.stringify(body).substring(0, 200));

    // Lấy senderId từ Zalo payload (ưu tiên body.sender.id hoặc user_id_by_app)
    const senderId = body?.sender?.id || body?.user_id_by_app || (eventName === 'oa_send_text' ? body?.recipient?.id : null);
    
    if (senderId) {
      let text: string | null = null;

      // Trích xuất nội dung dựa theo event_name của Zalo OA API
      if (eventName === 'user_send_text' || eventName === 'oa_send_text') {
        text = body?.message?.text || null;
      } else if (eventName === 'user_send_image') {
        text = body?.message?.text || '[Hình ảnh]';
      } else if (eventName === 'user_send_sticker') {
        text = '[Sticker]';
      } else if (eventName === 'user_send_gif') {
        text = '[GIF]';
      } else if (eventName === 'user_send_audio') {
        text = '[Tin nhắn thoại]';
      } else if (eventName === 'user_send_file') {
        text = body?.message?.text || '[Tệp đính kèm]';
      } else if (eventName === 'user_send_link') {
        text = body?.message?.text || '[Liên kết]';
      } else if (eventName === 'user_send_location') {
        text = '[Vị trí]';
      } else if (eventName === 'user_submit_info' || eventName === 'user_send_user_is_temp') {
        text = body?.message?.text || '[Thông tin khách hàng]';
      } else if (body?.message?.text) {
        // Fallback cho các loại sự kiện tin nhắn khác có chứa văn bản
        text = body.message.text;
      }

      if (text) {
        const host = res.req.headers.host || 'localhost:3000';
        const protocol = res.req.headers['x-forwarded-proto'] || res.req.protocol || 'http';
        const baseUrl = `${protocol}://${host}`;

        console.log(`[ZALO-WEBHOOK] Đang chuyển tin nhắn từ Zalo (${senderId}) sang ChatService: "${text}"`);
        // Gọi xử lý bất đồng bộ
        this.chatService.handleZaloMessage(senderId, text, baseUrl).catch(err => {
          console.error('[ZALO-WEBHOOK] Lỗi bất đồng bộ xử lý tin nhắn Zalo:', err);
        });
      } else {
        console.warn(`[ZALO-WEBHOOK] Không trích xuất được nội dung tin nhắn từ event: ${eventName}`);
      }
    } else {
      console.warn(`[ZALO-WEBHOOK] Bỏ qua sự kiện Zalo do thiếu senderId hoặc không phải tin nhắn: ${eventName}`);
    }

    return res.status(HttpStatus.OK).send('EVENT_RECEIVED');
  }
}
