import { Controller, Get, Param, Patch, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { CurrentUser } from '../../common/decorators/roles.decorator';
import { successRes } from '../../common/helpers/success-res';

@ApiTags('notifications')
@ApiBearerAuth()
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get('unread-count')
  async unreadCount(@CurrentUser('id') userId: string) {
    const result = await this.notificationsService.countUnread(userId);
    return successRes(result);
  }

  @Get()
  async list(
    @CurrentUser('id') userId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const result = await this.notificationsService.listForUser(
      userId,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
    );
    return successRes(result);
  }

  @Patch(':id/read')
  async markRead(@CurrentUser('id') userId: string, @Param('id') id: string) {
    const notification = await this.notificationsService.markRead(userId, id);
    return successRes(notification, 'Marked as read');
  }

  @Patch('read-all')
  async markAllRead(@CurrentUser('id') userId: string) {
    const result = await this.notificationsService.markAllRead(userId);
    return successRes(result, 'All notifications marked as read');
  }
}
