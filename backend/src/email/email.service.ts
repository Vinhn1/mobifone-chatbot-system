import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private transporter: nodemailer.Transporter | null = null;
  private readonly logger = new Logger(EmailService.name);

  constructor(private readonly configService: ConfigService) {
    const host = this.configService.get<string>('SMTP_HOST');
    const port = this.configService.get<number>('SMTP_PORT', 587);
    const user = this.configService.get<string>('SMTP_USER');
    const pass = this.configService.get<string>('SMTP_PASS');

    // Chỉ khởi tạo SMTP Transporter nếu cấu hình đầy đủ và không phải là placeholder mặc định
    if (host && user && pass && user !== 'your-gmail-account@gmail.com' && pass !== 'your-gmail-app-password') {
      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465, // true cho port 465, false cho các port khác như 587
        auth: {
          user,
          pass,
        },
      });
      this.logger.log('EmailService: Khởi tạo SMTP Transporter gửi mail thành công.');
    } else {
      this.logger.warn(
        'EmailService: Chưa cấu hình thông tin SMTP thực tế trong .env. Sử dụng cơ chế ghi LOG TERMINAL và FILE làm fallback.',
      );
    }
  }

  /**
   * Gửi email mã OTP xác thực tài khoản cho người dùng
   * @param to Địa chỉ email người nhận
   * @param otpCode Mã OTP 6 chữ số
   */
  async sendOtpEmail(to: string, otpCode: string): Promise<boolean> {
    const from = this.configService.get<string>('SMTP_FROM', '"MobiFone Chatbot Portal" <noreply@mobifone.vn>');
    const subject = '[MobiFone Mia] Mã xác thực đăng ký tài khoản';

    // Mẫu email thương hiệu MobiFone chuyên nghiệp
    const htmlContent = `
      <div style="font-family: 'Outfit', 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 25px; border: 1px solid #e2e8f0; border-radius: 20px; background-color: #ffffff; box-shadow: 0 4px 10px rgba(0,0,0,0.03);">
        <div style="text-align: center; margin-bottom: 25px;">
          <h2 style="color: #0055A5; margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px;">mobi<span style="color: #E4002B;">fone</span> Mia</h2>
          <p style="color: #718096; font-size: 12px; margin: 5px 0 0 0; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">Cổng thông tin xác thực Chatbot</p>
        </div>
        
        <div style="border-top: 2px solid #edf2f7; border-bottom: 2px solid #edf2f7; padding: 20px 0; margin-bottom: 20px;">
          <p style="color: #4a5568; font-size: 14px; line-height: 1.6; margin: 0 0 15px 0;">Kính chào Quý khách,</p>
          <p style="color: #4a5568; font-size: 14px; line-height: 1.6; margin: 0 0 20px 0;">Hệ thống nhận được yêu cầu xác thực tài khoản qua địa chỉ email này. Vui lòng nhập mã OTP dưới đây để hoàn tất quy trình xác minh:</p>
          
          <div style="text-align: center; margin: 25px 0; background: linear-gradient(135deg, #f7fafc 0%, #edf2f7 100%); padding: 15px; border-radius: 12px; border: 1px dashed #cbd5e0;">
            <span style="font-size: 32px; font-weight: 800; letter-spacing: 6px; color: #E4002B; display: inline-block; padding-left: 6px;">${otpCode}</span>
          </div>
          
          <p style="color: #e53e3e; font-size: 12px; font-weight: 600; margin: 0; text-align: center;">Mã xác thực có hiệu lực trong vòng 3 phút.</p>
        </div>
        
        <div style="text-align: center;">
          <p style="color: #a0aec0; font-size: 11px; margin: 0 0 5px 0; line-height: 1.5;">Nếu quý khách không yêu cầu mã này, vui lòng bỏ qua email hoặc liên hệ CSKH.</p>
          <p style="color: #a0aec0; font-size: 11px; margin: 0; font-weight: bold;">MobiFone © 2026. Bảo lưu mọi quyền.</p>
        </div>
      </div>
    `;

    if (this.transporter) {
      try {
        await this.transporter.sendMail({
          from,
          to,
          subject,
          html: htmlContent,
        });
        this.logger.log(`Gửi email OTP thành công tới: ${to}`);
        return true;
      } catch (error) {
        this.logger.error(`Lỗi gửi email tới ${to}:`, error);
        return false;
      }
    } else {
      // Fallback ghi log và tệp khi chạy thử nghiệm
      this.logger.warn('--------------------------------------------------');
      this.logger.warn(`[OTP MAIL LOG FALLBACK] Gửi tới: ${to}`);
      this.logger.warn(`Mã OTP: ${otpCode}`);
      this.logger.warn('--------------------------------------------------');

      try {
        const fs = require('fs');
        const path = require('path');
        const logDir = 'C:\\Users\\ADMIN\\.gemini\\antigravity\\brain\\ef8cf651-6d23-4735-9dc3-9b5e996ee3f0\\scratch';
        if (!fs.existsSync(logDir)) {
          fs.mkdirSync(logDir, { recursive: true });
        }
        fs.appendFileSync(
          path.join(logDir, 'email_otp.log'),
          `[${new Date().toLocaleString('vi-VN')}] To: ${to} | OTP: ${otpCode}\n`,
          'utf8'
        );
      } catch (logErr) {
        this.logger.error('Lỗi khi ghi tệp log OTP:', logErr);
      }
      return true;
    }
  }
}
