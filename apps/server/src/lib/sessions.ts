import type { SessionKey, SessionWindow } from "@ncc/shared";

export const SESSION_WINDOWS: SessionWindow[] = [
  { key: "asia", openUtc: "00:00", closeUtc: "09:00" },
  { key: "london", openUtc: "08:00", closeUtc: "17:00" },
  { key: "new_york", openUtc: "13:00", closeUtc: "22:00" },
];

function minutesUtc(now: Date): number {
  return now.getUTCHours() * 60 + now.getUTCMinutes();
}

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

export interface SessionState {
  key: SessionKey;
  isOpen: boolean;
  minutesUntilNextOpen: number;
  minutesUntilClose: number | null;
}

export function computeSessionStates(now: Date): SessionState[] {
  const nowMin = minutesUtc(now);
  return SESSION_WINDOWS.map((w) => {
    const open = toMinutes(w.openUtc);
    const close = toMinutes(w.closeUtc);
    const isOpen = open <= close ? nowMin >= open && nowMin < close : nowMin >= open || nowMin < close;

    let minutesUntilNextOpen = (open - nowMin + 1440) % 1440;
    if (isOpen) minutesUntilNextOpen = 0;

    let minutesUntilClose: number | null = null;
    if (isOpen) {
      minutesUntilClose = (close - nowMin + 1440) % 1440;
    }

    return { key: w.key, isOpen, minutesUntilNextOpen, minutesUntilClose };
  });
}
