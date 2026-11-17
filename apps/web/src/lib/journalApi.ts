import { API_BASE } from "./api";
import type { TradeDirection } from "@ncc/shared";

export interface Trade {
  id: number;
  accountId: number | null;
  copyGroup: string | null;
  instrument: string;
  direction: TradeDirection;
  openedAt: string | null;
  closedAt: string | null;
  session: "asia" | "london" | "new_york" | "overlap" | null;
  entry: number | null;
  sl: number | null;
  tp1: number | null;
  tp2: number | null;
  tp3: number | null;
  tpSplitJson: number[] | null;
  size: number | null;
  riskPct: number | null;
  riskUsd: number | null;
  rrPlanned: number | null;
  exitPricesJson: { price: number; sharePct: number }[] | null;
  resultR: number | null;
  resultUsd: number | null;
  status: "planned" | "open" | "closed" | "missed";
  setupTypesJson: string[] | null;
  timeframesJson: { htf?: string; entry?: string } | null;
  reasoning: string | null;
  emotionScore: number | null;
  emotionTagsJson: string[] | null;
  ruleChecksJson: Record<string, boolean> | null;
  followedPlan: boolean | null;
  lesson: string | null;
  vaultPath: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TradeImage {
  id: number;
  tradeId: number;
  path: string;
  kind: "before" | "after" | "htf" | "ltf";
  aiExtractJson: Record<string, unknown> | null;
}

export interface ChartExtraction {
  instrument: string | null;
  timeframe: string | null;
  direction: TradeDirection | null;
  entry: number | null;
  sl: number | null;
  tp1: number | null;
  tp2: number | null;
  tp3: number | null;
  visibleElements: string[];
  confidence: "hoch" | "mittel" | "niedrig";
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: init?.body ? { "Content-Type": "application/json" } : undefined,
    ...init,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.message ?? `API-Fehler ${res.status} bei ${path}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const fetchTrades = () => request<{ trade: Trade; images: TradeImage[] }[]>("/trades");
export const fetchTrade = (id: number) => request<{ trade: Trade; images: TradeImage[] }>(`/trades/${id}`);
export const createTrade = (body: Partial<Trade>) =>
  request<Trade>("/trades", { method: "POST", body: JSON.stringify(body) });
export const updateTrade = (id: number, body: Partial<Trade>) =>
  request<{ trade: Trade; images: TradeImage[] }>(`/trades/${id}`, { method: "PUT", body: JSON.stringify(body) });
export const deleteTrade = (id: number) => request<void>(`/trades/${id}`, { method: "DELETE" });

export const uploadTradeImage = (tradeId: number, dataUrl: string, kind: TradeImage["kind"]) =>
  request<TradeImage>(`/trades/${tradeId}/images`, { method: "POST", body: JSON.stringify({ dataUrl, kind }) });
export const deleteTradeImage = (id: number) => request<void>(`/trades/images/${id}`, { method: "DELETE" });

export function tradeImageUrl(path: string) {
  return `${API_BASE}/trades/images/raw/${encodeURIComponent(path)}`;
}

export const analyzeScreenshot = (dataUrl: string) =>
  request<ChartExtraction>("/trades/analyze-screenshot", { method: "POST", body: JSON.stringify({ dataUrl }) });
