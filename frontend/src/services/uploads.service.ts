import { api, API_BASE_URL } from './api-client';
import type { ApiEnvelope } from '../types';

// The backend serves uploaded files at /uploads/*, outside the /api/v1
// prefix — derive that origin from the configured API base URL.
const API_ORIGIN = API_BASE_URL.replace(/\/api\/v1\/?$/, '');

export function toAbsoluteUploadUrl(pathOrUrl: string): string {
  if (/^https?:\/\//.test(pathOrUrl)) return pathOrUrl;
  return `${API_ORIGIN}${pathOrUrl}`;
}

export const uploadsService = {
  uploadImages: async (files: File[]): Promise<string[]> => {
    const formData = new FormData();
    files.forEach((file) => formData.append('files', file));

    const response = await api.post<ApiEnvelope<{ urls: string[] }>>(
      '/uploads/images',
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } },
    );
    // Keep the relative /uploads/... path: that's what the backend stores
    // and validates. Display code converts it with toAbsoluteUploadUrl.
    return response.data.data.urls;
  },
};
