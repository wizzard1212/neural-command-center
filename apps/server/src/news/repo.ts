import { eq, isNull, gte, desc, and } from "drizzle-orm";
import { newsItems, contentIdeas } from "@ncc/shared";
import { db } from "../db/client.js";
import type { RawNewsItem } from "./rssFetcher.js";
import type { ExistingItem } from "./dedupe.js";

export function listRecentForDedupe(hoursBack = 72): ExistingItem[] {
  const since = new Date(Date.now() - hoursBack * 60 * 60 * 1000).toISOString();
  return db
    .select({ id: newsItems.id, url: newsItems.url, title: newsItems.title, clusterId: newsItems.clusterId })
    .from(newsItems)
    .where(gte(newsItems.publishedAt, since))
    .all();
}

export function insertNewsItem(raw: RawNewsItem, clusterId: string | null) {
  const result = db
    .insert(newsItems)
    .values({
      source: raw.source,
      url: raw.url,
      title: raw.title,
      publishedAt: raw.publishedAt,
      clusterId,
      rawJson: raw.rawJson,
    })
    .run();
  return Number(result.lastInsertRowid);
}

export function listNewsItems(filters: {
  from?: string;
  to?: string;
  limit?: number;
}) {
  const conditions = [];
  if (filters.from) conditions.push(gte(newsItems.publishedAt, filters.from));
  return db
    .select()
    .from(newsItems)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(newsItems.publishedAt))
    .limit(filters.limit ?? 300)
    .all();
}

export function getNewsItem(id: number) {
  return db.select().from(newsItems).where(eq(newsItems.id, id)).get();
}

export function listUnevaluated(limit = 20) {
  return db.select().from(newsItems).where(isNull(newsItems.relevance)).limit(limit).all();
}

export function updateEvaluation(
  id: number,
  evaluation: {
    relevance: number;
    category: string;
    summaryDe: string;
    assetsJson: string[];
    directionJson: Record<string, string>;
  },
) {
  db.update(newsItems).set(evaluation).where(eq(newsItems.id, id)).run();
}

export function createContentIdea(input: {
  sourceType: "news" | "social" | "manual";
  sourceId?: string;
  idea: string;
  hookDe?: string;
  hookEn?: string;
}) {
  const result = db
    .insert(contentIdeas)
    .values({ ...input, createdAt: new Date().toISOString() })
    .run();
  return db.select().from(contentIdeas).where(eq(contentIdeas.id, Number(result.lastInsertRowid))).get();
}

export function listContentIdeas() {
  return db.select().from(contentIdeas).orderBy(desc(contentIdeas.createdAt)).all();
}
