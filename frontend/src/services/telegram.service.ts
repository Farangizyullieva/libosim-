import { api } from './api-client';
import type { ApiEnvelope } from '../types';

export interface TelegramConfig {
  enabled: boolean;
  botUsername: string | null;
}

export const telegramService = {
  getConfig: () =>
    api.get<ApiEnvelope<TelegramConfig>>('/telegram/config').then((r) => r.data.data),
};
