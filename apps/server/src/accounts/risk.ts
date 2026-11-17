// Risiko-/Regel-Berechnungen für Prop-Firm-Konten (SPEC.md Abschnitt 8).
// Reine Funktionen ohne DB-Zugriff, damit sie sich präzise testen lassen –
// diese Zahlen entscheiden über echtes Geld.

export type DailyLossMode = "balance" | "equity" | "higher_of_balance_equity";
export type MaxLossMode = "static" | "trailing";
export type TrafficLightColor = "green" | "yellow" | "red";

export interface TrafficLight {
  color: TrafficLightColor;
  pulsing: boolean; // < 15 % Puffer -> rot pulsierend + Push (Abschnitt 8.2)
}

function clampPct(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, value));
}

export function dailyLossLimitUsd(
  mode: DailyLossMode,
  dailyLossPct: number,
  referenceBalance: number,
  referenceEquity: number,
): number {
  const reference =
    mode === "balance"
      ? referenceBalance
      : mode === "equity"
        ? referenceEquity
        : Math.max(referenceBalance, referenceEquity);
  return Math.max(0, reference) * (dailyLossPct / 100);
}

export function dailyLossBufferPct(limitUsd: number, dailyPnlUsd: number): number {
  if (limitUsd <= 0) return 100;
  const lossSoFar = Math.max(0, -dailyPnlUsd);
  const remaining = limitUsd - lossSoFar;
  return clampPct((remaining / limitUsd) * 100);
}

export function peakEquityFromHistory(startBalance: number, equitySeries: number[]): number {
  return equitySeries.reduce((max, equity) => Math.max(max, equity), startBalance);
}

function maxLossReferenceValue(mode: MaxLossMode, startBalance: number, peakEquity: number): number {
  return mode === "static" ? startBalance : peakEquity;
}

export function maxLossLimitUsd(
  mode: MaxLossMode,
  maxLossPct: number,
  startBalance: number,
  peakEquity: number,
): number {
  const reference = maxLossReferenceValue(mode, startBalance, peakEquity);
  return Math.max(0, reference) * (maxLossPct / 100);
}

export function maxLossBufferPct(
  mode: MaxLossMode,
  maxLossPct: number,
  startBalance: number,
  peakEquity: number,
  currentEquity: number,
): number {
  const reference = maxLossReferenceValue(mode, startBalance, peakEquity);
  const totalAllowedDrawdown = Math.max(0, reference) * (maxLossPct / 100);
  if (totalAllowedDrawdown <= 0) return 100;
  const usedDrawdown = Math.max(0, reference - currentEquity);
  const remaining = totalAllowedDrawdown - usedDrawdown;
  return clampPct((remaining / totalAllowedDrawdown) * 100);
}

export function trafficLight(bufferPct: number): TrafficLight {
  if (bufferPct > 60) return { color: "green", pulsing: false };
  if (bufferPct >= 30) return { color: "yellow", pulsing: false };
  return { color: "red", pulsing: bufferPct < 15 };
}

/** Fortschritt zum Profitziel der aktuellen Phase, in Prozent (0-100), oder
 * null wenn kein Ziel gesetzt ist. */
export function profitTargetProgressPct(
  startBalance: number,
  profitTargetPct: number | null,
  currentEquity: number,
): number | null {
  if (!profitTargetPct || profitTargetPct <= 0) return null;
  const targetUsd = startBalance * (profitTargetPct / 100);
  if (targetUsd <= 0) return null;
  const profitSoFar = currentEquity - startBalance;
  return clampPct((profitSoFar / targetUsd) * 100);
}

export interface CopyGroupAccount {
  id: number;
  size: number;
  dailyLossLimitUsd: number;
}

export interface CopyRiskResult {
  perAccount: { id: number; riskUsd: number }[];
  totalRiskUsd: number;
  strictestAccountId: number | null;
  strictestLimitUsd: number | null;
  exceedsStrictest: boolean;
}

/**
 * "1 % Risiko auf dem Master-Konto = X $ Verlust über alle Konten der
 * Copy-Gruppe" (Abschnitt 8.3). Bei proportionaler Lot-Größen-Kopie trägt
 * jedes Konto denselben Risiko-%-Satz auf seine eigene Kontogröße.
 * "Strengstes Konto" = das mit dem kleinsten Tagesverlust-Limit in $, weil
 * das als erstes durch eine kopierte Position gerissen würde.
 */
export function copyRiskCalculator(
  masterRiskPct: number,
  accounts: CopyGroupAccount[],
): CopyRiskResult {
  const perAccount = accounts.map((a) => ({ id: a.id, riskUsd: a.size * (masterRiskPct / 100) }));
  const totalRiskUsd = perAccount.reduce((sum, a) => sum + a.riskUsd, 0);

  let strictest: CopyGroupAccount | null = null;
  for (const a of accounts) {
    if (!strictest || a.dailyLossLimitUsd < strictest.dailyLossLimitUsd) strictest = a;
  }

  const strictestRisk = strictest ? perAccount.find((a) => a.id === strictest!.id)!.riskUsd : 0;
  const exceedsStrictest = strictest ? strictestRisk > strictest.dailyLossLimitUsd : false;

  return {
    perAccount,
    totalRiskUsd,
    strictestAccountId: strictest?.id ?? null,
    strictestLimitUsd: strictest?.dailyLossLimitUsd ?? null,
    exceedsStrictest,
  };
}

/** Konsistenzregel: größter Einzeltag als Anteil am Gesamtgewinn, in Prozent.
 * null, wenn (noch) kein Gesamtgewinn vorliegt – Regel ist dann nicht auswertbar. */
export function consistencyPct(dailyPnls: number[]): number | null {
  const totalProfit = dailyPnls.reduce((sum, p) => sum + p, 0);
  if (totalProfit <= 0) return null;
  const largestDay = Math.max(0, ...dailyPnls);
  return (largestDay / totalProfit) * 100;
}

export function passesConsistency(actualPct: number | null, allowedMaxPct: number): boolean | null {
  if (actualPct === null) return null;
  return actualPct <= allowedMaxPct;
}

export function countTradingDays(dailyPnls: number[]): number {
  return dailyPnls.filter((p) => p !== 0).length;
}

export function countProfitableDays(
  dailyPnls: number[],
  startBalance: number,
  minProfitablePct: number,
): number {
  const minUsd = startBalance * (minProfitablePct / 100);
  return dailyPnls.filter((p) => p >= minUsd).length;
}

export function daysUntilInactive(lastActivityAt: Date, inactivityDays: number, now: Date): number {
  const elapsedDays = Math.floor((now.getTime() - lastActivityAt.getTime()) / (24 * 60 * 60 * 1000));
  return Math.max(0, inactivityDays - elapsedDays);
}

export function costsAndRoi(
  totalCostUsd: number,
  payouts: { net: number }[],
): { netProfit: number; roiPct: number | null } {
  const totalNet = payouts.reduce((sum, p) => sum + p.net, 0);
  const netProfit = totalNet - totalCostUsd;
  const roiPct = totalCostUsd > 0 ? (netProfit / totalCostUsd) * 100 : null;
  return { netProfit, roiPct };
}
