import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { json, urlencoded } from 'express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Kích hoạt CORS với các domain được cấu hình trong biến môi trường
  const corsOrigins = process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(',')
    : ['http://localhost:5173', 'http://localhost:3000'];
  app.enableCors({
    origin: corsOrigins,
    credentials: true,
  });

  // Tăng giới hạn dung lượng body để hỗ trợ upload avatar ảnh dạng base64
  app.use(json({ limit: '10mb' }));
  app.use(urlencoded({ limit: '10mb', extended: true }));

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();

