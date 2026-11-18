// Abschnitt 7.1: "X/Twitter nicht einbauen, stattdessen im Code eine
// Schnittstelle SocialSource vorsehen, damit man X später nachrüsten kann."
// Jede Quelle liefert eine flache Liste roher Items; Aggregation (Hype-Radar,
// Sentiment) passiert plattformübergreifend in hypeRadar.ts/sentiment.ts.

export interface SocialRawItem {
  platform: string;
  externalId: string;
  title: string | null;
  url: string | null;
  metricValue: number | null;
  metricType: string | null;
  ts: string;
  topic: string | null;
  sentiment: "bullish" | "bearish" | "neutral" | null;
}

export interface SocialSourceResult {
  available: boolean;
  items: SocialRawItem[];
  reason?: string;
  experimental?: boolean;
}

export interface SocialSource {
  id: string;
  label: string;
  configured(): boolean;
  fetch(): Promise<SocialSourceResult>;
}
