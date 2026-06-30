import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        ExtractJwt.fromAuthHeaderAsBearerToken(),
        (req: any) => {
          return req?.query?.token || null;
        }
      ]),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET') || 'default_secret_key',
    });
  }

  // Hàm này tự động chạy sau khi Passport giải mã token thành công
  async validate(payload: any) {
    // Giá trị trả về ở đây sẽ được gán vào request.user
    return {
      userId: payload.sub,
      username: payload.username,
      phoneNumber: payload.phoneNumber,
      role: payload.role || 'user',
    };
  }
}
