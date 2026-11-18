import { API_BASE } from "./api";

export interface Prediction {
  id: number;
  createdAt: string;
  text: string;
  asset: string | null;
  horizon: string | null;
  outcome: "open" | "hit" | "miss";
  resolvedAt: string | null;
}

export interface HitRate {
  hitRatePct: number | null;
  resolvedCount: number;
  openCount: number;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: init?.body ? { "Content-Type": "application/json" } : undefined,
    ...init,
  });
  if (!res.ok) throw new Error(`API-Fehler ${res.status} bei ${path}`);
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export function fetchPredictions() {
  return request<{ items: Prediction[]; hitRate: HitRate }>("/predictions");
}

export function createPrediction(input: { text: string; asset?: string | null; horizon?: string | null }) {
  return request<Prediction>("/predictions", { method: "POST", body: JSON.stringify(input) });
}

export function resolvePrediction(id: number, outcome: "hit" | "miss" | "open") {
  return request<Prediction>(`/predictions/${id}/resolve`, { method: "PUT", body: JSON.stringify({ outcome }) });
}

export function deletePrediction(id: number) {
  return request<void>(`/predictions/${id}`, { method: "DELETE" });
}
