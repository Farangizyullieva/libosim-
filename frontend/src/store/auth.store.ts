import { create } from 'zustand';
import { authService } from '../services/auth.service';
import { usersService, type FullProfile } from '../services/users.service';
import { tokenStore } from '../services/token-store';
import { useFavoritesStore } from './favorites.store';

interface AuthState {
  user: FullProfile | null;
  isInitializing: boolean;
  isAuthenticated: boolean;
  login: (phone: string, password: string) => Promise<void>;
  register: (payload: {
    fullName: string;
    phone: string;
    email?: string;
    password: string;
    otpToken?: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  bootstrap: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isInitializing: true,
  isAuthenticated: false,

  login: async (phone, password) => {
    const result = await authService.login({ phone, password });
    tokenStore.setAccessToken(result.accessToken);
    tokenStore.setRefreshToken(result.refreshToken);
    const profile = await usersService.getMe();
    set({ user: profile, isAuthenticated: true });
    useFavoritesStore.getState().fetchIds();
  },

  register: async (payload) => {
    const result = await authService.register(payload);
    tokenStore.setAccessToken(result.accessToken);
    tokenStore.setRefreshToken(result.refreshToken);
    const profile = await usersService.getMe();
    set({ user: profile, isAuthenticated: true });
    useFavoritesStore.getState().fetchIds();
  },

  logout: async () => {
    const refreshToken = tokenStore.getRefreshToken();
    if (refreshToken) {
      try {
        await authService.logout(refreshToken);
      } catch {
        // Best-effort revoke; clear local state regardless.
      }
    }
    tokenStore.clear();
    set({ user: null, isAuthenticated: false });
    useFavoritesStore.getState().reset();
  },

  refreshProfile: async () => {
    const profile = await usersService.getMe();
    set({ user: profile });
  },

  bootstrap: async () => {
    const refreshToken = tokenStore.getRefreshToken();
    if (!refreshToken) {
      set({ isInitializing: false });
      return;
    }

    try {
      // A 401 on this call triggers the axios interceptor's own refresh flow.
      const profile = await usersService.getMe();
      set({ user: profile, isAuthenticated: true });
      useFavoritesStore.getState().fetchIds();
    } catch {
      tokenStore.clear();
      set({ user: null, isAuthenticated: false });
    } finally {
      set({ isInitializing: false });
    }
  },
}));

// Convenience for other modules that only need the current snapshot.
export function getAuthUser() {
  return useAuthStore.getState().user;
}
