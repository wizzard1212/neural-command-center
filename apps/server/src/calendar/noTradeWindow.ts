// Abschnitt 10: "Kein-Trade-Fenster automatisch berechnet aus High-Impact-
// Terminen + der News-Regel jedes Kontos (z. B. 2 Min vor/nach)."

export interface HighImpactEvent {
  ts: string; // ISO
  title: string;
  country: string;
}

export interface AccountNewsRule {
  accountId: number;
  label: string;
  newsRuleMinutes: number | null;
}

export interface NoTradeWindow {
  eventTs: string;
  eventTitle: string;
  country: string;
  accountId: number;
  accountLabel: string;
  startsAt: string;
  endsAt: string;
}

/** Ein Fenster pro (High-Impact-Termin × Konto mit gesetzter News-Regel).
 * Konten ohne newsRuleMinutes (null) haben keine Einschränkung und werden
 * ausgelassen. */
export function computeNoTradeWindows(events: HighImpactEvent[], accounts: AccountNewsRule[]): NoTradeWindow[] {
  const windows: NoTradeWindow[] = [];
  const restricted = accounts.filter((a) => a.newsRuleMinutes !== null && a.newsRuleMinutes > 0);

  for (const event of events) {
    const eventMs = new Date(event.ts).getTime();
    for (const account of restricted) {
      const marginMs = account.newsRuleMinutes! * 60_000;
      windows.push({
        eventTs: event.ts,
        eventTitle: event.title,
        country: event.country,
        accountId: account.accountId,
        accountLabel: account.label,
        startsAt: new Date(eventMs - marginMs).toISOString(),
        endsAt: new Date(eventMs + marginMs).toISOString(),
      });
    }
  }

  return windows.sort((a, b) => a.startsAt.localeCompare(b.startsAt));
}

/** Für die Statusleiste: ob "now" gerade in einem Kein-Trade-Fenster liegt
 * und wie viele Minuten bis zum nächsten Fenster (Start) verbleiben. */
export function nextWindowCountdown(windows: NoTradeWindow[], now: Date): { activeNow: boolean; minutesUntilNext: number | null; next: NoTradeWindow | null } {
  const nowMs = now.getTime();
  const active = windows.find((w) => new Date(w.startsAt).getTime() <= nowMs && nowMs < new Date(w.endsAt).getTime());
  if (active) return { activeNow: true, minutesUntilNext: 0, next: active };

  const upcoming = windows
    .filter((w) => new Date(w.startsAt).getTime() > nowMs)
    .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime())[0];

  if (!upcoming) return { activeNow: false, minutesUntilNext: null, next: null };
  const minutesUntilNext = Math.round((new Date(upcoming.startsAt).getTime() - nowMs) / 60_000);
  return { activeNow: false, minutesUntilNext, next: upcoming };
}
