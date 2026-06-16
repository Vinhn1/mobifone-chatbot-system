import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { ChatController } from './chat.controller';
import { WebhookController } from './webhook.controller';
import { ChatService } from './chat.service';
import { ChatHistoryModule } from '../chat-history/chat-history.module';
import { LeadsModule } from '../leads/leads.module';

@Module({
  imports: [HttpModule, ConfigModule, ChatHistoryModule, LeadsModule],
  controllers: [ChatController, WebhookController],
  providers: [ChatService]
})
export class ChatModule {}

