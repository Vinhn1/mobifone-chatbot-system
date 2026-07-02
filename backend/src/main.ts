import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { json, urlencoded } from 'express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Kích hoạt CORS để cho phép Frontend (cổng 5173) gọi API
  app.enableCors();

  // Tăng giới hạn dung lượng body để hỗ trợ upload avatar ảnh dạng base64
  app.use(json({ limit: '10mb' }));
  app.use(urlencoded({ limit: '10mb', extended: true }));

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();

