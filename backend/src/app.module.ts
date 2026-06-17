import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ChatModule } from './chat/chat.module';
import { LeadsModule } from './leads/leads.module';
import { ChatHistoryModule } from './chat-history/chat-history.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { SubscribersModule } from './subscribers/subscribers.module';

@Module({
  imports: [
    // 1. Load các biến môi trường từ file .env ra toàn app (isGlobal: true)
    ConfigModule.forRoot({
      isGlobal: true,
    }),

    // 2. Cấu hình kết nối PostgreSQL sử dụng các biến từ ConfigService
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get<string>('DB_HOST', 'localhost'),
        port: configService.get<number>('DB_PORT', 5432),
        username: configService.get<string>('DB_USERNAME'),
        password: configService.get<string>('DB_PASSWORD'),
        database: configService.get<string>('DB_DATABASE'),
        // Tự động quét và nạp tất cả các file có đuôi .entity.ts hoặc .entity.js
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        // Tự động đồng bộ hóa cấu trúc bảng trong Code với Database
        synchronize: true, 
      }),
    }),

    ChatModule,

    LeadsModule,

    ChatHistoryModule,

    UsersModule,

    AuthModule,

    SubscribersModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
