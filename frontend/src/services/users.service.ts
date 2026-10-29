import { api } from './api-client';
import type { ApiEnvelope, AuthUser, PaginatedResult } from '../types';

export interface FullProfile extends AuthUser {
  isBlocked: boolean;
  telegramLinked: boolean;
  notificationsEnabled: boolean;
  createdAt: string;
}

export const usersService = {
  getMe: () => api.get<ApiEnvelope<FullProfile>>('/users/me').then((r) => r.data.data),

  updateMe: (payload: { fullName?: string; email?: string }) =>
    api.patch<ApiEnvelope<FullProfile>>('/users/me', payload).then((r) => r.data.data),

  changePassword: (payload: { currentPassword: string; newPassword: string }) =>
    api.patch<ApiEnvelope<{ updated: boolean }>>('/users/me/password', payload).then((r) => r.data.data),

  changePhone: (payload: { phone: string; otpToken: string }) =>
    api.patch<ApiEnvelope<FullProfile>>('/users/me/phone', payload).then((r) => r.data.data),

  createTelegramLink: () =>
    api
      .post<ApiEnvelope<{ token: string; deepLink: string | null; expiresAt: string }>>(
        '/users/me/telegram-link',
      )
      .then((r) => r.data.data),

  // --- Admin ---

  list: (page = 1, limit = 20, blocked?: boolean) =>
    api
      .get<ApiEnvelope<PaginatedResult<FullProfile>>>('/users', {
        params: { page, limit, blocked },
      })
      .then((r) => r.data.data),

  block: (id: string) =>
    api.patch<ApiEnvelope<FullProfile>>(`/users/${id}/block`).then((r) => r.data.data),

  unblock: (id: string) =>
    api.patch<ApiEnvelope<FullProfile>>(`/users/${id}/unblock`).then((r) => r.data.data),
};
