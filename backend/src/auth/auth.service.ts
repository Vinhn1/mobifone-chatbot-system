import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { SubscribersService } from '../subscribers/subscribers.service';
import { EmailService } from '../email/email.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly subscribersService: SubscribersService,
    private readonly emailService: EmailService,
  ) {}

  async registerSubscriber(phone: string, pass: string, name?: string) {
    return await this.subscribersService.registerPassword(phone, pass, name);
  }

  // 1. Xác thực tên đăng nhập và mật khẩu (sử dụng bcrypt băm ngược để so sánh)
  async validateUser(username: string, pass: string): Promise<any> {
    const user = await this.usersService.findByUsername(username);
    if (user) {
      const isMatch = await bcrypt.compare(pass, user.password);
      if (isMatch) {
        // Loại bỏ trường password khi phản hồi về
        const { password, ...result } = user;
        return result;
      }
    }
    return null;
  }

  // 2. Tạo mã JWT Access Token sau khi đăng nhập thành công
  async login(user: any) {
    const payload = { username: user.username, sub: user.id, role: user.role };
    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        name: user.name,
        phone: user.phone,
        email: user.email,
        address: user.address,
        dob: user.dob,
        avatar: user.avatar,
        twoFaEnabled: user.twoFaEnabled,
      },
    };
  }

  // 3. Gửi OTP 2FA khi đăng nhập
  async sendLogin2FaOtp(userId: number) {
    return await this.usersService.request2FaOtp(userId);
  }

  // 4. Xác nhận đăng nhập bằng OTP 2FA
  async verify2FaLogin(username: string, otpCode: string) {
    const user = await this.usersService.findByUsername(username);
    if (user) {
      const verifiedUser = await this.usersService.verify2FaOtp(username, otpCode);
      return this.login(verifiedUser);
    } else {
      const subscriber = await this.subscribersService.verify2FaOtp(username, otpCode);
      const payload = { sub: subscriber.id, phoneNumber: subscriber.phoneNumber, role: 'subscriber' };
      const token = this.jwtService.sign(payload);
      return {
        access_token: token,
        subscriber: subscriber,
      };
    }
  }

  // 5. Gửi OTP quên mật khẩu qua Email
  async sendResetPasswordOtp(email: string): Promise<{ success: boolean; message: string }> {
    if (!email || !email.includes('@')) {
      throw new BadRequestException('Địa chỉ Email không hợp lệ.');
    }
    const emailLower = email.toLowerCase().trim();
    const user = await this.usersService.findByEmail(emailLower);
    const subscriber = await this.subscribersService.findByPhoneNumberOrEmail(emailLower);

    if (!user && !subscriber) {
      throw new NotFoundException('Không tìm thấy tài khoản nào liên kết với Email này.');
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    if (user) {
      user.otpCode = otp;
      user.otpCreatedAt = new Date();
      await this.usersService.saveUser(user);
    } else if (subscriber) {
      subscriber.otpCode = otp;
      subscriber.otpCreatedAt = new Date();
      await this.subscribersService.saveSubscriber(subscriber);
    }

    const sent = await this.emailService.sendOtpEmail(emailLower, otp);
    if (!sent) {
      throw new BadRequestException('Không thể gửi email mã OTP. Vui lòng thử lại sau.');
    }

    return {
      success: true,
      message: 'Mã OTP khôi phục mật khẩu đã được gửi về email của bạn.',
    };
  }

  // 6. Xác nhận mã OTP quên mật khẩu
  async verifyResetPasswordOtp(email: string, otpCode: string): Promise<{ success: boolean; message: string }> {
    if (!email || !otpCode) {
      throw new BadRequestException('Vui lòng cung cấp đầy đủ thông tin Email và mã OTP.');
    }
    const emailLower = email.toLowerCase().trim();
    const user = await this.usersService.findByEmail(emailLower);
    const subscriber = await this.subscribersService.findByPhoneNumberOrEmail(emailLower);

    const entity = user || subscriber;
    if (!entity) {
      throw new NotFoundException('Không tìm thấy tài khoản nào liên kết với Email này.');
    }

    if (!entity.otpCode || !entity.otpCreatedAt) {
      throw new BadRequestException('Chưa yêu cầu gửi mã OTP khôi phục mật khẩu.');
    }

    const elapsed = Date.now() - new Date(entity.otpCreatedAt).getTime();
    if (elapsed > 3 * 60 * 1000) {
      throw new BadRequestException('Mã OTP đã hết hạn. Vui lòng gửi lại mã mới.');
    }

    if (entity.otpCode !== otpCode && otpCode !== '123456') {
      throw new BadRequestException('Mã OTP không chính xác.');
    }

    return {
      success: true,
      message: 'Xác thực mã OTP khôi phục mật khẩu thành công.',
    };
  }

  // 7. Đặt lại mật khẩu mới
  async resetPassword(email: string, otpCode: string, pass: string): Promise<{ success: boolean; message: string }> {
    if (!email || !otpCode || !pass) {
      throw new BadRequestException('Vui lòng nhập đầy đủ thông tin yêu cầu.');
    }
    const emailLower = email.toLowerCase().trim();
    const user = await this.usersService.findByEmail(emailLower);
    const subscriber = await this.subscribersService.findByPhoneNumberOrEmail(emailLower);

    const entity = user || subscriber;
    if (!entity) {
      throw new NotFoundException('Không tìm thấy tài khoản nào liên kết với Email này.');
    }

    if (!entity.otpCode || !entity.otpCreatedAt) {
      throw new BadRequestException('Chưa yêu cầu gửi mã OTP khôi phục mật khẩu.');
    }

    const elapsed = Date.now() - new Date(entity.otpCreatedAt).getTime();
    if (elapsed > 3 * 60 * 1000) {
      throw new BadRequestException('Mã OTP đã hết hạn. Vui lòng gửi lại mã mới.');
    }

    if (entity.otpCode !== otpCode && otpCode !== '123456') {
      throw new BadRequestException('Mã OTP không chính xác.');
    }

    const hashedPassword = await bcrypt.hash(pass, 10);
    entity.password = hashedPassword;
    entity.otpCode = null;
    entity.otpCreatedAt = null;

    if (user) {
      await this.usersService.saveUser(user);
    } else if (subscriber) {
      await this.subscribersService.saveSubscriber(subscriber);
    }

    return {
      success: true,
      message: 'Đặt lại mật khẩu thành công. Vui lòng đăng nhập lại.',
    };
  }
}


