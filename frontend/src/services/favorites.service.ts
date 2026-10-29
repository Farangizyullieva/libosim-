import { api } from './api-client';
import type { ApiEnvelope, Donation, PaginatedResult } from '../types';

export const favoritesService = {
  list: (page = 1, limit = 20) =>
    api
      .get<ApiEnvelope<PaginatedResult<Donation>>>('/favorites', { params: { page, limit } })
      .then((r) => r.data.data),

  ids: () => api.get<ApiEnvelope<string[]>>('/favorites/ids').then((r) => r.data.data),

  add: (donationId: string) =>
    api.post<ApiEnvelope<unknown>>(`/favorites/${donationId}`).then((r) => r.data.data),

  remove: (donationId: string) =>
    api.delete<ApiEnvelope<unknown>>(`/favorites/${donationId}`).then((r) => r.data.data),
};
