import { api } from './api-client';
import type { ApiEnvelope, Donation, PaginatedResult } from '../types';

export type DonationRequestStatus =
  | 'PENDING'
  | 'APPROVED'
  | 'REJECTED'
  | 'RESERVED'
  | 'COLLECTED'
  | 'COMPLETED'
  | 'CANCELLED';

export interface DonationRequestItem {
  id: string;
  donationId: string;
  donation?: Donation;
  requesterId: string;
  requester?: { id: string; fullName: string; phone: string };
  status: DonationRequestStatus;
  note: string | null;
  createdAt: string;
}

export interface RequestMessage {
  id: string;
  requestId: string;
  senderId: string;
  sender: { id: string; fullName: string };
  text: string;
  createdAt: string;
}

export const donationRequestsService = {
  incomingCount: () =>
    api
      .get<ApiEnvelope<{ pending: number }>>('/donation-requests/incoming/count')
      .then((r) => r.data.data.pending),

  messages: (id: string) =>
    api
      .get<ApiEnvelope<RequestMessage[]>>(`/donation-requests/${id}/messages`)
      .then((r) => r.data.data),

  sendMessage: (id: string, text: string) =>
    api
      .post<ApiEnvelope<RequestMessage>>(`/donation-requests/${id}/messages`, { text })
      .then((r) => r.data.data),

  create: (donationId: string, note?: string) =>
    api
      .post<ApiEnvelope<DonationRequestItem>>('/donation-requests', { donationId, note })
      .then((r) => r.data.data),

  mine: (page = 1, limit = 20) =>
    api
      .get<ApiEnvelope<PaginatedResult<DonationRequestItem>>>('/donation-requests/mine', {
        params: { page, limit },
      })
      .then((r) => r.data.data),

  forDonation: (donationId: string, page = 1, limit = 20) =>
    api
      .get<ApiEnvelope<PaginatedResult<DonationRequestItem>>>(
        `/donation-requests/donation/${donationId}`,
        { params: { page, limit } },
      )
      .then((r) => r.data.data),

  approve: (id: string) =>
    api
      .patch<ApiEnvelope<DonationRequestItem>>(`/donation-requests/${id}/approve`)
      .then((r) => r.data.data),

  reject: (id: string) =>
    api
      .patch<ApiEnvelope<DonationRequestItem>>(`/donation-requests/${id}/reject`)
      .then((r) => r.data.data),

  collect: (id: string) =>
    api
      .patch<ApiEnvelope<DonationRequestItem>>(`/donation-requests/${id}/collect`)
      .then((r) => r.data.data),

  complete: (id: string) =>
    api
      .patch<ApiEnvelope<DonationRequestItem>>(`/donation-requests/${id}/complete`)
      .then((r) => r.data.data),

  cancel: (id: string) =>
    api.delete<ApiEnvelope<DonationRequestItem>>(`/donation-requests/${id}`).then((r) => r.data.data),
};
