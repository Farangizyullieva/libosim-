import { api } from './api-client';
import type { ApiEnvelope, AuthUser } from '../types';

export interface AuthResult {
  user: AuthUser;
  accessToken: string;
  refreshToken: string;
}

export const authService = {
  getOtpConfig: () =>
    api.get<ApiEnvelope<{ enabled: boolean }>>('/auth/otp/config').then((r) => r.data.data),

  sendOtp: (phone: string) =>
    api
      .post<ApiEnvelope<{ expiresInSeconds: number }>>('/auth/otp/send', { phone })
      .then((r) => r.data.data),

  verifyOtp: (phone: string, code: string) =>
    api
      .post<ApiEnvelope<{ otpToken: string }>>('/auth/otp/verify', { phone, code })
      .then((r) => r.data.data),

  register: (payload: {
    fullName: string;
    phone: string;
    email?: string;
    password: string;
    otpToken?: string;
  }) =>
    api
      .post<ApiEnvelope<AuthResult>>('/auth/register', payload)
      .then((r) => r.data.data),

  login: (payload: { phone: string; password: string }) =>
    api
      .post<ApiEnvelope<AuthResult>>('/auth/login', payload)
      .then((r) => r.data.data),

  logout: (refreshToken: string) =>
    api.post<ApiEnvelope<{ loggedOut: boolean }>>('/auth/logout', { refreshToken }),

  me: () =>
    api
      .post<ApiEnvelope<{ id: string; role: AuthUser['role'] }>>('/auth/me')
      .then((r) => r.data.data),
};
