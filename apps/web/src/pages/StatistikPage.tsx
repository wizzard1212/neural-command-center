import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { winRatePct, profitFactor, averageR, expectancyR, maxDrawdownR, longestStreak, groupStats } from "@ncc/shared";
import { GlassCard } from "../components/ui/GlassCard";
import { fetchTrades, type Trade } from "../lib/journalApi";

const SESSION_LABELS: Record<string, string> = {
  asia: "Asien",
  london: "London",
  new_york: "New York",
  overlap: "Overlap",
};

const WEEKDAY_LABELS = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];

type BreakdownKey = "setup" | "session" | "weekday" | "hour" | "instrument" | "emotion";

const BREAKDOWN_LABELS: Record<BreakdownKey, string> = {
  setup: "Setup-Typ",
  session: "Session",
  weekday: "Wochentag",
  hour: "Uhrzeit",
  instrument: "Instrument",
  emotion: "Emotion",
};

function breakdownKeyFn(kind: BreakdownKey): (t: Trade) => string[] {
  switch (kind) {
    case "setup":
      return (t) => t.setupTypesJson ?? [];
    case "session":
      return (t) => (t.session ? [SESSION_LABELS[t.session] ?? t.session] : []);
    case "weekday":
      return (t) => (t.openedAt ? [WEEKDAY_LABELS[new Date(t.openedAt).getDay()]] : []);
    case "hour":
      return (t) => (t.openedAt ? [`${new Date(t.openedAt).getHours()}:00`] : []);
    case "instrument":
      return (t) => [t.instrument];
    case "emotion":
      return (t) => t.emotionTagsJson ?? [];
  }
}

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <GlassCard>
      <div className="text-text-faint text-xs mb-1">{label}</div>
      <div className="font-mono-num text-xl text-text">{value}</div>
      {sub && <div className="text-text-faint text-xs mt-0.5">{sub}</div>}
    </GlassCard>
  );
}

function EquityCurveR({ trades }: { trades: Trade[] }) {
  const points = useMemo(() => {
    const closed = trades
      .filter((t) => t.resultR !== null && t.closedAt)
      .sort((a, b) => a.closedAt!.localeCompare(b.closedAt!));
    let cumulative = 0;
    return closed.map((t) => (cumulative += t.resultR!));
  }, [trades]);

  if (points.length < 2) {
    return <p className="text-text-faint text-sm py-8 text-center">Noch nicht genug geschlossene Trades.</p>;
  }

  const width = 600;
  const height = 160;
  const min = Math.min(0, ...points);
  const max = Math.max(0, ...points);
  const range = max - min || 1;
  const stepX = width / (points.length - 1);
  const toY = (v: number) => height - ((v - min) / range) * height;

  const path = points.map((v, i) => `${i === 0 ? "M" : "L"} ${i * stepX} ${toY(v)}`).join(" ");
  const zeroY = toY(0);

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-40">
      <line x1={0} y1={zeroY} x2={width} y2={zeroY} stroke="#1B2740" strokeDasharray="4 4" />
      <path d={path} fill="none" stroke="#00D4FF" strokeWidth={2} />
    </svg>
  );
}

