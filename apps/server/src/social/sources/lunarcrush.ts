import { env } from "../../lib/env.js";
import { DEFAULT_WATCHLIST } from "@ncc/shared";
import type { SocialSource, SocialSourceResult } from "../socialSource.js";

const CRYPTO_SYMBOLS = ["BTC", "ETH"] as const satisfies readonly (typeof DEFAULT_WATCHLIST)[number][];

interface LunarCoin {
  symbol: string;
  name: string;
  galaxy_score: number;
  alt_rank: number;
  social_volume_24h: number;
  sentiment: number; // 0-100, >50 = bullish-lastig
}

/** Abschnitt 7.1: "LunarCrush: Social-Volumen, Sentiment und Trend-Rang für
 * Krypto und Aktien." API-Endpunkt/-Form kann sich bei LunarCrush ändern –
 * ein Fehler hier darf den restlichen Social-Feed nie blockieren. */
export const lunarcrushSource: SocialSource = {
  id: "lunarcrush",
  label: "LunarCrush",
  configured: () => Boolean(env.LUNARCRUSH_API_KEY),
  async fetch(): Promise<SocialSourceResult> {
    if (!this.configured()) {
      return { available: false, items: [], reason: "LUNARCRUSH_API_KEY fehlt." };
    }
    try {
      const res = await fetch(
        `https://lunarcrush.com/api4/public/coins/list/v1?symbol=${CRYPTO_SYMBOLS.join(",")}`,
        { headers: { Authorization: `Bearer ${env.LUNARCRUSH_API_KEY}` }, signal: AbortSignal.timeout(10_000) },
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as { data: LunarCoin[] };

      const now = new Date().toISOString();
      const items = (data.data ?? [])
        .filter((c) => CRYPTO_SYMBOLS.includes(c.symbol as (typeof CRYPTO_SYMBOLS)[number]))
        .map((coin) => ({
          platform: "lunarcrush",
          externalId: `${coin.symbol}-${now.slice(0, 13)}`,
          title: `${coin.name}: Galaxy Score ${coin.galaxy_score}, Alt-Rank ${coin.alt_rank}`,
          url: `https://lunarcrush.com/coins/${coin.symbol.toLowerCase()}`,
          metricValue: coin.social_volume_24h,
          metricType: "social_volume_24h",
          ts: now,
          topic: coin.symbol,
          sentiment: (coin.sentiment >= 60 ? "bullish" : coin.sentiment <= 40 ? "bearish" : "neutral") as
            | "bullish"
            | "bearish"
            | "neutral",
        }));

      return { available: items.length > 0, items };
    } catch (err) {
      return { available: false, items: [], reason: (err as Error).message };
    }
  },
};
