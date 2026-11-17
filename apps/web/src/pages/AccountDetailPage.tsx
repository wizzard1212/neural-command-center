import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Pencil, Trash2, CheckCircle2, XCircle, MinusCircle } from "lucide-react";
import { GlassCard } from "../components/ui/GlassCard";
import { RingGauge } from "../components/accounts/RingGauge";
import { TrafficLightDot } from "../components/accounts/TrafficLightDot";
import { EquityChart } from "../components/accounts/EquityChart";
import { AccountFormModal } from "../components/accounts/AccountFormModal";
import {
  fetchAccountDetail,
  addSnapshot,
  addPayout,
  deleteAccount,
  type Payout,
} from "../lib/accountsApi";

const RING_COLORS = { green: "#00FF9D", yellow: "#FF7A1A", red: "#FF5A5A" } as const;

const PHASE_LABELS: Record<string, string> = {
  challenge_1: "Challenge Phase 1",
  challenge_2: "Challenge Phase 2",
  funded: "Funded",
  lost: "Verloren",
  paused: "Pausiert",
};

function RuleRow({ label, ok, detail }: { label: string; ok: boolean | null; detail: string }) {
  const Icon = ok === null ? MinusCircle : ok ? CheckCircle2 : XCircle;
  const color = ok === null ? "text-text-faint" : ok ? "text-green" : "text-red";
  return (
    <div className="flex items-center justify-between text-sm py-1.5 border-b border-line last:border-0">
      <span className="text-text">{label}</span>
      <span className={`flex items-center gap-1.5 ${color}`}>
        <Icon size={14} /> {detail}
      </span>
    </div>
  );
}

