import { winRatePct, profitFactor, averageR, maxDrawdownR, longestStreak, type ClosedTradeLike } from "@ncc/shared";

export interface WeekTradeLike extends ClosedTradeLike {
  followedPlan: boolean | null;
  instrument: string;
  setupTypesJson: string[] | null;
  lesson: string | null;
}

export interface WeekStats {
  tradeCount: number;
  winRatePct: number | null;
  profitFactor: number | null;
  averageR: number | null;
  maxDrawdownR: number | null;
  longestWinStreak: number;
  longestLossStreak: number;
  totalResultR: number;
  totalResultUsd: number;
  ruleBreaches: number;
  ruleBreachLessons: string[];
}

/** Reine Zahlen-Grundlage fürs Wochen-Review (SPEC.md 9.3) – Claude bekommt
 * diese bereits berechneten Werte und erfindet selbst keine Zahlen. */
export function computeWeekStats(trades: WeekTradeLike[]): WeekStats {
  const closed = trades.filter((t) => t.resultR !== null);
  const breaches = closed.filter((t) => t.followedPlan === false);

  return {
    tradeCount: closed.length,
    winRatePct: winRatePct(closed),
    profitFactor: profitFactor(closed),
    averageR: averageR(closed),
    maxDrawdownR: maxDrawdownR(closed),
    longestWinStreak: longestStreak(closed, "win"),
    longestLossStreak: longestStreak(closed, "loss"),
    totalResultR: closed.reduce((sum, t) => sum + (t.resultR ?? 0), 0),
    totalResultUsd: closed.reduce((sum, t) => sum + (t.resultUsd ?? 0), 0),
    ruleBreaches: breaches.length,
    ruleBreachLessons: breaches.map((t) => t.lesson).filter((l): l is string => Boolean(l)),
  };
}

/** ISO-8601-Kalenderwoche, z. B. { year: 2026, week: 47 } für den Dateinamen
 * "Vault/Dashboard/Reviews/YYYY-KWNN.md". */
export function isoWeek(date: Date): { year: number; week: number } {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7; // Sonntag (0) -> 7, damit Montag=1..Sonntag=7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum); // auf den Donnerstag derselben Woche verschieben
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
  return { year: d.getUTCFullYear(), week };
}

export function weekLabel(date: Date): string {
  const { year, week } = isoWeek(date);
  return `${year}-KW${String(week).padStart(2, "0")}`;
}

/** Montag 00:00 bis Sonntag 23:59:59 der Woche, die "date" enthält. */
export function weekRange(date: Date): { from: string; to: string } {
  const day = (date.getDay() + 6) % 7; // Montag = 0
  const monday = new Date(date);
  monday.setHours(0, 0, 0, 0);
  monday.setDate(monday.getDate() - day);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);
  return { from: monday.toISOString(), to: sunday.toISOString() };
}
