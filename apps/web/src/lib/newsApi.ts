import { API_BASE } from "./api";

export interface NewsItem {
  id: number;
  source: string;
  url: string;
  title: string;
  publishedAt: string;
  summaryDe: string | null;
  relevance: number | null;
  category: string | null;
  assetsJson: string[] | null;
  directionJson: Record<string, string> | null;
  clusterId: string | null;
}

export interface NewsCluster {
  representative: NewsItem;
  sourceCount: number;
  sources: string[];
}

export interface FeedSource {
  id: string;
  name: string;
  url: string;
  enabled: boolean;
  status: { status: "connected" | "error"; lastCheckedAt: string; message?: string; itemsFound?: number } | null;
}

export interface ContentIdea {
  id: number;
  sourceType: string;
  sourceId: string | null;
  idea: string;
  hookDe: string | null;
  hookEn: string | null;
  createdAt: string;
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
  return res.json() as Promise<T>;
}

export const fetchNews = (filters: {
  asset?: string;
  category?: string;
  minRelevance?: number;
  source?: string;
  from?: string;
}) => {
  const params = new URLSearchParams();
  if (filters.asset) params.set("asset", filters.asset);
  if (filters.category) params.set("category", filters.category);
  if (filters.minRelevance) params.set("minRelevance", String(filters.minRelevance));
  if (filters.source) params.set("source", filters.source);
  if (filters.from) params.set("from", filters.from);
  const qs = params.toString();
  return request<NewsCluster[]>(`/news${qs ? `?${qs}` : ""}`);
};

export const fetchNewsSources = () => request<FeedSource[]>("/news/sources");
export const toggleNewsSource = (id: string, enabled: boolean) =>
  request<FeedSource[]>(`/news/sources/${id}`, { method: "PUT", body: JSON.stringify({ enabled }) });
export const refreshNews = () => request<{ ok: boolean }>("/news/refresh", { method: "POST" });
export const saveContentIdea = (newsId: number, hookDe?: string, hookEn?: string) =>
  request(`/news/${newsId}/content-idea`, { method: "POST", body: JSON.stringify({ hookDe, hookEn }) });
export const explainNews = (newsId: number) =>
  request<{ explanation: string }>(`/news/${newsId}/explain`, { method: "POST" });
export const fetchContentIdeas = () => request<ContentIdea[]>("/content-ideas");

export interface ScriptDraft {
  topic: string;
  title: string;
  script: string;
  vaultPath: string | null;
}

export const generateScriptForToday = () =>
  request<ScriptDraft>("/content-ideas/script-for-today", { method: "POST" });
