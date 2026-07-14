import { Controller, Post, Body, UnauthorizedException, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // Route POST /auth/login dùng để đăng nhập hệ thống Admin
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() body: any) {
    const { username, password } = body;
    
    // 1. Xác thực tài khoản
    const user = await this.authService.validateUser(username, password);
    if (!user) {
      throw new UnauthorizedException('Tài khoản hoặc mật khẩu không chính xác');
    }

    // 1b. Nếu đã kích hoạt 2FA, yêu cầu mã OTP
    if (user.twoFaEnabled) {
      await this.authService.sendLogin2FaOtp(user.id);
      return { require2fa: true, username: user.username };
    }

    // 2. Sinh và trả về JWT Token
    return this.authService.login(user);
  }

  // Route POST /auth/verify-2fa để hoàn tất đăng nhập sau khi nhập OTP
  @Post('verify-2fa')
  @HttpCode(HttpStatus.OK)
  async verify2Fa(@Body() body: any) {
    const { username, otpCode } = body;
    return await this.authService.verify2FaLogin(username, otpCode);
  }

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() body: any) {
    const { username, password, name } = body;
    return await this.authService.registerSubscriber(username, password, name);
  }

  // 1. Gửi OTP khôi phục mật khẩu qua Email
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  async forgotPassword(@Body('email') email: string) {
    return await this.authService.sendResetPasswordOtp(email);
  }

  // 2. Xác thực OTP khôi phục mật khẩu
  @Post('verify-reset-otp')
  @HttpCode(HttpStatus.OK)
  async verifyResetOtp(
    @Body('email') email: string,
    @Body('otpCode') otpCode: string,
  ) {
    return await this.authService.verifyResetPasswordOtp(email, otpCode);
  }

  // 3. Đặt lại mật khẩu mới sau khi xác thực OTP thành công
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  async resetPassword(
    @Body('email') email: string,
    @Body('otpCode') otpCode: string,
    @Body('password') pass: string,
  ) {
    return await this.authService.resetPassword(email, otpCode, pass);
  }
}


