import { api } from './api-client';
import type { ApiEnvelope, AppNotification, PaginatedResult } from '../types';

export const notificationsService = {
  unreadCount: () =>
    api
      .get<ApiEnvelope<{ unread: number }>>('/notifications/unread-count')
      .then((r) => r.data.data.unread),

  list: (page = 1, limit = 20) =>
    api
      .get<ApiEnvelope<PaginatedResult<AppNotification>>>('/notifications', {
        params: { page, limit },
      })
      .then((r) => r.data.data),

  markRead: (id: string) =>
    api
      .patch<ApiEnvelope<AppNotification>>(`/notifications/${id}/read`)
      .then((r) => r.data.data),

  markAllRead: () =>
    api
      .patch<ApiEnvelope<{ updated: boolean }>>('/notifications/read-all')
      .then((r) => r.data.data),
};
