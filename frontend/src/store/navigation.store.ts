import { create } from 'zustand';

interface NavigationState {
  depth: number;
  push: () => void;
  pop: () => void;
}

// window.history.length counts the whole browser tab session, not just
// in-app routes, so BackButton can't rely on it to know whether "back"
// actually leads somewhere inside the app. We track in-app pushes/pops
// ourselves instead.
export const useNavigationStore = create<NavigationState>((set) => ({
  depth: 0,
  push: () => set((s) => ({ depth: s.depth + 1 })),
  pop: () => set((s) => ({ depth: Math.max(0, s.depth - 1) })),
}));
