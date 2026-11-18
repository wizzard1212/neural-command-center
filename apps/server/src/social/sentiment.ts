import { DEFAULT_WATCHLIST } from "@ncc/shared";

export interface SentimentInput {
  topic: string | null;
  sentiment: "bullish" | "bearish" | "neutral" | null;
}

export interface AssetSentiment {
  asset: string;
  bullishPct: number;
  bearishPct: number;
  neutralPct: number;
  sampleSize: number;
  extreme: "bullish" | "bearish" | null;
}

const EXTREME_THRESHOLD_PCT = 80;
const MIN_SAMPLE_SIZE = 5;

/** Abschnitt 7.2: "Sentiment-Barometer pro Watchlist-Asset (bullisch/
 * bärisch-Anteil), mit Warnhinweis bei Extremwerten." Nur Items mit
 * explizitem Sentiment (aktuell: LunarCrush) fließen ein – reine
 * Erwähnungen ohne Sentiment-Wert (Reddit, Trends) zählen nicht mit, um
 * keine erfundene Stimmung vorzutäuschen. */
export function computeSentimentBarometer(
  items: SentimentInput[],
  watchlist: readonly string[] = DEFAULT_WATCHLIST,
): AssetSentiment[] {
  return watchlist.map((asset) => {
    const forAsset = items.filter((i) => i.topic === asset && i.sentiment !== null);
    const sampleSize = forAsset.length;

    if (sampleSize === 0) {
      return { asset, bullishPct: 0, bearishPct: 0, neutralPct: 0, sampleSize: 0, extreme: null };
    }

    const bullish = forAsset.filter((i) => i.sentiment === "bullish").length;
    const bearish = forAsset.filter((i) => i.sentiment === "bearish").length;
    const neutral = sampleSize - bullish - bearish;

    const bullishPct = (bullish / sampleSize) * 100;
    const bearishPct = (bearish / sampleSize) * 100;
    const neutralPct = (neutral / sampleSize) * 100;

    let extreme: "bullish" | "bearish" | null = null;
    if (sampleSize >= MIN_SAMPLE_SIZE) {
      if (bullishPct >= EXTREME_THRESHOLD_PCT) extreme = "bullish";
      else if (bearishPct >= EXTREME_THRESHOLD_PCT) extreme = "bearish";
    }

    return { asset, bullishPct, bearishPct, neutralPct, sampleSize, extreme };
  });
}
