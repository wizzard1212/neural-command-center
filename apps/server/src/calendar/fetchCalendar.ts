import { env } from "../lib/env.js";
import { upsertCalendarEvent, type RawCalendarEvent } from "./repo.js";

interface FmpCalendarRow {
  date: string;
  country: string;
  event: string;
  impact?: string;
  estimate?: number | string | null;
  previous?: number | string | null;
  actual?: number | string | null;
}

function normalizeImpact(raw: string | undefined): "low" | "medium" | "high" {
  const v = (raw ?? "").toLowerCase();
  if (v === "high") return "high";
  if (v === "medium") return "medium";
  return "low";
}

/** Abschnitt 10: Wirtschaftskalender der nächsten 7 Tage, über FMP (dieselbe
 * Quelle wie im Morgen-Briefing, Abschnitt 5.2, dort aber nur für den
 * Fließtext genutzt – hier dauerhaft in calendar_events gespeichert für die
 * Kalender-Seite und die Kein-Trade-Fenster-Berechnung). */
export async function fetchAndStoreCalendar(): Promise<{ available: boolean; count: number; reason?: string }> {
  if (!env.FMP_API_KEY) {
    return { available: false, count: 0, reason: "FMP_API_KEY fehlt." };
  }

  const from = new Date().toISOString().slice(0, 10);
  const to = new Date(Date.now() + 7 * 86_400_000).toISOString().slice(0, 10);

  try {
    const url = `https://financialmodelingprep.com/api/v3/economic_calendar?from=${from}&to=${to}&apikey=${env.FMP_API_KEY}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
    if (!res.ok) throw new Error(`FMP HTTP ${res.status}`);
    const rows = (await res.json()) as FmpCalendarRow[];

    for (const row of rows) {
      const event: RawCalendarEvent = {
        ts: new Date(row.date).toISOString(),
        country: row.country,
        title: row.event,
        impact: normalizeImpact(row.impact),
        forecast: row.estimate != null ? String(row.estimate) : null,
        previous: row.previous != null ? String(row.previous) : null,
        actual: row.actual != null ? String(row.actual) : null,
      };
      upsertCalendarEvent(event);
    }

    return { available: true, count: rows.length };
  } catch (err) {
    return { available: false, count: 0, reason: (err as Error).message };
  }
}
