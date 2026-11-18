/** Reiner Rechenteil des Hype-Radars (Abschnitt 7.2: "Ticker/Themen mit
 * stärkstem Anstieg der Erwähnungen gegenüber dem 7-Tage-Schnitt (Z-Score)").
 *
 * Mit < 2 historischen Tageswerten lässt sich kein echter Z-Score (braucht
 * eine Standardabweichung) berechnen – in den ersten Tagen nach der
 * Inbetriebnahme fällt die Funktion dann auf eine einfache relative
 * Wachstumsrate zurück, statt mit NaN/Infinity zu brechen.
 */
export function computeZScore(mentions24h: number, history7d: number[]): { zscore: number; avg7d: number } {
  if (history7d.length === 0) {
    return { zscore: mentions24h > 0 ? 1 : 0, avg7d: 0 };
  }

  const avg7d = history7d.reduce((sum, v) => sum + v, 0) / history7d.length;

  if (history7d.length < 2) {
    const zscore = avg7d > 0 ? (mentions24h - avg7d) / avg7d : mentions24h > 0 ? 1 : 0;
    return { zscore, avg7d };
  }

  const variance = history7d.reduce((sum, v) => sum + (v - avg7d) ** 2, 0) / history7d.length;
  const stddev = Math.sqrt(variance);
  const zscore = stddev > 0 ? (mentions24h - avg7d) / stddev : mentions24h > avg7d ? 1 : 0;

  return { zscore, avg7d };
}
