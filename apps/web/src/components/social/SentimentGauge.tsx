import clsx from "clsx";
import { AlertTriangle } from "lucide-react";
import type { AssetSentiment } from "../../lib/socialApi";

// Abschnitt 7.3: "Sentiment-Barometer der Watchlist als Halbkreis-
// Messinstrumente (Gauges)." Netto-Stimmung (-100 bärisch .. +100 bullisch)
// wird als Nadel auf einem Halbkreis dargestellt.
const RADIUS = 40;
const CENTER_X = 50;
const CENTER_Y = 48;

function needleEndpoint(netSentiment: number) {
  const angleDeg = 180 - ((netSentiment + 100) / 200) * 180;
  const rad = (angleDeg * Math.PI) / 180;
  return { x: CENTER_X + RADIUS * Math.cos(rad), y: CENTER_Y - RADIUS * Math.sin(rad) };
}

export function SentimentGauge({ sentiment }: { sentiment: AssetSentiment }) {
  const { asset, bullishPct, bearishPct, sampleSize, extreme } = sentiment;
  const netSentiment = bullishPct - bearishPct;
  const needle = needleEndpoint(sampleSize > 0 ? netSentiment : 0);
  const gradientId = `sentiment-gauge-${asset}`;

  return (
    <div className="flex flex-col items-center gap-1">
      <svg viewBox="0 0 100 55" className="w-full max-w-[140px]">
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#FF5A5A" />
            <stop offset="50%" stopColor="#45526B" />
            <stop offset="100%" stopColor="#00FF9D" />
          </linearGradient>
        </defs>
        <path
          d={`M ${CENTER_X - RADIUS} ${CENTER_Y} A ${RADIUS} ${RADIUS} 0 0 1 ${CENTER_X + RADIUS} ${CENTER_Y}`}
          fill="none"
          stroke={`url(#${gradientId})`}
          strokeWidth={6}
          strokeLinecap="round"
          opacity={sampleSize > 0 ? 1 : 0.25}
        />
        {sampleSize > 0 && (
          <line
            x1={CENTER_X}
            y1={CENTER_Y}
            x2={needle.x}
            y2={needle.y}
            stroke="#C9D6E8"
            strokeWidth={2}
            strokeLinecap="round"
          />
        )}
        <circle cx={CENTER_X} cy={CENTER_Y} r={3} fill="#C9D6E8" />
      </svg>
      <div className="font-mono-num text-sm text-text">{asset}</div>
      <div className="text-xs text-text-faint">
        {sampleSize > 0 ? `${Math.round(bullishPct)}% bullisch · ${Math.round(bearishPct)}% bärisch` : "keine Daten"}
      </div>
      {extreme && (
        <div
          className={clsx(
            "flex items-center gap-1 text-[11px]",
            extreme === "bullish" ? "text-orange" : "text-red",
          )}
        >
          <AlertTriangle size={11} />
          {extreme === "bullish" ? "Extreme Euphorie" : "Extreme Angst"} – historisch oft Kontraindikator
        </div>
      )}
    </div>
  );
}
