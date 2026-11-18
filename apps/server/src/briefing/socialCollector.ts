import { listLatestTrendTopics } from "../social/repo.js";
import type { CollectResult } from "./priceCollector.js";

export interface SocialTrendSummary {
  topic: string;
  mentions24h: number;
  zscore: number;
}

/** Abschnitt 5.2, Datenpunkt "Social-Trends der letzten 24h (Kapitel 7.1)" –
 * liest die bereits vom Social-Scheduler (Phase 7) berechneten Hype-Radar-
 * Snapshots, ohne selbst Netzwerkaufrufe zu machen. */
export function collectSocialTrends(): CollectResult<SocialTrendSummary[]> {
  const topics = listLatestTrendTopics(5).map((t) => ({
    topic: t.topic,
    mentions24h: t.mentions24h,
    zscore: t.zscore,
  }));

  if (topics.length === 0) {
    return { available: false, data: null, reason: "Noch keine Social-Daten gesammelt." };
  }
  return { available: true, data: topics };
}
