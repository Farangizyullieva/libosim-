import { api } from './api-client';
import type { ApiEnvelope } from '../types';

export interface AdminStats {
  totalUsers: number;
  blockedUsers: number;
  totalDonations: number;
  pendingDonations: number;
  availableDonations: number;
  totalCategories: number;
  totalRequests: number;
  pendingRequests: number;
}

export const adminService = {
  getStats: () => api.get<ApiEnvelope<AdminStats>>('/admin/stats').then((r) => r.data.data),
};
