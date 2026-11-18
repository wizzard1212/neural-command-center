import Parser from "rss-parser";
import type { FeedConfig } from "./feedsConfig.js";

const parser = new Parser({ timeout: 10_000 });

export interface RawNewsItem {
  source: string;
  url: string;
  title: string;
  publishedAt: string; // ISO
  rawJson: Record<string, unknown>;
}

export interface FeedStatus {
  status: "connected" | "error";
  lastCheckedAt: string;
  message?: string;
  itemsFound?: number;
}

const feedStatuses = new Map<string, FeedStatus>();

export function getFeedStatuses(): Record<string, FeedStatus> {
  return Object.fromEntries(feedStatuses);
}

function parseDate(item: { isoDate?: string; pubDate?: string }): string {
  if (item.isoDate) return item.isoDate;
  if (item.pubDate) {
    const d = new Date(item.pubDate);
    if (!Number.isNaN(d.getTime())) return d.toISOString();
  }
  return new Date().toISOString();
}

/** Ruft einen einzelnen RSS-Feed ab. Wirft nie – ein Fehler bei einer Quelle
 * darf die anderen nicht blockieren (SPEC.md Abschnitt 5/6).
 *
 * Nutzt bewusst das eigene fetch() statt parser.parseURL(): rss-parsers
 * eingebautes HTTP-Handling kann bei einem Verbindungsabbruch mitten im
 * Request ("ECONNRESET") ein "error"-Event außerhalb der Promise-Kette
 * auslösen, das Node unhandled nennt – damit stürzt der gesamte Server ab,
 * statt dass nur diese eine Quelle als "Fehler" markiert wird. */
export async function fetchFeed(feed: FeedConfig): Promise<RawNewsItem[]> {
  try {
    const res = await fetch(feed.url, { signal: AbortSignal.timeout(10_000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const xml = await res.text();
    const parsed = await parser.parseString(xml);
    const items: RawNewsItem[] = (parsed.items ?? [])
      .filter((item) => item.link && item.title)
      .map((item) => ({
        source: feed.name,
        url: item.link!,
        title: item.title!.trim(),
        publishedAt: parseDate(item),
        rawJson: { contentSnippet: item.contentSnippet, categories: item.categories },
      }));

    feedStatuses.set(feed.id, {
      status: "connected",
      lastCheckedAt: new Date().toISOString(),
      itemsFound: items.length,
    });
    return items;
  } catch (err) {
    feedStatuses.set(feed.id, {
      status: "error",
      lastCheckedAt: new Date().toISOString(),
      message: (err as Error).message,
    });
    return [];
  }
}

export async function fetchAllFeeds(feeds: FeedConfig[]): Promise<RawNewsItem[]> {
  const enabled = feeds.filter((f) => f.enabled);
  const results = await Promise.all(enabled.map((f) => fetchFeed(f)));
  return results.flat();
}
