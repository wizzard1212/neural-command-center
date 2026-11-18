import { create } from "zustand";

export type LiveStreamKind = "vault" | "news" | "trade" | "account" | "briefing";

export interface LiveStreamEntry {
  id: string;
  kind: LiveStreamKind;
  label: string;
  detail?: string;
  ts: number;
}

interface LiveStreamState {
  entries: LiveStreamEntry[];
  push: (entry: Omit<LiveStreamEntry, "id" | "ts">) => void;
}

export const useLiveStreamStore = create<LiveStreamState>((set) => ({
  entries: [],
  push: (entry) =>
    set((s) => ({
      entries: [{ ...entry, id: crypto.randomUUID(), ts: Date.now() }, ...s.entries].slice(0, 50),
    })),
}));
