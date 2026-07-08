import { Controller, Post, Get, Patch, Body, UseGuards, Request, HttpCode, HttpStatus, Param, BadRequestException } from '@nestjs/common';
import { SubscribersService } from './subscribers.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('subscribers')
export class SubscribersController {
  constructor(private readonly subscribersService: SubscribersService) {}

  // 1. Gửi OTP qua Email
  @Post('otp/send')
  @HttpCode(HttpStatus.OK)
  async sendOtp(
    @Body('email') email: string,
  ) {
    return await this.subscribersService.sendOtp(email);
  }

  // 2. Xác thực OTP và đăng nhập nhận JWT Token
  @Post('otp/verify')
  @HttpCode(HttpStatus.OK)
  async verifyOtp(
    @Body('email') email: string,
    @Body('otpCode') otpCode: string,
  ) {
    return await this.subscribersService.verifyOtp(email, otpCode);
  }

  // 2.1 Đăng nhập demo không cần OTP (Có hỗ trợ kiểm tra mật khẩu)
  @Post('login-demo')
  @HttpCode(HttpStatus.OK)
  async loginDemo(
    @Body('phoneNumber') phoneNumber: string,
    @Body('password') password?: string,
  ) {
    return await this.subscribersService.loginDemo(phoneNumber, password);
  }

  // 3. Lấy thông tin thuê bao đã đăng nhập
  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getProfile(@Request() req: any) {
    // req.user được gán tự động sau khi qua JwtAuthGuard
    return await this.subscribersService.getProfile(req.user.userId);
  }

  // 4. Kích hoạt/Đăng ký thử nghiệm gói cước trên DB
  @UseGuards(JwtAuthGuard)
  @Post('packages/register')
  @HttpCode(HttpStatus.OK)
  async registerPackage(
    @Request() req: any,
    @Body('packageCode') packageCode: string,
  ) {
    if (req.user.role === 'admin') {
      throw new BadRequestException('Tài khoản quản trị viên không thể thực hiện đăng ký gói cước di động.');
    }
    return await this.subscribersService.registerPackage(req.user.userId, packageCode);
  }

  // 5. Cập nhật thông tin cá nhân của thuê bao
  @UseGuards(JwtAuthGuard)
  @Patch('profile')
  @HttpCode(HttpStatus.OK)
  async updateProfile(
    @Request() req: any,
    @Body() profileData: any,
  ) {
    return await this.subscribersService.updateProfile(req.user.userId, profileData);
  }

  // 5.1 Đổi mật khẩu thuê bao
  @UseGuards(JwtAuthGuard)
  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  async changePassword(
    @Request() req: any,
    @Body() changePasswordDto: any,
  ) {
    return await this.subscribersService.changePassword(req.user.userId, changePasswordDto);
  }

  // 5.2 Gửi mã OTP yêu cầu bật/tắt 2FA
  @UseGuards(JwtAuthGuard)
  @Post('2fa/request')
  @HttpCode(HttpStatus.OK)
  async request2FaOtp(@Request() req: any) {
    return await this.subscribersService.request2FaOtp(req.user.userId);
  }

  // 5.3 Xác thực và bật/tắt 2FA
  @UseGuards(JwtAuthGuard)
  @Post('2fa/toggle')
  @HttpCode(HttpStatus.OK)
  async toggle2Fa(
    @Request() req: any,
    @Body('otpCode') otpCode: string,
  ) {
    return await this.subscribersService.toggle2Fa(req.user.userId, otpCode);
  }

  // 5.4 Gửi mã OTP yêu cầu đổi số điện thoại liên kết
  @UseGuards(JwtAuthGuard)
  @Post('phone/request')
  @HttpCode(HttpStatus.OK)
  async requestPhoneChangeOtp(
    @Request() req: any,
    @Body('newPhone') newPhone: string,
  ) {
    return await this.subscribersService.requestPhoneChangeOtp(req.user.userId, newPhone);
  }

  // 5.5 Xác nhận thay đổi số điện thoại liên kết
  @UseGuards(JwtAuthGuard)
  @Post('phone/verify')
  @HttpCode(HttpStatus.OK)
  async verifyPhoneChange(
    @Request() req: any,
    @Body('newPhone') newPhone: string,
    @Body('otpCode') otpCode: string,
  ) {
    return await this.subscribersService.verifyPhoneChange(req.user.userId, newPhone, otpCode);
  }

  // 6. Lấy toàn bộ danh sách thuê bao (Dành cho Admin)
  @UseGuards(JwtAuthGuard)
  @Get()
  async getAllSubscribers() {
    return await this.subscribersService.findAll();
  }

  // 7. Cập nhật thông tin thuê bao bất kỳ theo ID (Dành cho Admin)
  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  async adminUpdateSubscriber(
    @Param('id') id: string,
    @Body() updateData: any,
  ) {
    return await this.subscribersService.adminUpdateProfile(id, updateData);
  }
}
