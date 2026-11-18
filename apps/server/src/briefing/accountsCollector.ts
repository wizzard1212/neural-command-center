import { copyRiskCalculator, type TrafficLight } from "../accounts/risk.js";
import { computeAccountSummary, type AccountRuleConfig } from "../accounts/summary.js";
import { listAccounts, listSnapshots } from "../accounts/repo.js";

export interface AccountTodayEntry {
  id: number;
  label: string;
  bufferUsd: number;
  bufferPct: number;
  light: TrafficLight;
}

export interface CopyGroupRisk {
  copyGroup: string;
  totalRiskUsd: number;
  exceedsStrictest: boolean;
}

export interface AccountsTodaySummary {
  accounts: AccountTodayEntry[];
  strictestAccountLabel: string | null;
  allowedRiskUsdAt0_5Pct: number | null;
  allowedRiskUsdAt1Pct: number | null;
  copyGroupRisks: CopyGroupRisk[];
}

function toRuleConfig(account: ReturnType<typeof listAccounts>[number]): AccountRuleConfig {
  return {
    startBalance: account.startBalance,
    dailyLossPct: account.dailyLossPct,
    dailyLossMode: account.dailyLossMode as AccountRuleConfig["dailyLossMode"],
    maxLossPct: account.maxLossPct,
    maxLossMode: account.maxLossMode as AccountRuleConfig["maxLossMode"],
    profitTargetPct: account.profitTargetPct,
    consistencyPct: account.consistencyPct,
    minTradingDays: account.minTradingDays,
    minProfitableDays: account.minProfitableDays,
    inactivityDays: account.inactivityDays,
  };
}

/** Abschnitt 5.2/9: Konten-Puffer, erlaubtes Risiko pro Trade (Merlins eigene
 * 0,5-1%-Regel, gerechnet aufs strengste Konto) und Gesamtrisiko je
 * Copy-Gruppe. Baut auf der bereits in Phase 3 getesteten Risikologik auf. */
export function collectAccountsToday(): AccountsTodaySummary {
  const allAccounts = listAccounts().filter((a) => a.phase !== "lost");
  const now = new Date();

  const accounts: AccountTodayEntry[] = allAccounts.map((account) => {
    const snapshots = listSnapshots(account.id);
    const lastActivity = snapshots.at(-1)?.ts ?? account.createdAt;
    const summary = computeAccountSummary(toRuleConfig(account), snapshots, now, new Date(lastActivity));
    return {
      id: account.id,
      label: `${account.firm} ${account.program}`,
      bufferUsd: summary.dailyLoss.limitUsd * (summary.dailyLoss.bufferPct / 100),
      bufferPct: summary.dailyLoss.bufferPct,
      light: summary.overallLight,
    };
  });

  let strictest: (typeof allAccounts)[number] | null = null;
  for (const a of allAccounts) {
    if (!strictest || a.dailyLossPct < strictest.dailyLossPct) strictest = a;
  }

  const copyGroups = [...new Set(allAccounts.map((a) => a.copyGroup).filter((g): g is string => Boolean(g)))];
  const copyGroupRisks: CopyGroupRisk[] = copyGroups.map((group) => {
    const groupAccounts = allAccounts.filter((a) => a.copyGroup === group);
    const withLimits = groupAccounts.map((a) => {
      const entry = accounts.find((e) => e.id === a.id)!;
      const dailyLossLimitUsd = entry.bufferPct > 0 ? entry.bufferUsd / (entry.bufferPct / 100) : 0;
      return { id: a.id, size: a.size, dailyLossLimitUsd };
    });
    const result = copyRiskCalculator(1, withLimits);
    return { copyGroup: group, totalRiskUsd: result.totalRiskUsd, exceedsStrictest: result.exceedsStrictest };
  });

  return {
    accounts,
    strictestAccountLabel: strictest ? `${strictest.firm} ${strictest.program}` : null,
    allowedRiskUsdAt0_5Pct: strictest ? strictest.startBalance * 0.005 : null,
    allowedRiskUsdAt1Pct: strictest ? strictest.startBalance * 0.01 : null,
    copyGroupRisks,
  };
}
