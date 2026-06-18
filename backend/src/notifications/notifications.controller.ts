import { Controller, Sse, type MessageEvent, UseGuards } from '@nestjs/common';
import { type Observable } from 'rxjs';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Sse('sse')
  @UseGuards(JwtAuthGuard)
  getNotifications(): Observable<MessageEvent> {
    return this.notificationsService.getNotificationStream();
  }
}
