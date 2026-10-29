// Addresses of the two apps, so each can link to the other.
export const SITE_URL =
  (import.meta.env.VITE_SITE_URL as string | undefined) ?? 'http://localhost:5173';
export const ADMIN_URL =
  (import.meta.env.VITE_ADMIN_URL as string | undefined) ?? 'http://localhost:5174';
