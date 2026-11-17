export const API_BASE = "http://127.0.0.1:4000";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!res.ok) {
    throw new Error(`API-Fehler ${res.status} bei ${path}`);
  }
  return res.json() as Promise<T>;
}

export interface ConnectionStatusDto {
  source: "vault" | "mt5" | "feeds" | "ki";
  status: "connected" | "error" | "disconnected";
  lastCheckedAt: string;
  message?: string;
}

export interface SessionStateDto {
  key: "asia" | "london" | "new_york";
  isOpen: boolean;
  minutesUntilNextOpen: number;
  minutesUntilClose: number | null;
}

export interface StatusResponse {
  connections: ConnectionStatusDto[];
  sessions: SessionStateDto[];
  watchlist: readonly string[];
  serverTime: string;
}

export function fetchStatus() {
  return request<StatusResponse>("/status");
}
