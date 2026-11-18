import { API_BASE } from "./api";
import type { TrafficLight } from "./accountsApi";

export type WatchlistBias = "bullisch" | "neutral" | "baerisch";

export interface WatchlistBiasEntry {
  instrument: string;
  bias: WatchlistBias;
  zonen: string;
  treiber: string;
}

export interface SourceRef {
  aussage: string;
  link: string;
}

export interface BriefingNarrative {
  lageInDreiSaetzen: string;
  watchlistBias: WatchlistBiasEntry[];
  zusammenhaenge: string[];
  zentralbankenGeopolitik: string;
  krypto: string;
  socialStimmung: string;
  fokusRegelDesTages: string;
  quellen: SourceRef[];
}

export interface WatchlistQuote {
  instrument: string;
  price: number;
  changePct: number;
}

export interface CollectResult<T> {
  available: boolean;
  data: T | null;
  reason?: string;
}

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

export interface OpenTradingTodo {
  notePath: string;
  noteTitle: string;
  text: string;
}

export interface SocialTrendSummary {
  topic: string;
  mentions24h: number;
  zscore: number;
}

export interface BriefingContentJson {
  narrative: BriefingNarrative | null;
  prices: CollectResult<WatchlistQuote[]>;
  calendar: CollectResult<unknown[]>;
  cot: CollectResult<unknown[]>;
  riskRules: CollectResult<string>;
  openTodos: OpenTradingTodo[];
  accountsToday: AccountsTodaySummary;
  socialTrends: CollectResult<SocialTrendSummary[]>;
  recentNews: unknown[];
  error?: string;
}

export interface Briefing {
  id: number;
  date: string;
  status: "pending" | "ok" | "partial" | "failed";
  contentJson: BriefingContentJson | null;
  markdown: string | null;
  vaultPath: string | null;
  createdAt: string;
}

export interface GenerateBriefingResult {
  status: "ok" | "partial" | "failed";
  briefingId?: number;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!res.ok) throw new Error(`API-Fehler ${res.status} bei ${path}`);
  return res.json() as Promise<T>;
}

export async function fetchLatestBriefing(): Promise<Briefing | null> {
  const res = await fetch(`${API_BASE}/briefing/latest`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`API-Fehler ${res.status} bei /briefing/latest`);
  return res.json() as Promise<Briefing>;
}

export function fetchBriefingByDate(date: string) {
  return request<Briefing>(`/briefing/${date}`);
}

export function listBriefings() {
  return request<Briefing[]>("/briefing");
}

export function generateBriefing() {
  return request<GenerateBriefingResult>("/briefing/generate", { method: "POST" });
}

export function fetchBriefingSchedule() {
  return request<{ cron: string }>("/briefing/schedule");
}

export function updateBriefingSchedule(cron: string) {
  return request<{ cron: string }>("/briefing/schedule", { method: "PUT", body: JSON.stringify({ cron }) });
}
