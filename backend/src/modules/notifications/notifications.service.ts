import { Injectable, Logger } from '@nestjs/common';
import { NotificationType } from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async create(
    userId: string,
    type: NotificationType,
    title: string,
    message: string,
  ) {
    const notification = await this.prisma.notification.create({
      data: { userId, type, title, message },
    });

    // Fire-and-forget: a Telegram outage must never fail the action that
    // triggered the notification.
    void this.deliverToTelegram(userId, title, message);
    return notification;
  }

  // Sends the notification to the user's Telegram chat when they've linked
  // the bot. Uses the Bot API over HTTP directly so this module doesn't
  // depend on TelegramModule (which itself depends on donations).
  private async deliverToTelegram(userId: string, title: string, message: string) {
    const token = this.config.get<string>('telegram.botToken');
    if (!this.config.get<boolean>('telegram.enabled') || !token) return;
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { telegramChatId: true, notificationsEnabled: true },
      });
      if (!user?.telegramChatId || !user.notificationsEnabled) return;

      const siteUrl = this.config.get<string>('siteUrl');
      const text = `🔔 ${title}\n\n${message}${siteUrl ? `\n\n${siteUrl}` : ''}`;
      const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: user.telegramChatId, text }),
      });
      if (!res.ok) this.logger.warn(`Telegram delivery failed: ${res.status}`);
    } catch (err) {
      this.logger.warn(`Telegram delivery failed: ${(err as Error).message}`);
    }
  }

  async countUnread(userId: string) {
    const unread = await this.prisma.notification.count({ where: { userId, isRead: false } });
    return { unread };
  }

  async listForUser(userId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [rows, count] = await Promise.all([
      this.prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.notification.count({ where: { userId } }),
    ]);
    return {
      items: rows,
      page,
      limit,
      total: count,
      totalPages: Math.ceil(count / limit),
    };
  }

  async markRead(userId: string, id: string) {
    const notification = await this.prisma.notification.findFirst({
      where: { id, userId },
    });
    if (!notification) return null;
    return this.prisma.notification.update({
      where: { id: notification.id },
      data: { isRead: true },
    });
  }

  async markAllRead(userId: string) {
    await this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
    return { updated: true };
  }
}
