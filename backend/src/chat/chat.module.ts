import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { ChatHistoryModule } from '../chat-history/chat-history.module';
import { LeadsModule } from '../leads/leads.module';

@Module({
  imports: [HttpModule, ChatHistoryModule, LeadsModule],
  controllers: [ChatController],
  providers: [ChatService]
})
export class ChatModule {}


