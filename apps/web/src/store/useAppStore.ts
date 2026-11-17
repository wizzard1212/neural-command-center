import { create } from "zustand";

interface AppState {
  navExpanded: boolean;
  liveStreamOpen: boolean;
  reducedAnimation: boolean;
  toggleNav: () => void;
  toggleLiveStream: () => void;
  setReducedAnimation: (value: boolean) => void;
}

export const useAppStore = create<AppState>((set) => ({
  navExpanded: false,
  liveStreamOpen: true,
  reducedAnimation: false,
  toggleNav: () => set((s) => ({ navExpanded: !s.navExpanded })),
  toggleLiveStream: () => set((s) => ({ liveStreamOpen: !s.liveStreamOpen })),
  setReducedAnimation: (value) => set({ reducedAnimation: value }),
}));
