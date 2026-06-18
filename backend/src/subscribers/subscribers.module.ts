import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { SubscribersController } from './subscribers.controller';
import { PackagesController } from './packages.controller';
import { SubscribersService } from './subscribers.service';
import { Subscriber } from './subscriber.entity';
import { Package } from './package.entity';

@Module({
  imports: [
    // Đăng ký Entity Subscriber và Package với TypeORM
    TypeOrmModule.forFeature([Subscriber, Package]),
    
    // Cấu hình JwtModule tương thích với AuthModule để xác thực đồng bộ
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET') || 'default_secret_key',
        signOptions: {
          expiresIn: configService.get<any>('JWT_EXPIRES_IN', '1d'),
        },
      }),
    }),
  ],
  controllers: [SubscribersController, PackagesController],
  providers: [SubscribersService],
  exports: [SubscribersService, TypeOrmModule],
})
export class SubscribersModule {}
