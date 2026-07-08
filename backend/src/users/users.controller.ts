import { Controller, Get, Patch, Post, Body, UseGuards, Request, HttpCode, HttpStatus } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/guards/roles.decorator';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin', 'sales')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // 1. Lấy thông tin admin đã đăng nhập
  @Get('me')
  async getProfile(@Request() req: any) {
    // req.user được gán tự động sau khi qua JwtAuthGuard (chứa userId, username, role)
    const profile = await this.usersService.getProfile(req.user.userId);
    // Loại bỏ trường password khi phản hồi về
    const { password, ...result } = profile;
    return result;
  }

  // 2. Cập nhật thông tin cá nhân của admin
  @Patch('profile')
  @HttpCode(HttpStatus.OK)
  async updateProfile(
    @Request() req: any,
    @Body() profileData: any,
  ) {
    const updatedUser = await this.usersService.updateProfile(req.user.userId, profileData);
    const { password, ...result } = updatedUser;
    return result;
  }

  // 3. Đổi mật khẩu admin
  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  async changePassword(
    @Request() req: any,
    @Body() dto: any,
  ) {
    return await this.usersService.changePassword(req.user.userId, dto);
  }

  // 4. Gửi OTP xác thực bật/tắt 2FA
  @Post('2fa/request')
  @HttpCode(HttpStatus.OK)
  async request2FaOtp(@Request() req: any) {
    return await this.usersService.request2FaOtp(req.user.userId);
  }

  // 5. Xác nhận bật/tắt 2FA
  @Post('2fa/toggle')
  @HttpCode(HttpStatus.OK)
  async toggle2Fa(
    @Request() req: any,
    @Body('otpCode') otpCode: string,
  ) {
    return await this.usersService.toggle2Fa(req.user.userId, otpCode);
  }

  // 6. Gửi OTP đổi số điện thoại
  @Post('phone/request')
  @HttpCode(HttpStatus.OK)
  async requestPhoneChangeOtp(
    @Request() req: any,
    @Body('phone') phone: string,
  ) {
    return await this.usersService.requestPhoneChangeOtp(req.user.userId, phone);
  }

  // 7. Xác nhận đổi số điện thoại bằng OTP
  @Post('phone/verify')
  @HttpCode(HttpStatus.OK)
  async verifyPhoneChange(
    @Request() req: any,
    @Body() body: any,
  ) {
    const { phone, otpCode } = body;
    return await this.usersService.verifyPhoneChange(req.user.userId, phone, otpCode);
  }
}

