import { env } from "../../lib/env.js";
import { findMentionedSymbols } from "../tickerMatch.js";
import type { SocialSource, SocialSourceResult, SocialRawItem } from "../socialSource.js";

const SUBREDDITS = ["wallstreetbets", "stocks", "Forex", "Daytrading", "CryptoCurrency", "Bitcoin"];
const USER_AGENT = "neural-command-center/1.0 (lokales Trading-Dashboard, read-only)";

let cachedToken: { value: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now()) return cachedToken.value;

  const basic = Buffer.from(`${env.REDDIT_CLIENT_ID}:${env.REDDIT_CLIENT_SECRET}`).toString("base64");
  const res = await fetch("https://www.reddit.com/api/v1/access_token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": USER_AGENT,
    },
    body: "grant_type=client_credentials",
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`Reddit-Token HTTP ${res.status}`);
  const data = (await res.json()) as { access_token: string; expires_in: number };
  cachedToken = { value: data.access_token, expiresAt: Date.now() + (data.expires_in - 60) * 1000 };
  return data.access_token;
}

interface RedditListing {
  data: {
    children: { data: { id: string; title: string; ups: number; num_comments: number; permalink: string; created_utc: number } }[];
  };
}

async function fetchSubredditHot(subreddit: string, token: string): Promise<SocialRawItem[]> {
  const res = await fetch(`https://oauth.reddit.com/r/${subreddit}/hot?limit=10`, {
    headers: { Authorization: `Bearer ${token}`, "User-Agent": USER_AGENT },
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`r/${subreddit} HTTP ${res.status}`);
  const listing = (await res.json()) as RedditListing;

  return listing.data.children.map(({ data: post }) => {
    const symbols = findMentionedSymbols(post.title);
    return {
      platform: "reddit",
      externalId: post.id,
      title: post.title,
      url: `https://reddit.com${post.permalink}`,
      metricValue: post.ups,
      metricType: "upvotes",
      ts: new Date(post.created_utc * 1000).toISOString(),
      topic: symbols[0] ?? `r/${subreddit}`,
      sentiment: null,
    };
  });
}

/** Abschnitt 7.1: Top/Hot-Posts aus Merlins Watchlist-Subreddits +
 * Erwähnungshäufigkeit von Tickern. OAuth-App im "script"-Modus
 * (client_credentials), kein Nutzer-Login nötig. */
export const redditSource: SocialSource = {
  id: "reddit",
  label: "Reddit",
  configured: () => Boolean(env.REDDIT_CLIENT_ID && env.REDDIT_CLIENT_SECRET),
  async fetch(): Promise<SocialSourceResult> {
    if (!this.configured()) {
      return { available: false, items: [], reason: "REDDIT_CLIENT_ID/REDDIT_CLIENT_SECRET fehlen." };
    }
    try {
      const token = await getAccessToken();
      const results = await Promise.allSettled(SUBREDDITS.map((sub) => fetchSubredditHot(sub, token)));
      const items = results.flatMap((r) => (r.status === "fulfilled" ? r.value : []));
      const failedCount = results.filter((r) => r.status === "rejected").length;
      return {
        available: items.length > 0,
        items,
        reason: failedCount > 0 ? `${failedCount}/${SUBREDDITS.length} Subreddits nicht erreichbar.` : undefined,
      };
    } catch (err) {
      return { available: false, items: [], reason: (err as Error).message };
    }
  },
};
