// Statistik-Kennzahlen fürs Trading-Journal (SPEC.md Abschnitt 9.3).

export interface ClosedTradeLike {
  resultR: number | null;
  resultUsd: number | null;
  closedAt: string | null;
}

function closedOnly<T extends ClosedTradeLike>(trades: T[]): T[] {
  return trades.filter((t) => t.resultR !== null);
}

export function winRatePct(trades: ClosedTradeLike[]): number | null {
  const closed = closedOnly(trades);
  if (closed.length === 0) return null;
  const wins = closed.filter((t) => t.resultR! > 0).length;
  return (wins / closed.length) * 100;
}

/** Summe Gewinne / Summe Verluste (als Betrag). null ohne Trades, Infinity ohne Verluste. */
export function profitFactor(trades: ClosedTradeLike[]): number | null {
  const closed = closedOnly(trades);
  if (closed.length === 0) return null;
  const grossWin = closed.filter((t) => t.resultUsd! > 0).reduce((s, t) => s + t.resultUsd!, 0);
  const grossLoss = Math.abs(closed.filter((t) => t.resultUsd! < 0).reduce((s, t) => s + t.resultUsd!, 0));
  if (grossLoss === 0) return grossWin > 0 ? Infinity : null;
  return grossWin / grossLoss;
}

export function averageR(trades: ClosedTradeLike[]): number | null {
  const closed = closedOnly(trades);
  if (closed.length === 0) return null;
  return closed.reduce((s, t) => s + t.resultR!, 0) / closed.length;
}

/** Erwartungswert je Trade in R – identisch zu averageR, als eigener Name für
 * die Oberfläche, da beide Kennzahlen separat ausgewiesen werden. */
export const expectancyR = averageR;

/** Maximaler Rückgang der kumulierten R-Kurve, in R (positive Zahl). */
export function maxDrawdownR(trades: ClosedTradeLike[]): number | null {
  const closed = closedOnly(trades)
    .filter((t) => t.closedAt)
    .sort((a, b) => a.closedAt!.localeCompare(b.closedAt!));
  if (closed.length === 0) return null;

  let cumulative = 0;
  let peak = 0;
  let maxDrawdown = 0;
  for (const t of closed) {
    cumulative += t.resultR!;
    peak = Math.max(peak, cumulative);
    maxDrawdown = Math.max(maxDrawdown, peak - cumulative);
  }
  return maxDrawdown;
}

/** Längste Serie aufeinanderfolgender Gewinne bzw. Verluste (zeitlich sortiert). */
export function longestStreak(trades: ClosedTradeLike[], kind: "win" | "loss"): number {
  const closed = closedOnly(trades)
    .filter((t) => t.closedAt)
    .sort((a, b) => a.closedAt!.localeCompare(b.closedAt!));

  let longest = 0;
  let current = 0;
  for (const t of closed) {
    const matches = kind === "win" ? t.resultR! > 0 : t.resultR! < 0;
    current = matches ? current + 1 : 0;
    longest = Math.max(longest, current);
  }
  return longest;
}

export interface GroupStats {
  key: string;
  count: number;
  winRatePct: number | null;
  averageR: number | null;
}

/** Gruppiert Trades (z. B. nach Setup-Typ, Session, Instrument, Emotion) und
 * berechnet Winrate + Durchschnitts-R je Gruppe. */
export function groupStats<T extends ClosedTradeLike>(trades: T[], keyFn: (t: T) => string[]): GroupStats[] {
  const groups = new Map<string, T[]>();
  for (const trade of trades) {
    for (const key of keyFn(trade)) {
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(trade);
    }
  }
  return [...groups.entries()]
    .map(([key, group]) => ({
      key,
      count: group.length,
      winRatePct: winRatePct(group),
      averageR: averageR(group),
    }))
    .sort((a, b) => b.count - a.count);
}
