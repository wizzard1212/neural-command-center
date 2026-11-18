import { and, eq, gte, lte, asc } from "drizzle-orm";
import { calendarEvents } from "@ncc/shared";
import { db } from "../db/client.js";

export interface RawCalendarEvent {
  ts: string;
  country: string;
  title: string;
  impact: "low" | "medium" | "high";
  forecast: string | null;
  previous: string | null;
  actual: string | null;
}

/** Dedupliziert über (ts, country, title) – FMP liefert für denselben Termin
 * bei jedem Abruf eine neue Zeile, Werte (forecast/actual) aktualisieren sich
 * aber bis zur Veröffentlichung. */
export function upsertCalendarEvent(event: RawCalendarEvent): void {
  const existing = db
    .select({ id: calendarEvents.id })
    .from(calendarEvents)
    .where(and(eq(calendarEvents.ts, event.ts), eq(calendarEvents.country, event.country), eq(calendarEvents.title, event.title)))
    .get();

  if (existing) {
    db.update(calendarEvents)
      .set({ impact: event.impact, forecast: event.forecast, previous: event.previous, actual: event.actual })
      .where(eq(calendarEvents.id, existing.id))
      .run();
  } else {
    db.insert(calendarEvents).values(event).run();
  }
}

export function listEventsInRange(from: string, to: string) {
  return db
    .select()
    .from(calendarEvents)
    .where(and(gte(calendarEvents.ts, from), lte(calendarEvents.ts, to)))
    .orderBy(asc(calendarEvents.ts))
    .all();
}

export function listUpcomingHighImpact(fromIso: string, limit = 10) {
  return db
    .select()
    .from(calendarEvents)
    .where(and(gte(calendarEvents.ts, fromIso), eq(calendarEvents.impact, "high")))
    .orderBy(asc(calendarEvents.ts))
    .limit(limit)
    .all();
}
