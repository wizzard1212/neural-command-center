import { create } from "zustand";

interface AppState {
  navExpanded: boolean;
  liveStreamOpen: boolean;
  reducedAnimation: boolean;
  // Von der Command-Palette gesetzt (Abschnitt 11: "Trade anlegen"), damit die
  // Journal-Seite nach der Navigation ihr Erfassungs-Formular automatisch öffnet.
  pendingQuickTrade: boolean;
  toggleNav: () => void;
  toggleLiveStream: () => void;
  setReducedAnimation: (value: boolean) => void;
  requestQuickTrade: () => void;
  consumeQuickTrade: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  navExpanded: false,
  liveStreamOpen: true,
  reducedAnimation: false,
  pendingQuickTrade: false,
  toggleNav: () => set((s) => ({ navExpanded: !s.navExpanded })),
  toggleLiveStream: () => set((s) => ({ liveStreamOpen: !s.liveStreamOpen })),
  setReducedAnimation: (value) => set({ reducedAnimation: value }),
  requestQuickTrade: () => set({ pendingQuickTrade: true }),
  consumeQuickTrade: () => set({ pendingQuickTrade: false }),
}));
