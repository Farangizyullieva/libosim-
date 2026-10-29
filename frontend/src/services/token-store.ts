// Access tokens live in memory only (never localStorage) to limit XSS
// exposure. Refresh tokens are opaque and long-lived, so they're persisted
// so the user stays logged in across page reloads; losing them just means
// logging in again, so the trade-off is acceptable for this app.
const REFRESH_KEY = 'libosim_refresh_token';

let accessToken: string | null = null;

export const tokenStore = {
  getAccessToken: () => accessToken,
  setAccessToken: (token: string | null) => {
    accessToken = token;
  },
  getRefreshToken: () => localStorage.getItem(REFRESH_KEY),
  setRefreshToken: (token: string | null) => {
    if (token) localStorage.setItem(REFRESH_KEY, token);
    else localStorage.removeItem(REFRESH_KEY);
  },
  clear: () => {
    accessToken = null;
    localStorage.removeItem(REFRESH_KEY);
  },
};
