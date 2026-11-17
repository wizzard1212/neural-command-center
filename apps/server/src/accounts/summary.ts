import {
  type DailyLossMode,
  type MaxLossMode,
  type TrafficLight,
  dailyLossLimitUsd,
  dailyLossBufferPct,
  maxLossLimitUsd,
  maxLossBufferPct,
  peakEquityFromHistory,
  trafficLight,
  profitTargetProgressPct,
  consistencyPct,
  passesConsistency,
  countTradingDays,
  countProfitableDays,
  daysUntilInactive,
} from "./risk.js";

export interface SnapshotLike {
  ts: string; // ISO
  balance: number;
  equity: number;
  dailyPnl: number;
}

export interface AccountRuleConfig {
  startBalance: number;
  dailyLossPct: number;
  dailyLossMode: DailyLossMode;
  maxLossPct: number;
  maxLossMode: MaxLossMode;
  profitTargetPct: number | null;
  consistencyPct: number | null;
  minTradingDays: number | null;
  minProfitableDays: number | null;
  inactivityDays: number | null;
}

/**
 * Teilt die Snapshot-Historie in "letzter bekannter Stand vor heute" (Referenz
 * für die Tagesverlust-Berechnung) und "heutiger Stand" auf. Ohne Snapshot vor
 * heute gilt die Startbalance als Referenz (erster Handelstag).
 */
export function splitSnapshotsForToday(
  snapshots: SnapshotLike[],
  startBalance: number,
  now: Date,
) {
  const sorted = [...snapshots].sort((a, b) => a.ts.localeCompare(b.ts));
  const todayStr = now.toISOString().slice(0, 10);

  const before = sorted.filter((s) => s.ts.slice(0, 10) < todayStr);
  const today = sorted.filter((s) => s.ts.slice(0, 10) === todayStr);

  const reference = before.at(-1);
  const latest = sorted.at(-1);

  return {
    referenceBalance: reference?.balance ?? startBalance,
    referenceEquity: reference?.equity ?? startBalance,
    latestBalance: latest?.balance ?? startBalance,
    latestEquity: latest?.equity ?? startBalance,
    todayPnl: today.at(-1)?.dailyPnl ?? 0,
  };
}

export interface AccountSummary {
  latestBalance: number;
  latestEquity: number;
  todayPnl: number;
  dailyLoss: { limitUsd: number; bufferPct: number; light: TrafficLight };
  maxLoss: { limitUsd: number; bufferPct: number; light: TrafficLight };
  overallLight: TrafficLight;
  profitTargetProgressPct: number | null;
  consistency: { actualPct: number | null; ok: boolean | null };
  tradingDays: { count: number; required: number | null; ok: boolean | null };
  profitableDays: { count: number; required: number | null; ok: boolean | null };
  daysUntilInactive: number | null;
}

const LIGHT_SEVERITY: Record<TrafficLight["color"], number> = { green: 0, yellow: 1, red: 2 };

function worseLight(a: TrafficLight, b: TrafficLight): TrafficLight {
  return LIGHT_SEVERITY[a.color] >= LIGHT_SEVERITY[b.color] ? a : b;
}

export function computeAccountSummary(
  config: AccountRuleConfig,
  snapshots: SnapshotLike[],
  now: Date,
  lastActivityAt: Date | null,
): AccountSummary {
  const { referenceBalance, referenceEquity, latestBalance, latestEquity, todayPnl } =
    splitSnapshotsForToday(snapshots, config.startBalance, now);

  const dailyLimit = dailyLossLimitUsd(config.dailyLossMode, config.dailyLossPct, referenceBalance, referenceEquity);
  const dailyBuffer = dailyLossBufferPct(dailyLimit, todayPnl);
  const dailyLight = trafficLight(dailyBuffer);

  const peakEquity = peakEquityFromHistory(
    config.startBalance,
    snapshots.map((s) => s.equity),
  );
  const maxLimit = maxLossLimitUsd(config.maxLossMode, config.maxLossPct, config.startBalance, peakEquity);
  const maxBuffer = maxLossBufferPct(config.maxLossMode, config.maxLossPct, config.startBalance, peakEquity, latestEquity);
  const maxLight = trafficLight(maxBuffer);

  const dailyPnls = snapshots.map((s) => s.dailyPnl);
  const actualConsistency = consistencyPct(dailyPnls);
  const consistencyOk = passesConsistency(actualConsistency, config.consistencyPct ?? 100);

  const tradingDaysCount = countTradingDays(dailyPnls);
  const tradingDaysOk = config.minTradingDays !== null ? tradingDaysCount >= config.minTradingDays : null;

  // "Mindestens N profitable Tage à X%" – X selbst steht nicht separat im Schema,
  // Merlins Vorgabe ist typischerweise 0,5% (Abschnitt 8.1 Beispiel "4/3 à 0,5%").
  const profitableDaysCount = countProfitableDays(dailyPnls, config.startBalance, 0.5);
  const profitableDaysOk =
    config.minProfitableDays !== null ? profitableDaysCount >= config.minProfitableDays : null;

  return {
    latestBalance,
    latestEquity,
    todayPnl,
    dailyLoss: { limitUsd: dailyLimit, bufferPct: dailyBuffer, light: dailyLight },
    maxLoss: { limitUsd: maxLimit, bufferPct: maxBuffer, light: maxLight },
    overallLight: worseLight(dailyLight, maxLight),
    profitTargetProgressPct: profitTargetProgressPct(config.startBalance, config.profitTargetPct, latestEquity),
    consistency: { actualPct: actualConsistency, ok: consistencyOk },
    tradingDays: { count: tradingDaysCount, required: config.minTradingDays, ok: tradingDaysOk },
    profitableDays: { count: profitableDaysCount, required: config.minProfitableDays, ok: profitableDaysOk },
    daysUntilInactive:
      config.inactivityDays !== null && lastActivityAt
        ? daysUntilInactive(lastActivityAt, config.inactivityDays, now)
        : null,
  };
}
