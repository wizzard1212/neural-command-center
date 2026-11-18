import type { SocialSource, SocialSourceResult } from "../socialSource.js";

interface TrendingResponse {
  coins: { item: { id: string; symbol: string; name: string; market_cap_rank: number | null; score: number } }[];
}

/** Abschnitt 7.1: "CoinGecko Trending: meistgesuchte Coins." Braucht keinen
 * API-Key (öffentlicher Endpunkt). */
export const coingeckoTrendingSource: SocialSource = {
  id: "coingecko_trending",
  label: "CoinGecko Trending",
  configured: () => true,
  async fetch(): Promise<SocialSourceResult> {
    try {
      const res = await fetch("https://api.coingecko.com/api/v3/search/trending", {
        signal: AbortSignal.timeout(10_000),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as TrendingResponse;

      const now = new Date().toISOString();
      const items = data.coins.map(({ item }) => ({
        platform: "coingecko_trending",
        externalId: item.id,
        title: `${item.name} (${item.symbol.toUpperCase()})`,
        url: `https://www.coingecko.com/en/coins/${item.id}`,
        metricValue: item.score + 1, // CoinGecko-Rang ist 0-basiert, 1 = aktuell meistgesucht
        metricType: "trending_rank",
        ts: now,
        topic: item.symbol.toUpperCase(),
        sentiment: null,
      }));

      return { available: true, items };
    } catch (err) {
      return { available: false, items: [], reason: (err as Error).message };
    }
  },
};
