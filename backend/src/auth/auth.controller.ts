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

    // 2. Sinh và trả về JWT Token
    return this.authService.login(user);
  }
}

