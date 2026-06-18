import { Controller, Post, Get, Patch, Body, UseGuards, Request, HttpCode, HttpStatus, Param } from '@nestjs/common';
import { SubscribersService } from './subscribers.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('subscribers')
export class SubscribersController {
  constructor(private readonly subscribersService: SubscribersService) {}

  // 1. Gửi OTP đến số điện thoại di động
  @Post('otp/send')
  @HttpCode(HttpStatus.OK)
  async sendOtp(@Body('phoneNumber') phoneNumber: string) {
    return await this.subscribersService.sendOtp(phoneNumber);
  }

  // 2. Xác thực OTP và đăng nhập nhận JWT Token
  @Post('otp/verify')
  @HttpCode(HttpStatus.OK)
  async verifyOtp(
    @Body('phoneNumber') phoneNumber: string,
    @Body('otpCode') otpCode: string,
  ) {
    return await this.subscribersService.verifyOtp(phoneNumber, otpCode);
  }

  // 2.1 Đăng nhập demo không cần OTP
  @Post('login-demo')
  @HttpCode(HttpStatus.OK)
  async loginDemo(
    @Body('phoneNumber') phoneNumber: string,
  ) {
    return await this.subscribersService.loginDemo(phoneNumber);
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
