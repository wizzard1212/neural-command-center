import { API_BASE } from "./api";

export interface WeekStats {
  tradeCount: number;
  winRatePct: number | null;
  profitFactor: number | null;
  averageR: number | null;
  maxDrawdownR: number | null;
  longestWinStreak: number;
  longestLossStreak: number;
  totalResultR: number;
  totalResultUsd: number;
  ruleBreaches: number;
  ruleBreachLessons: string[];
}

export interface WeeklyReviewNarrative {
  zusammenfassungDe: string;
  muster: string[];
  regelbrueche: string[];
  verbesserungen: string[];
}

export interface Review {
  id: number;
  week: string;
  contentJson: { narrative: WeeklyReviewNarrative | null; stats: WeekStats; error?: string } | null;
  vaultPath: string | null;
  createdAt: string;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: init?.body ? { "Content-Type": "application/json" } : undefined,
    ...init,
  });
  if (!res.ok) throw new Error(`API-Fehler ${res.status} bei ${path}`);
  return res.json() as Promise<T>;
}

export function listReviews() {
  return request<Review[]>("/reviews");
}

export function generateReview() {
  return request<{ status: "ok" | "partial"; reviewId?: number }>("/reviews/generate", { method: "POST" });
}
