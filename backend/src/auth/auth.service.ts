import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { SubscribersService } from '../subscribers/subscribers.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly subscribersService: SubscribersService,
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
      },
    };
  }
}