function SnapshotForm({ accountId }: { accountId: number }) {
  const queryClient = useQueryClient();
  const [balance, setBalance] = useState("");
  const [equity, setEquity] = useState("");
  const [dailyPnl, setDailyPnl] = useState("");

  const mutation = useMutation({
    mutationFn: () => addSnapshot(accountId, { balance: Number(balance), equity: Number(equity), dailyPnl: Number(dailyPnl) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      setBalance("");
      setEquity("");
      setDailyPnl("");
    },
  });

  return (
    <div className="flex flex-wrap items-end gap-2">
      <label className="flex flex-col gap-1 text-xs text-text-muted">
        Balance
        <input
          type="number"
          value={balance}
          onChange={(e) => setBalance(e.target.value)}
          className="w-28 bg-bg2 border border-line rounded px-2 py-1.5 text-sm text-text"
        />
      </label>
      <label className="flex flex-col gap-1 text-xs text-text-muted">
        Equity
        <input
          type="number"
          value={equity}
          onChange={(e) => setEquity(e.target.value)}
          className="w-28 bg-bg2 border border-line rounded px-2 py-1.5 text-sm text-text"
        />
      </label>
      <label className="flex flex-col gap-1 text-xs text-text-muted">
        Tages-P&L
        <input
          type="number"
          value={dailyPnl}
          onChange={(e) => setDailyPnl(e.target.value)}
          className="w-28 bg-bg2 border border-line rounded px-2 py-1.5 text-sm text-text"
        />
      </label>
      <button
        onClick={() => mutation.mutate()}
        disabled={!balance || !equity || !dailyPnl || mutation.isPending}
        className="rounded-lg bg-gradient-to-r from-cyan to-ice px-3 py-1.5 text-xs text-bg0 font-medium disabled:opacity-50"
      >
        Stand erfassen
      </button>
    </div>
  );
}

function PayoutForm({ accountId, defaultSplitPct }: { accountId: number; defaultSplitPct: number }) {
  const queryClient = useQueryClient();
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [gross, setGross] = useState("");
  const [splitPct, setSplitPct] = useState(String(defaultSplitPct));
  const [fees, setFees] = useState("0");

  const mutation = useMutation({
    mutationFn: () =>
      addPayout(accountId, { date, gross: Number(gross), splitPct: Number(splitPct), fees: Number(fees) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      setGross("");
    },
  });

  return (
    <div className="flex flex-wrap items-end gap-2">
      <label className="flex flex-col gap-1 text-xs text-text-muted">
        Datum
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="bg-bg2 border border-line rounded px-2 py-1.5 text-sm text-text" />
      </label>
      <label className="flex flex-col gap-1 text-xs text-text-muted">
        Brutto ($)
        <input type="number" value={gross} onChange={(e) => setGross(e.target.value)} className="w-28 bg-bg2 border border-line rounded px-2 py-1.5 text-sm text-text" />
      </label>
      <label className="flex flex-col gap-1 text-xs text-text-muted">
        Split (%)
        <input type="number" value={splitPct} onChange={(e) => setSplitPct(e.target.value)} className="w-20 bg-bg2 border border-line rounded px-2 py-1.5 text-sm text-text" />
      </label>
      <label className="flex flex-col gap-1 text-xs text-text-muted">
        Gebühren ($)
        <input type="number" value={fees} onChange={(e) => setFees(e.target.value)} className="w-24 bg-bg2 border border-line rounded px-2 py-1.5 text-sm text-text" />
      </label>
      <button
        onClick={() => mutation.mutate()}
        disabled={!gross || mutation.isPending}
        className="rounded-lg border border-cyan/30 px-3 py-1.5 text-xs text-cyan disabled:opacity-50"
      >
        Auszahlung erfassen
      </button>
    </div>
  );
}

function nextPayoutDate(payouts: Payout[], purchaseDate: string | null, intervalDays: number | null): string | null {
  if (!intervalDays) return null;
  const lastDate = payouts.at(-1)?.date ?? purchaseDate;
  if (!lastDate) return null;
  const next = new Date(lastDate);
  next.setDate(next.getDate() + intervalDays);
  return next.toISOString().slice(0, 10);
}

export function AccountDetailPage() {
  const { id } = useParams();
  const accountId = Number(id);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [editOpen, setEditOpen] = useState(false);

  const { data } = useQuery({ queryKey: ["accounts", accountId], queryFn: () => fetchAccountDetail(accountId) });

  const remove = useMutation({
    mutationFn: () => deleteAccount(accountId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      navigate("/konten");
    },
  });

  if (!data) return <p className="text-text-faint text-sm">Lade Konto…</p>;

  const { account, summary, snapshots, payouts } = data;
  const totalFees = payouts.reduce((sum, p) => sum + p.fees, 0);
  const totalNet = payouts.reduce((sum, p) => sum + p.net, 0);
  const netProfit = totalNet - (account.purchasePrice ?? 0);
  const roiPct = account.purchasePrice ? (netProfit / account.purchasePrice) * 100 : null;
  const nextPayout = nextPayoutDate(payouts, account.purchaseDate, account.payoutIntervalDays);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <button onClick={() => navigate("/konten")} className="flex items-center gap-1.5 text-text-muted hover:text-cyan text-sm">
          <ArrowLeft size={16} /> Zurück
        </button>
        <div className="flex items-center gap-2">
          <button onClick={() => setEditOpen(true)} className="flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-xs text-text-muted hover:text-cyan">
            <Pencil size={13} /> Bearbeiten
          </button>
          <button
            onClick={() => confirm("Konto wirklich löschen? Alle Stände und Auszahlungen gehen verloren.") && remove.mutate()}
            className="flex items-center gap-1.5 rounded-lg border border-red/30 px-3 py-1.5 text-xs text-red"
          >
            <Trash2 size={13} /> Löschen
          </button>
        </div>
      </div>

      <GlassCard>
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="font-heading text-xl text-text">
              {account.firm} – {account.program}
            </h1>
            <p className="text-text-muted text-sm">
              {PHASE_LABELS[account.phase]} · {account.platform}
              {account.loginNo ? ` · ${account.loginNo}` : ""}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <TrafficLightDot light={summary.overallLight} />
            <span className="text-sm text-text-muted">Gesamt-Status</span>
          </div>
        </div>

        <EquityChart
          snapshots={snapshots}
          startBalance={account.startBalance}
          startDate={account.purchaseDate ?? account.createdAt}
        />
      </GlassCard>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <GlassCard title="Fortschritt">
          <div className="flex items-center justify-around py-2">
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
          <div className="grid grid-cols-2 gap-3 font-mono-num text-sm pt-2 border-t border-line">
            <div>
              <div className="text-text-faint text-xs">Balance</div>
              <div className="text-text">{summary.latestBalance.toLocaleString("de-DE")} $</div>
            </div>
            <div>
              <div className="text-text-faint text-xs">Equity</div>
              <div className="text-text">{summary.latestEquity.toLocaleString("de-DE")} $</div>
            </div>
          </div>
        </GlassCard>

        <GlassCard title="Regel-Checkliste">
          <RuleRow
            label="Handelstage"
            ok={summary.tradingDays.ok}
            detail={summary.tradingDays.required !== null ? `${summary.tradingDays.count}/${summary.tradingDays.required}` : `${summary.tradingDays.count}`}
          />
          <RuleRow
            label="Profitable Tage"
            ok={summary.profitableDays.ok}
            detail={summary.profitableDays.required !== null ? `${summary.profitableDays.count}/${summary.profitableDays.required}` : `${summary.profitableDays.count}`}
          />
          <RuleRow
            label="Konsistenz"
            ok={summary.consistency.ok}
            detail={summary.consistency.actualPct !== null ? `${summary.consistency.actualPct.toFixed(0)}% (max. ${account.consistencyPct ?? "–"}%)` : "noch kein Gewinn"}
          />
          <RuleRow
            label="Inaktivität"
            ok={summary.daysUntilInactive === null ? null : summary.daysUntilInactive > 5}
            detail={summary.daysUntilInactive !== null ? `noch ${summary.daysUntilInactive} Tage` : "–"}
          />
          <RuleRow label="Wochenend-Halten" ok={account.weekendAllowed} detail={account.weekendAllowed ? "erlaubt" : "nicht erlaubt"} />
          <RuleRow
            label="News-Regel"
            ok={null}
            detail={account.newsRuleMinutes ? `${account.newsRuleMinutes} Min. gesperrt` : "keine"}
          />
        </GlassCard>
      </div>

      <GlassCard title="Neuen Stand erfassen">
        <SnapshotForm accountId={account.id} />
      </GlassCard>

      <GlassCard title="Auszahlungen">
        <div className="flex items-center justify-between text-sm mb-3 text-text-muted">
          <span>Nächster möglicher Auszahlungstermin: {nextPayout ?? "–"}</span>
        </div>

        <table className="w-full text-sm mb-4">
          <thead>
            <tr className="text-text-faint text-xs text-left">
              <th className="font-normal pb-2">Datum</th>
              <th className="font-normal pb-2">Brutto</th>
              <th className="font-normal pb-2">Split</th>
              <th className="font-normal pb-2">Gebühren</th>
              <th className="font-normal pb-2">Netto</th>
            </tr>
          </thead>
          <tbody className="font-mono-num">
            {payouts.map((p) => (
              <tr key={p.id} className="border-t border-line">
                <td className="py-1.5">{p.date}</td>
                <td className="py-1.5">{p.gross.toLocaleString("de-DE")} $</td>
                <td className="py-1.5">{p.splitPct}%</td>
                <td className="py-1.5">{p.fees.toLocaleString("de-DE")} $</td>
                <td className="py-1.5 text-green">{p.net.toLocaleString("de-DE")} $</td>
              </tr>
            ))}
            {payouts.length === 0 && (
              <tr>
                <td colSpan={5} className="text-text-faint py-3">
                  Noch keine Auszahlungen.
                </td>
              </tr>
            )}
          </tbody>
        </table>

        <PayoutForm accountId={account.id} defaultSplitPct={account.profitSplitPct ?? 80} />

        <div className="grid grid-cols-3 gap-3 font-mono-num text-sm pt-4 mt-4 border-t border-line">
          <div>
            <div className="text-text-faint text-xs">Kaufpreis + Gebühren</div>
            <div className="text-text">{((account.purchasePrice ?? 0) + totalFees).toLocaleString("de-DE")} $</div>
          </div>
          <div>
            <div className="text-text-faint text-xs">Summe Auszahlungen (netto)</div>
            <div className="text-text">{totalNet.toLocaleString("de-DE")} $</div>
          </div>
          <div>
            <div className="text-text-faint text-xs">Netto-ROI</div>
            <div className={netProfit >= 0 ? "text-green" : "text-red"}>
              {roiPct !== null ? `${roiPct >= 0 ? "+" : ""}${roiPct.toFixed(1)}%` : "–"}
            </div>
          </div>
        </div>
      </GlassCard>

      <AccountFormModal open={editOpen} onClose={() => setEditOpen(false)} initial={account} />
    </div>
  );
}
