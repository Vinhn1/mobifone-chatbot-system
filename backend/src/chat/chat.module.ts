import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { ChatHistoryModule } from '../chat-history/chat-history.module';

@Module({
  imports: [HttpModule, ChatHistoryModule],
  controllers: [ChatController],
  providers: [ChatService]
})
export class ChatModule {}

