import { API_BASE } from "./api";

export interface SocialItem {
  id: number;
  platform: string;
  externalId: string;
  title: string | null;
  url: string | null;
  metricValue: number | null;
  metricType: string | null;
  ts: string;
  topic: string | null;
  sentiment: "bullish" | "bearish" | "neutral" | null;
}

export interface HypeRadarEntry {
  topic: string;
  platform: string;
  mentions24h: number;
  mentionsAvg7d: number;
  zscore: number;
  sparkline: number[];
}

export interface AssetSentiment {
  asset: string;
  bullishPct: number;
  bearishPct: number;
  neutralPct: number;
  sampleSize: number;
  extreme: "bullish" | "bearish" | null;
}

export interface SocialSourceStatus {
  id: string;
  label: string;
  status: "connected" | "error" | "disconnected";
  lastCheckedAt: string;
  itemsFound?: number;
  message?: string;
  experimental?: boolean;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: init?.body ? { "Content-Type": "application/json" } : undefined,
    ...init,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error((body as { message?: string })?.message ?? `API-Fehler ${res.status} bei ${path}`);
  }
  return res.json() as Promise<T>;
}

export function fetchHypeRadar() {
  return request<HypeRadarEntry[]>("/social/hype-radar");
}

export function fetchSocialFeed(platform?: string) {
  const qs = platform ? `?platform=${encodeURIComponent(platform)}` : "";
  return request<SocialItem[]>(`/social/feed${qs}`);
}

export function fetchSentiment() {
  return request<AssetSentiment[]>("/social/sentiment");
}

export function fetchSocialSources() {
  return request<SocialSourceStatus[]>("/social/sources");
}

export function refreshSocial() {
  return request<{ ok: true; newCount: number }>("/social/refresh", { method: "POST" });
}

export function saveSocialContentIdea(id: number, hookDe?: string, hookEn?: string) {
  return request(`/social/${id}/content-idea`, { method: "POST", body: JSON.stringify({ hookDe, hookEn }) });
}

export function generateSocialHookIdea(id: number) {
  return request<{ hookDe: string; hookEn: string }>(`/social/${id}/hook-idea`, { method: "POST" });
}
