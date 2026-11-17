import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus, Download } from "lucide-react";
import { GlassCard } from "../components/ui/GlassCard";
import { AccountCard } from "../components/accounts/AccountCard";
import { AccountFormModal } from "../components/accounts/AccountFormModal";
import { CopyRiskCalculator } from "../components/accounts/CopyRiskCalculator";
import { GoalsSection } from "../components/accounts/GoalsSection";
import { ManagedCapitalGoal } from "../components/accounts/ManagedCapitalGoal";
import { AccountFeedList } from "../components/accounts/AccountFeedList";
import { fetchAccounts, fetchAccountsOverview, payoutsCsvUrl } from "../lib/accountsApi";

export function KontenPage() {
  const [formOpen, setFormOpen] = useState(false);
  const { data: accounts } = useQuery({ queryKey: ["accounts"], queryFn: fetchAccounts });
  const { data: overview } = useQuery({ queryKey: ["accounts", "overview"], queryFn: fetchAccountsOverview });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-xl text-text">Funded & Konten</h1>
        <div className="flex items-center gap-2">
          <a
            href={payoutsCsvUrl()}
            className="flex items-center gap-1.5 rounded-lg border border-line px-3 py-2 text-xs text-text-muted hover:text-cyan"
          >
            <Download size={14} /> Steuer-Export (CSV)
          </a>
          <button
            onClick={() => setFormOpen(true)}
            className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-cyan to-ice px-3 py-2 text-xs text-bg0 font-medium"
          >
            <Plus size={14} /> Konto anlegen
          </button>
        </div>
      </div>

      <ManagedCapitalGoal />

      {overview && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <GlassCard>
            <div className="text-text-faint text-xs mb-1">Konten</div>
            <div className="font-mono-num text-xl text-text">{overview.accountCount}</div>
          </GlassCard>
          <GlassCard>
            <div className="text-text-faint text-xs mb-1">Gesamt-Equity</div>
            <div className="font-mono-num text-xl text-text">{overview.totalEquity.toLocaleString("de-DE")} $</div>
          </GlassCard>
          <GlassCard>
            <div className="text-text-faint text-xs mb-1">Tages-P&L (alle Konten)</div>
            <div className={`font-mono-num text-xl ${overview.totalDailyPnl >= 0 ? "text-green" : "text-red"}`}>
              {overview.totalDailyPnl >= 0 ? "+" : ""}
              {overview.totalDailyPnl.toLocaleString("de-DE")} $
            </div>
          </GlassCard>
          <GlassCard>
            <div className="text-text-faint text-xs mb-1">Netto-ROI der Prop-Strategie</div>
            <div className="font-mono-num text-xl text-text">
              {overview.roiPct !== null ? `${overview.roiPct >= 0 ? "+" : ""}${overview.roiPct.toFixed(1)}%` : "–"}
            </div>
          </GlassCard>
        </div>
      )}

      {(accounts?.length ?? 0) === 0 ? (
        <GlassCard className="text-center py-10">
          <p className="text-text-faint text-sm mb-3">Noch keine Konten angelegt.</p>
          <button onClick={() => setFormOpen(true)} className="text-cyan text-sm underline">
            Erstes Konto anlegen
          </button>
        </GlassCard>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {accounts!.map(({ account, summary }) => (
            <AccountCard key={account.id} account={account} summary={summary} />
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <CopyRiskCalculator accounts={accounts?.map((a) => a.account) ?? []} />
        <GoalsSection />
      </div>

      <AccountFeedList accounts={accounts?.map((a) => a.account) ?? []} />

      <AccountFormModal open={formOpen} onClose={() => setFormOpen(false)} />
    </div>
  );
}
