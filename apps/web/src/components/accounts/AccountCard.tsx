import { useNavigate } from "react-router-dom";
import { GlassCard } from "../ui/GlassCard";
import { RingGauge } from "./RingGauge";
import { TrafficLightDot } from "./TrafficLightDot";
import type { Account, AccountSummary } from "../../lib/accountsApi";

const PHASE_LABELS: Record<string, string> = {
  challenge_1: "Challenge Phase 1",
  challenge_2: "Challenge Phase 2",
  funded: "Funded",
  lost: "Verloren",
  paused: "Pausiert",
};

const RING_COLORS = { green: "#00FF9D", yellow: "#FF7A1A", red: "#FF5A5A" } as const;

export function AccountCard({ account, summary }: { account: Account; summary: AccountSummary }) {
  const navigate = useNavigate();

  return (
    <GlassCard
      className="flex flex-col gap-4 cursor-pointer hover:border-cyan/30"
      onClick={() => navigate(`/konten/${account.id}`)}
    >
      <div className="flex items-start justify-between">
        <div>
          <div className="font-heading text-text">{account.firm}</div>
          <div className="text-text-muted text-xs">{account.program}</div>
        </div>
        <div className="flex items-center gap-2">
          <TrafficLightDot light={summary.overallLight} />
          <span className="text-xs text-text-faint">{PHASE_LABELS[account.phase]}</span>
        </div>
      </div>

      <div className="flex items-center justify-around">
        <RingGauge
          value={summary.profitTargetProgressPct ?? 0}
          label="Profitziel"
          color={RING_COLORS.green}
          valueLabel={summary.profitTargetProgressPct !== null ? `${Math.round(summary.profitTargetProgressPct)}%` : "–"}
        />
        <RingGauge
          value={summary.dailyLoss.bufferPct}
          label="Tagesverlust-Puffer"
          color={RING_COLORS[summary.dailyLoss.light.color]}
          valueLabel={`${Math.round(summary.dailyLoss.bufferPct)}%`}
        />
        <RingGauge
          value={summary.maxLoss.bufferPct}
          label="Max-Verlust-Puffer"
          color={RING_COLORS[summary.maxLoss.light.color]}
          valueLabel={`${Math.round(summary.maxLoss.bufferPct)}%`}
        />
      </div>

      <div className="flex items-center justify-between font-mono-num text-sm pt-2 border-t border-line">
        <div>
          <div className="text-text-faint text-xs">Equity</div>
          <div className="text-text">{summary.latestEquity.toLocaleString("de-DE")} $</div>
        </div>
        <div className="text-right">
          <div className="text-text-faint text-xs">Tages-P&L</div>
          <div className={summary.todayPnl >= 0 ? "text-green" : "text-red"}>
            {summary.todayPnl >= 0 ? "+" : ""}
            {summary.todayPnl.toLocaleString("de-DE")} $
          </div>
        </div>
      </div>
    </GlassCard>
  );
}
