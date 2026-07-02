import { Controller, Get, Patch, Body, UseGuards, Request, HttpCode, HttpStatus } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // 1. Lấy thông tin admin đã đăng nhập
  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getProfile(@Request() req: any) {
    // req.user được gán tự động sau khi qua JwtAuthGuard (chứa userId, username, role)
    const profile = await this.usersService.getProfile(req.user.userId);
    // Loại bỏ trường password khi phản hồi về
    const { password, ...result } = profile;
    return result;
  }

  // 2. Cập nhật thông tin cá nhân của admin
  @UseGuards(JwtAuthGuard)
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
}
