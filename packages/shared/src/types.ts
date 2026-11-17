export const NAV_SECTIONS = [
  { key: "zentrale", label: "Zentrale", icon: "brain" },
  { key: "news", label: "News-Feed", icon: "newspaper" },
  { key: "social", label: "Social-Feed", icon: "radio" },
  { key: "journal", label: "Trading-Journal", icon: "notebook" },
  { key: "konten", label: "Funded & Konten", icon: "bank" },
  { key: "kalender", label: "Kalender", icon: "calendar" },
  { key: "statistik", label: "Statistik", icon: "chart" },
  { key: "einstellungen", label: "Einstellungen", icon: "settings" },
] as const;

export type NavSectionKey = (typeof NAV_SECTIONS)[number]["key"];

export const DEFAULT_WATCHLIST = [
  "NQ", // US100
  "ES", // US500
  "XAUUSD",
  "EURUSD",
  "DXY",
  "US10Y",
  "BTC",
  "ETH",
] as const;

export type SourceKey = "vault" | "mt5" | "feeds" | "ki";
export type SourceStatus = "connected" | "error" | "disconnected";

export interface ConnectionStatus {
  source: SourceKey;
  status: SourceStatus;
  lastCheckedAt: string;
  message?: string;
}

export type SessionKey = "asia" | "london" | "new_york";

export interface SessionWindow {
  key: SessionKey;
  openUtc: string; // "HH:mm"
  closeUtc: string; // "HH:mm"
}

// WebSocket Events (Server -> Frontend)
export type WsEvent =
  | { type: "vault:changed"; path: string; kind: "created" | "modified" | "deleted" }
  | { type: "connection:status"; status: ConnectionStatus }
  | { type: "news:new"; newsItemId: number; relevance: number }
  | { type: "trade:new"; tradeId: number }
  | { type: "account:rule_violation"; accountId: number; message: string }
  | { type: "briefing:done"; briefingId: number };
