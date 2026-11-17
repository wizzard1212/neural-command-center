import { API_BASE } from "./api";

export type AccountPhase = "challenge_1" | "challenge_2" | "funded" | "lost" | "paused";
export type DailyLossMode = "balance" | "equity" | "higher_of_balance_equity";
export type MaxLossMode = "static" | "trailing";
export type TrafficColor = "green" | "yellow" | "red";

export interface Account {
  id: number;
  firm: string;
  program: string;
  size: number;
  phase: AccountPhase;
  platform: string;
  loginNo: string | null;
  server: string | null;
  purchasePrice: number | null;
  purchaseDate: string | null;
  startBalance: number;
  profitTargetPct: number | null;
  dailyLossPct: number;
  dailyLossMode: DailyLossMode;
  maxLossPct: number;
  maxLossMode: MaxLossMode;
  minTradingDays: number | null;
  minProfitableDays: number | null;
  consistencyPct: number | null;
  newsRuleMinutes: number | null;
  weekendAllowed: boolean;
  inactivityDays: number | null;
  profitSplitPct: number | null;
  payoutCap: number | null;
  payoutIntervalDays: number | null;
  copyGroup: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TrafficLight {
  color: TrafficColor;
  pulsing: boolean;
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

export interface Snapshot {
  id: number;
  accountId: number;
  ts: string;
  balance: number;
  equity: number;
  dailyPnl: number;
  source: string;
}

export interface Payout {
  id: number;
  accountId: number;
  date: string;
  gross: number;
  splitPct: number;
  fees: number;
  net: number;
  note: string | null;
}

export interface AccountEvent {
  id: number;
  accountId: number | null;
  ts: string;
  type: string;
  text: string;
}

export interface Goal {
  id: number;
  accountId: number | null;
  title: string;
  targetValue: number;
  unit: "usd" | "pct";
  deadline: string | null;
  currentValue: number;
  createdAt: string;
}

export interface AccountTemplate {
  key: string;
  label: string;
  firm: string;
  program: string;
  defaults: Record<string, unknown>;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    // Nur mit Content-Type: application/json senden, wenn tatsächlich ein Body
    // existiert – sonst lehnt Fastifys Body-Parser leere DELETE-Requests ab.
    headers: init?.body ? { "Content-Type": "application/json" } : undefined,
    ...init,
  });
  if (!res.ok) throw new Error(`API-Fehler ${res.status} bei ${path}`);
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const fetchAccounts = () => request<{ account: Account; summary: AccountSummary }[]>("/accounts");
export const fetchAccountDetail = (id: number) =>
  request<{ account: Account; summary: AccountSummary; snapshots: Snapshot[]; payouts: Payout[] }>(`/accounts/${id}`);
export const fetchAccountTemplates = () => request<AccountTemplate[]>("/accounts/templates");
export const fetchAccountsOverview = () =>
  request<{
    accountCount: number;
    managedCapitalUsd: number;
    totalEquity: number;
    totalDailyPnl: number;
    worstLight: TrafficColor;
    totalCost: number;
    netProfit: number;
    roiPct: number | null;
  }>("/accounts/overview");
export const fetchAccountFeed = () => request<AccountEvent[]>("/account-feed");

export const createAccount = (body: Partial<Account>) =>
  request<Account>("/accounts", { method: "POST", body: JSON.stringify(body) });
export const updateAccount = (id: number, body: Partial<Account>) =>
  request<Account>(`/accounts/${id}`, { method: "PUT", body: JSON.stringify(body) });
export const deleteAccount = (id: number) => request<void>(`/accounts/${id}`, { method: "DELETE" });

export const addSnapshot = (id: number, body: { balance: number; equity: number; dailyPnl: number }) =>
  request<Snapshot>(`/accounts/${id}/snapshots`, { method: "POST", body: JSON.stringify(body) });

export const addPayout = (id: number, body: { date: string; gross: number; splitPct: number; fees?: number; note?: string }) =>
  request<Payout>(`/accounts/${id}/payouts`, { method: "POST", body: JSON.stringify(body) });

export const postFeedUpdate = (text: string, accountId?: number | null) =>
  request<AccountEvent>("/account-feed", { method: "POST", body: JSON.stringify({ text, accountId }) });

export const fetchCopyRisk = (copyGroup: string, riskPct: number) =>
  request<{
    perAccount: { id: number; riskUsd: number }[];
    totalRiskUsd: number;
    strictestAccountId: number | null;
    strictestLimitUsd: number | null;
    exceedsStrictest: boolean;
  }>(`/accounts/copy-risk?copyGroup=${encodeURIComponent(copyGroup)}&riskPct=${riskPct}`);

export const fetchGoals = (accountId?: number | "global") =>
  request<Goal[]>(`/goals${accountId !== undefined ? `?accountId=${accountId}` : ""}`);
export const createGoal = (body: { accountId?: number | null; title: string; targetValue: number; unit: "usd" | "pct"; deadline?: string }) =>
  request<Goal>("/goals", { method: "POST", body: JSON.stringify(body) });
export const updateGoal = (id: number, body: Partial<{ currentValue: number }>) =>
  request<Goal>(`/goals/${id}`, { method: "PUT", body: JSON.stringify(body) });
export const deleteGoalApi = (id: number) => request<void>(`/goals/${id}`, { method: "DELETE" });

export function payoutsCsvUrl(year?: string) {
  return `${API_BASE}/accounts/export/payouts.csv${year ? `?year=${year}` : ""}`;
}
