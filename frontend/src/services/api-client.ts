import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { tokenStore } from './token-store';
import i18n from '../i18n';
import type { ApiEnvelope } from '../types';

const STATIC_ERROR_KEYS: Record<string, string> = {
  'A user with this phone already exists': 'errors.phoneTaken',
  'A user with this email already exists': 'errors.emailTaken',
  'Invalid phone or password': 'errors.invalidCredentials',
  'Your account has been blocked': 'errors.accountBlocked',
  'Invalid or expired refresh token': 'errors.sessionExpired',
  'Account unavailable': 'errors.accountUnavailable',
  'Current password is incorrect': 'errors.wrongCurrentPassword',
  'Code expired or not requested, please request a new one': 'errors.otpExpired',
  'Too many attempts, please request a new code': 'errors.otpTooManyAttempts',
  'Phone number is not verified, please verify it first': 'errors.phoneNotVerified',
};

// Backend validation/domain errors are plain English (no i18n on that side);
// map the known ones here so the toast/inline error is never raw English.
// Anything unrecognized falls back to the original message rather than a
// generic string, so real validation detail isn't silently hidden.
function translateBackendMessage(message: string): string {
  const key = STATIC_ERROR_KEYS[message];
  if (key) return i18n.t(key);

  const waitMatch = message.match(/^Please wait (\d+)s before requesting another code$/);
  if (waitMatch) return i18n.t('errors.otpWait', { seconds: waitMatch[1] });

  const invalidCodeMatch = message.match(/^Invalid code \((\d+) attempts left\)$/);
  if (invalidCodeMatch) return i18n.t('errors.otpInvalidCode', { attempts: invalidCodeMatch[1] });

  // class-validator messages, possibly several joined with ", ".
  if (/password must be longer than or equal to/.test(message)) return i18n.t('errors.passwordTooShort');
  if (/password must be shorter than or equal to/.test(message)) return i18n.t('errors.passwordTooLong');
  if (/fullName must be longer than or equal to/.test(message)) return i18n.t('errors.nameTooShort');
  if (/email must be an email/.test(message)) return i18n.t('errors.invalidEmail');

  if (message.includes('valid Uzbekistan number')) return i18n.t('auth.invalidPhone');

  if (message.startsWith('ThrottlerException')) return i18n.t('errors.tooManyRequests');

  return message;
}

export const API_BASE_URL =
  (import.meta.env.VITE_API_URL as string | undefined) ??
  'http://localhost:3000/api/v1';

export const api = axios.create({
  baseURL: API_BASE_URL,
});

api.interceptors.request.use((config) => {
  const token = tokenStore.getAccessToken();
  if (token) {
    config.headers.set('Authorization', `Bearer ${token}`);
  }
  return config;
});

let refreshPromise: Promise<string | null> | null = null;

async function performRefresh(): Promise<string | null> {
  const refreshToken = tokenStore.getRefreshToken();
  if (!refreshToken) return null;

  try {
    const response = await axios.post<ApiEnvelope<{ accessToken: string; refreshToken: string }>>(
      `${API_BASE_URL}/auth/refresh`,
      { refreshToken },
    );
    const { accessToken, refreshToken: newRefreshToken } = response.data.data;
    tokenStore.setAccessToken(accessToken);
    tokenStore.setRefreshToken(newRefreshToken);
    return accessToken;
  } catch {
    tokenStore.clear();
    return null;
  }
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as (InternalAxiosRequestConfig & { _retried?: boolean }) | undefined;

    if (error.response?.status === 401 && original && !original._retried) {
      original._retried = true;

      // Multiple concurrent 401s should trigger only one refresh call.
      refreshPromise ??= performRefresh().finally(() => {
        refreshPromise = null;
      });

      const newToken = await refreshPromise;
      if (newToken) {
        original.headers.set('Authorization', `Bearer ${newToken}`);
        return api.request(original);
      }
    }

    return Promise.reject(error);
  },
);

export function extractErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    if (!error.response) {
      return i18n.t('errors.networkError');
    }
    const data = error.response.data as ApiEnvelope<unknown> | undefined;
    if (data?.debug) {
      // Dev-only real error surfaced by the backend for a non-validation
      // (500-class) failure — show it instead of the generic message so the
      // actual cause is visible right in the toast.
      return `${data.debug.name}: ${data.debug.detail}`;
    }
    if (data?.message) {
      const raw = Array.isArray(data.message) ? data.message.join(', ') : data.message;
      return translateBackendMessage(raw);
    }
  }
  return i18n.t('errors.generic');
}
