import type { HypeRadarEntry } from "../../lib/socialApi";

function Sparkline({ values }: { values: number[] }) {
  if (values.length < 2) return <div className="h-5 w-16 shrink-0" />;
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = max - min || 1;
  const points = values
    .map((v, i) => `${(i / (values.length - 1)) * 100},${20 - ((v - min) / range) * 20}`)
    .join(" ");
  return (
    <svg viewBox="0 0 100 20" className="h-5 w-16 shrink-0" preserveAspectRatio="none">
      <polyline points={points} fill="none" stroke="#00D4FF" strokeWidth={2} />
    </svg>
  );
}

// Abschnitt 7.3: "Oben: Hype-Radar als horizontale Leuchtbalken." Abschnitt
// 7.2: "Darstellung als Liste + kleiner Sparkline pro Thema."
export function HypeRadar({ entries }: { entries: HypeRadarEntry[] }) {
  if (entries.length === 0) {
    return <p className="text-text-faint text-sm">Noch keine Social-Daten gesammelt – läuft automatisch alle 15 Minuten.</p>;
  }

  const maxZscore = Math.max(...entries.map((e) => Math.abs(e.zscore)), 1);

  return (
    <div className="flex flex-col gap-2.5">
      {entries.map((entry) => {
        const widthPct = Math.min(100, (Math.max(entry.zscore, 0) / maxZscore) * 100);
        return (
          <div key={entry.topic} className="flex items-center gap-3">
            <span className="font-mono-num text-sm text-text w-16 shrink-0">{entry.topic}</span>
            <div className="flex-1 h-2 rounded-full bg-bg2 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-cyan to-green"
                style={{ width: `${Math.max(widthPct, entry.zscore > 0 ? 4 : 0)}%` }}
              />
            </div>
            <Sparkline values={entry.sparkline} />
            <span className="text-text-faint text-xs w-24 text-right shrink-0">
              {entry.mentions24h}/24h · Z {entry.zscore.toFixed(1)}
            </span>
          </div>
        );
      })}
    </div>
  );
}