export function StatistikPage() {
  const { data: tradesData } = useQuery({ queryKey: ["trades"], queryFn: fetchTrades });
  const [breakdown, setBreakdown] = useState<BreakdownKey>("setup");

  const trades = useMemo(() => tradesData?.map((t) => t.trade) ?? [], [tradesData]);
  const closedTrades = trades.filter((t) => t.status === "closed");

  const withRuleCompliance = closedTrades.filter((t) => Object.keys(t.ruleChecksJson ?? {}).length > 0);
  const ruleOk = withRuleCompliance.filter((t) => Object.values(t.ruleChecksJson ?? {}).every(Boolean));
  const ruleBroken = withRuleCompliance.filter((t) => !Object.values(t.ruleChecksJson ?? {}).every(Boolean));

  const breakdownStats = useMemo(() => groupStats(closedTrades, breakdownKeyFn(breakdown)), [closedTrades, breakdown]);

  if (trades.length === 0) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="font-heading text-xl text-text">Statistik & Wochen-Review</h1>
        <GlassCard className="text-center py-10">
          <p className="text-text-faint text-sm">
            Noch keine Trades im Journal. Statistiken erscheinen, sobald du Setups erfasst.
          </p>
        </GlassCard>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-heading text-xl text-text">Statistik & Wochen-Review</h1>

      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-6 gap-3">
        <StatCard label="Winrate" value={winRatePct(closedTrades) !== null ? `${winRatePct(closedTrades)!.toFixed(0)}%` : "–"} />
        <StatCard
          label="Profit-Faktor"
          value={
            profitFactor(closedTrades) === null
              ? "–"
              : profitFactor(closedTrades) === Infinity
                ? "∞"
                : profitFactor(closedTrades)!.toFixed(2)
          }
        />
        <StatCard label="Ø R" value={averageR(closedTrades) !== null ? averageR(closedTrades)!.toFixed(2) : "–"} />
        <StatCard
          label="Erwartungswert"
          value={expectancyR(closedTrades) !== null ? `${expectancyR(closedTrades)!.toFixed(2)}R` : "–"}
        />
        <StatCard label="Max Drawdown" value={maxDrawdownR(closedTrades) !== null ? `${maxDrawdownR(closedTrades)!.toFixed(1)}R` : "–"} />
        <StatCard
          label="Längste Serie (G/V)"
          value={`${longestStreak(closedTrades, "win")} / ${longestStreak(closedTrades, "loss")}`}
        />
      </div>

      <GlassCard title="Equity-Kurve in R">
        <EquityCurveR trades={trades} />
      </GlassCard>

      <GlassCard title="Regel-Disziplin">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-text-faint text-xs mb-1">Regeln eingehalten ({ruleOk.length} Trades)</div>
            <div className="font-mono-num text-lg text-green">
              {winRatePct(ruleOk) !== null ? `${winRatePct(ruleOk)!.toFixed(0)}% Winrate` : "–"} ·{" "}
              {averageR(ruleOk) !== null ? `Ø ${averageR(ruleOk)!.toFixed(2)}R` : "–"}
            </div>
          </div>
          <div>
            <div className="text-text-faint text-xs mb-1">Regelbruch ({ruleBroken.length} Trades)</div>
            <div className="font-mono-num text-lg text-red">
              {winRatePct(ruleBroken) !== null ? `${winRatePct(ruleBroken)!.toFixed(0)}% Winrate` : "–"} ·{" "}
              {averageR(ruleBroken) !== null ? `Ø ${averageR(ruleBroken)!.toFixed(2)}R` : "–"}
            </div>
          </div>
        </div>
      </GlassCard>

      <GlassCard>
        <div className="flex items-center justify-between mb-3">
          <h3 className="section-label">Auswertung nach {BREAKDOWN_LABELS[breakdown]}</h3>
          <select
            value={breakdown}
            onChange={(e) => setBreakdown(e.target.value as BreakdownKey)}
            className="bg-bg2 border border-line rounded-lg px-2 py-1.5 text-xs text-text"
          >
            {Object.entries(BREAKDOWN_LABELS).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-text-faint text-xs text-left border-b border-line">
              <th className="font-normal py-1.5">{BREAKDOWN_LABELS[breakdown]}</th>
              <th className="font-normal py-1.5">Trades</th>
              <th className="font-normal py-1.5">Winrate</th>
              <th className="font-normal py-1.5">Ø R</th>
            </tr>
          </thead>
          <tbody className="font-mono-num">
            {breakdownStats.map((s) => (
              <tr key={s.key} className="border-b border-line/50">
                <td className="py-1.5 font-body">{s.key}</td>
                <td className="py-1.5">{s.count}</td>
                <td className="py-1.5">{s.winRatePct !== null ? `${s.winRatePct.toFixed(0)}%` : "–"}</td>
                <td className={s.averageR !== null && s.averageR >= 0 ? "py-1.5 text-green" : "py-1.5 text-red"}>
                  {s.averageR !== null ? s.averageR.toFixed(2) : "–"}
                </td>
              </tr>
            ))}
            {breakdownStats.length === 0 && (
              <tr>
                <td colSpan={4} className="py-4 text-center text-text-faint font-body">
                  Keine Daten.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </GlassCard>
    </div>
  );
}
