import { create } from 'zustand';
import { categoriesService } from '../services/categories.service';
import type { Category } from '../types';

interface CategoriesState {
  categories: Category[];
  loaded: boolean;
  loading: boolean;
  error: string | null;
  fetch: () => Promise<void>;
  retry: () => Promise<void>;
}

export const useCategoriesStore = create<CategoriesState>((set, get) => ({
  categories: [],
  loaded: false,
  loading: false,
  error: null,
  fetch: async () => {
    if (get().loaded || get().loading) return;
    set({ loading: true, error: null });
    try {
      const categories = await categoriesService.list();
      set({ categories, loaded: true, loading: false });
    } catch {
      set({ error: 'Failed to load categories', loading: false });
    }
  },
  // Explicit retry ignores the "already loaded/loading" guard so a failed
  // fetch can actually be retried from a "Retry" button.
  retry: async () => {
    set({ loading: true, error: null });
    try {
      const categories = await categoriesService.list();
      set({ categories, loaded: true, loading: false });
    } catch {
      set({ error: 'Failed to load categories', loading: false, loaded: false });
    }
  },
}));
