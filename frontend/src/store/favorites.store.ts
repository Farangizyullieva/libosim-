import { create } from 'zustand';
import { favoritesService } from '../services/favorites.service';

interface FavoritesState {
  ids: Set<string>;
  loaded: boolean;
  fetchIds: () => Promise<void>;
  toggle: (donationId: string) => Promise<void>;
  isFavorited: (donationId: string) => boolean;
  reset: () => void;
}

export const useFavoritesStore = create<FavoritesState>((set, get) => ({
  ids: new Set(),
  loaded: false,

  fetchIds: async () => {
    if (get().loaded) return;
    try {
      const ids = await favoritesService.ids();
      set({ ids: new Set(ids), loaded: true });
    } catch {
      // Not logged in or request failed — leave favorites empty; the UI
      // treats an unauthenticated viewer as having none.
    }
  },

  toggle: async (donationId: string) => {
    const wasFavorited = get().ids.has(donationId);

    // Optimistic update, rolled back if the request fails.
    set((s) => {
      const next = new Set(s.ids);
      if (wasFavorited) next.delete(donationId);
      else next.add(donationId);
      return { ids: next };
    });

    try {
      if (wasFavorited) await favoritesService.remove(donationId);
      else await favoritesService.add(donationId);
    } catch {
      set((s) => {
        const next = new Set(s.ids);
        if (wasFavorited) next.add(donationId);
        else next.delete(donationId);
        return { ids: next };
      });
    }
  },

  isFavorited: (donationId: string) => get().ids.has(donationId),

  reset: () => set({ ids: new Set(), loaded: false }),
}));
