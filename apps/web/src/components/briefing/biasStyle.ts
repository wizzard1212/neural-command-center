import type { WatchlistBias } from "../../lib/briefingApi";

export const BIAS_LABEL: Record<WatchlistBias, string> = {
  bullisch: "Bullisch",
  neutral: "Neutral",
  baerisch: "Bärisch",
};

export const BIAS_CLASS: Record<WatchlistBias, string> = {
  bullisch: "text-green border-green/30 bg-green/10",
  neutral: "text-text-muted border-line bg-bg2",
  baerisch: "text-red border-red/30 bg-red/10",
};
