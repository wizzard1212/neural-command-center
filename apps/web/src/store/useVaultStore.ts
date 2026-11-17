import { create } from "zustand";

export interface VaultLiveEvent {
  path: string;
  kind: "created" | "modified" | "deleted";
  ts: number;
}

interface VaultState {
  lastEvent: VaultLiveEvent | null;
  recentEvents: VaultLiveEvent[];
  selectedNotePath: string | null;
  visibleAreas: Set<string> | null; // null = alle sichtbar
  onlyOpenTodos: boolean;
  onlyRecentlyChanged: boolean;
  pushEvent: (event: VaultLiveEvent) => void;
  selectNote: (path: string | null) => void;
  toggleArea: (area: string, allAreas: string[]) => void;
  setOnlyOpenTodos: (value: boolean) => void;
  setOnlyRecentlyChanged: (value: boolean) => void;
}

export const useVaultStore = create<VaultState>((set, get) => ({
  lastEvent: null,
  recentEvents: [],
  selectedNotePath: null,
  visibleAreas: null,
  onlyOpenTodos: false,
  onlyRecentlyChanged: false,
  pushEvent: (event) =>
    set((s) => ({
      lastEvent: event,
      recentEvents: [event, ...s.recentEvents].slice(0, 30),
    })),
  selectNote: (path) => set({ selectedNotePath: path }),
  toggleArea: (area, allAreas) => {
    const current = get().visibleAreas ?? new Set(allAreas);
    const next = new Set(current);
    if (next.has(area)) next.delete(area);
    else next.add(area);
    set({ visibleAreas: next.size === allAreas.length ? null : next });
  },
  setOnlyOpenTodos: (value) => set({ onlyOpenTodos: value }),
  setOnlyRecentlyChanged: (value) => set({ onlyRecentlyChanged: value }),
}));
