import { env } from "../../lib/env.js";
import type { SocialSource, SocialSourceResult } from "../socialSource.js";

const SEARCH_TERMS = ["Fed", "Nasdaq", "Bitcoin"];

interface SearchResponse {
  items: { id: { videoId: string }; snippet: { title: string; publishedAt: string; channelTitle: string } }[];
}

async function searchTerm(term: string): Promise<SearchResponse["items"]> {
  const url =
    `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&order=viewCount` +
    `&maxResults=5&videoCategoryId=25&q=${encodeURIComponent(term)}&key=${env.YOUTUBE_API_KEY}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
  if (!res.ok) throw new Error(`YouTube HTTP ${res.status}`);
  const data = (await res.json()) as SearchResponse;
  return data.items ?? [];
}

/** Abschnitt 7.1: "YouTube Data API (optional, kostenloser Key): trendende
 * Videos in Finanz-/Trading-Kategorie, Suchbegriffe wie 'Fed', 'Nasdaq',
 * 'Bitcoin'." Kategorie 25 = News & Politics (YouTube hat keine reine
 * Finanz-Kategorie). */
export const youtubeSource: SocialSource = {
  id: "youtube",
  label: "YouTube",
  configured: () => Boolean(env.YOUTUBE_API_KEY),
  async fetch(): Promise<SocialSourceResult> {
    if (!this.configured()) {
      return { available: false, items: [], reason: "YOUTUBE_API_KEY fehlt." };
    }
    try {
      const results = await Promise.allSettled(SEARCH_TERMS.map(searchTerm));
      const items = results.flatMap((r, i) => {
        if (r.status !== "fulfilled") return [];
        return r.value.map((v) => ({
          platform: "youtube",
          externalId: v.id.videoId,
          title: v.snippet.title,
          url: `https://www.youtube.com/watch?v=${v.id.videoId}`,
          metricValue: null,
          metricType: null,
          ts: v.snippet.publishedAt,
          topic: SEARCH_TERMS[i],
          sentiment: null,
        }));
      });
      const failedCount = results.filter((r) => r.status === "rejected").length;
      return {
        available: items.length > 0,
        items,
        reason: failedCount > 0 ? `${failedCount}/${SEARCH_TERMS.length} Suchbegriffe fehlgeschlagen.` : undefined,
      };
    } catch (err) {
      return { available: false, items: [], reason: (err as Error).message };
    }
  },
};
