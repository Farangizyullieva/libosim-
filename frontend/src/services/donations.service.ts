import { api } from './api-client';
import type {
  ApiEnvelope,
  Donation,
  DonationAgeGroup,
  DonationCondition,
  DonationGender,
  PaginatedResult,
} from '../types';

export interface DonationQuery {
  search?: string;
  categoryId?: string;
  size?: string;
  condition?: DonationCondition;
  gender?: DonationGender;
  ageGroup?: DonationAgeGroup;
  location?: string;
  status?: string;
  sort?: 'newest' | 'oldest';
  page?: number;
  limit?: number;
}

export interface CreateDonationPayload {
  title: string;
  description: string;
  categoryId?: string;
  size?: string;
  condition: DonationCondition;
  gender: DonationGender;
  ageGroup: DonationAgeGroup;
  quantity?: number;
  location?: string;
  images?: string[];
}

export const donationsService = {
  list: (query: DonationQuery = {}) =>
    api
      .get<ApiEnvelope<PaginatedResult<Donation>>>('/donations', { params: query })
      .then((r) => r.data.data),

  mine: (page = 1, limit = 20) =>
    api
      .get<ApiEnvelope<PaginatedResult<Donation>>>('/donations/mine', {
        params: { page, limit },
      })
      .then((r) => r.data.data),

  getOne: (id: string) =>
    api.get<ApiEnvelope<Donation>>(`/donations/${id}`).then((r) => r.data.data),

  create: (payload: CreateDonationPayload) =>
    api.post<ApiEnvelope<Donation>>('/donations', payload).then((r) => r.data.data),

  update: (id: string, payload: Partial<CreateDonationPayload>) =>
    api.patch<ApiEnvelope<Donation>>(`/donations/${id}`, payload).then((r) => r.data.data),

  cancel: (id: string) =>
    api.delete<ApiEnvelope<Donation>>(`/donations/${id}`).then((r) => r.data.data),

  // --- Admin moderation ---

  adminList: (query: DonationQuery = {}) =>
    api
      .get<ApiEnvelope<PaginatedResult<Donation>>>('/donations/admin/all', { params: query })
      .then((r) => r.data.data),

  approve: (id: string) =>
    api.patch<ApiEnvelope<Donation>>(`/donations/${id}/approve`).then((r) => r.data.data),

  reject: (id: string, reason: string) =>
    api
      .patch<ApiEnvelope<Donation>>(`/donations/${id}/reject`, { reason })
      .then((r) => r.data.data),
};
