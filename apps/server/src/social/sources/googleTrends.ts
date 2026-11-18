import googleTrends from "google-trends-api";
import type { SocialSource, SocialSourceResult } from "../socialSource.js";

// Abschnitt 7.1: "Suchinteresse für frei wählbare Begriffe (inoffizielle
// Bibliothek, kann brechen -> als 'experimentell' kennzeichnen, Fehler
// abfangen)." Feste Begriffe passend zu Merlins Themen; könnten später über
// die settings-Tabelle konfigurierbar gemacht werden.
const TERMS = ["Fed", "Nasdaq", "Bitcoin", "Gold", "EURUSD"];

interface TimelineResponse {
  default: { timelineData: { time: string; value: number[] }[] };
}

async function fetchTermInterest(term: string) {
  const raw = await googleTrends.interestOverTime({
    keyword: term,
    startTime: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
  });
  const parsed = JSON.parse(raw) as TimelineResponse;
  const points = parsed.default?.timelineData ?? [];
  const latest = points.at(-1);
  return latest ? latest.value[0] : null;
}

/** Google Trends ist offiziell nicht öffentlich API-dokumentiert ("inoffizielle
 * Bibliothek") und kann jederzeit brechen – jeder Begriff einzeln abgesichert,
 * damit ein kaputter Begriff nicht die ganze Quelle lahmlegt. */
export const googleTrendsSource: SocialSource = {
  id: "google_trends",
  label: "Google Trends",
  configured: () => true,
  async fetch(): Promise<SocialSourceResult> {
    const now = new Date().toISOString();
    const results = await Promise.allSettled(TERMS.map((term) => fetchTermInterest(term)));

    const items = results.flatMap((r, i) => {
      if (r.status !== "fulfilled" || r.value === null) return [];
      return [
        {
          platform: "google_trends",
          externalId: `${TERMS[i]}-${now.slice(0, 10)}`,
          title: `Suchinteresse "${TERMS[i]}": ${r.value}/100`,
          url: `https://trends.google.com/trends/explore?q=${encodeURIComponent(TERMS[i])}`,
          metricValue: r.value,
          metricType: "search_interest",
          ts: now,
          topic: TERMS[i],
          sentiment: null,
        },
      ];
    });

    const failedCount = results.filter((r) => r.status === "rejected").length;
    return {
      available: items.length > 0,
      items,
      experimental: true,
      reason: failedCount > 0 ? `${failedCount}/${TERMS.length} Begriffe nicht abrufbar (experimentell).` : undefined,
    };
  },
};
