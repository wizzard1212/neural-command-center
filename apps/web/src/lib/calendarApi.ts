import { API_BASE } from "./api";

export interface CalendarEvent {
  id: number;
  ts: string;
  country: string;
  title: string;
  impact: "low" | "medium" | "high";
  forecast: string | null;
  previous: string | null;
  actual: string | null;
}

export interface NoTradeWindow {
  eventTs: string;
  eventTitle: string;
  country: string;
  accountId: number;
  accountLabel: string;
  startsAt: string;
  endsAt: string;
}

export interface NoTradeCountdown {
  activeNow: boolean;
  minutesUntilNext: number | null;
  next: NoTradeWindow | null;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: init?.body ? { "Content-Type": "application/json" } : undefined,
    ...init,
  });
  if (!res.ok) throw new Error(`API-Fehler ${res.status} bei ${path}`);
  return res.json() as Promise<T>;
}

export function fetchCalendarEvents(from?: string, to?: string) {
  const qs = new URLSearchParams();
  if (from) qs.set("from", from);
  if (to) qs.set("to", to);
  const query = qs.toString();
  return request<CalendarEvent[]>(`/calendar${query ? `?${query}` : ""}`);
}

export function fetchNoTradeWindows() {
  return request<{ windows: NoTradeWindow[]; countdown: NoTradeCountdown }>("/calendar/no-trade-windows");
}

export function refreshCalendar() {
  return request<{ available: boolean; count: number; reason?: string }>("/calendar/refresh", { method: "POST" });
}
