import { api } from './api-client';
import type { ApiEnvelope, Category } from '../types';

export const categoriesService = {
  list: () => api.get<ApiEnvelope<Category[]>>('/categories').then((r) => r.data.data),

  create: (name: string) =>
    api.post<ApiEnvelope<Category>>('/categories', { name }).then((r) => r.data.data),

  update: (id: string, name: string) =>
    api.patch<ApiEnvelope<Category>>(`/categories/${id}`, { name }).then((r) => r.data.data),

  remove: (id: string) =>
    api.delete<ApiEnvelope<{ deleted: boolean }>>(`/categories/${id}`).then((r) => r.data.data),
};
