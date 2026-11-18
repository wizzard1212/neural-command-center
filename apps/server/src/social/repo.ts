import { eq, and, gte, desc, sql } from "drizzle-orm";
import { socialItems, trendTopics } from "@ncc/shared";
import { db } from "../db/client.js";
import type { SocialRawItem } from "./socialSource.js";

/** Fügt ein Social-Item ein, falls es (platform, externalId) noch nicht gibt –
 * verhindert Duplikate bei jedem neuen Scheduler-Lauf. Gibt true zurück, wenn
 * tatsächlich neu eingefügt wurde. */
export function upsertSocialItem(item: SocialRawItem): boolean {
  const existing = db
    .select({ id: socialItems.id })
    .from(socialItems)
    .where(and(eq(socialItems.platform, item.platform), eq(socialItems.externalId, item.externalId)))
    .get();
  if (existing) return false;

  db.insert(socialItems).values(item).run();
  return true;
}

export function listSocialItems(filters: { platform?: string; limit?: number } = {}) {
  const conditions = [];
  if (filters.platform) conditions.push(eq(socialItems.platform, filters.platform));
  return db
    .select()
    .from(socialItems)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(socialItems.ts))
    .limit(filters.limit ?? 100)
    .all();
}

export function getSocialItem(id: number) {
  return db.select().from(socialItems).where(eq(socialItems.id, id)).get();
}

export function listRecentSocialItems(hoursBack = 24) {
  const since = new Date(Date.now() - hoursBack * 60 * 60 * 1000).toISOString();
  return db.select().from(socialItems).where(gte(socialItems.ts, since)).all();
}

/** Zählt Erwähnungen pro Topic in den letzten N Stunden (für Hype-Radar und
 * Sentiment-Aggregation), gruppiert über alle Plattformen. */
export function countMentionsByTopic(hoursBack: number): Map<string, number> {
  const since = new Date(Date.now() - hoursBack * 60 * 60 * 1000).toISOString();
  const rows = db
    .select({ topic: socialItems.topic, count: sql<number>`count(*)` })
    .from(socialItems)
    .where(and(gte(socialItems.ts, since), sql`${socialItems.topic} is not null`))
    .groupBy(socialItems.topic)
    .all();
  return new Map(rows.map((r) => [r.topic as string, r.count]));
}

export function insertTrendTopicSnapshot(entry: {
  topic: string;
  platform: string;
  mentions24h: number;
  mentionsAvg7d: number;
  zscore: number;
}) {
  db.insert(trendTopics)
    .values({ ...entry, ts: new Date().toISOString() })
    .run();
}

/** Historische Tages-Erwähnungen eines Topics der letzten 7 Tage (für den
 * Z-Score-Vergleich), ein Wert pro Kalendertag (letzter Snapshot des Tages). */
export function getTopicHistory(topic: string, daysBack = 7): number[] {
  const since = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000).toISOString();
  const rows = db
    .select({ mentions: trendTopics.mentions24h, ts: trendTopics.ts })
    .from(trendTopics)
    .where(and(eq(trendTopics.topic, topic), gte(trendTopics.ts, since)))
    .orderBy(trendTopics.ts)
    .all();

  const byDay = new Map<string, number>();
  for (const row of rows) byDay.set(row.ts.slice(0, 10), row.mentions);
  return [...byDay.values()];
}

export function listLatestTrendTopics(limit = 5) {
  // Je Topic nur den jüngsten Snapshot – über ein Fenster der letzten 25h
  // begrenzen wir, dass veraltete Topics ohne neue Erwähnungen verschwinden.
  const since = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString();
  const rows = db.select().from(trendTopics).where(gte(trendTopics.ts, since)).orderBy(desc(trendTopics.ts)).all();

  const seen = new Set<string>();
  const latestPerTopic = [];
  for (const row of rows) {
    if (seen.has(row.topic)) continue;
    seen.add(row.topic);
    latestPerTopic.push(row);
  }
  return latestPerTopic.sort((a, b) => b.zscore - a.zscore).slice(0, limit);
}

/** Letzte N Tage Sparkline-Punkte für ein Topic (für die Hype-Radar-UI). */
export function getTopicSparkline(topic: string, daysBack = 7): number[] {
  return getTopicHistory(topic, daysBack);
}
