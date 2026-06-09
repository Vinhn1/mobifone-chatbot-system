import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LeadsService } from './leads.service';
import { LeadsController } from './leads.controller';
import { Lead } from './leads.entity';

@Module({
  // Đăng ký Entity Lead để có thể dùng Repository ở Service bên dưới
  imports: [TypeOrmModule.forFeature([Lead])],
  controllers: [LeadsController],
  providers: [LeadsService],
  exports: [LeadsService], // Export để module khác (ví dụ: Chat) có thể import và dùng chung
})
export class LeadsModule {}
