import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus, LayoutGrid, Table as TableIcon } from "lucide-react";
import clsx from "clsx";
import { GlassCard } from "../components/ui/GlassCard";
import { TradeCard } from "../components/journal/TradeCard";
import { TradeTable } from "../components/journal/TradeTable";
import { TradeFormModal } from "../components/journal/TradeFormModal";
import { JournalFilters, EMPTY_FILTERS, type JournalFilterState } from "../components/journal/JournalFilters";
import { CalendarHeatmap } from "../components/journal/CalendarHeatmap";
import { fetchTrades, type Trade, type TradeImage } from "../lib/journalApi";
import { fetchAccounts } from "../lib/accountsApi";

export function JournalPage() {
  const [view, setView] = useState<"gallery" | "table">("gallery");
  const [filters, setFilters] = useState<JournalFilterState>(EMPTY_FILTERS);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<{ trade: Trade; images: TradeImage[] } | null>(null);

  const { data: tradesData } = useQuery({ queryKey: ["trades"], queryFn: fetchTrades });
  const { data: accountsData } = useQuery({ queryKey: ["accounts"], queryFn: fetchAccounts });

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      const typing = ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName) || target.isContentEditable;
      if (e.key.toLowerCase() === "n" && !typing && !formOpen) {
        e.preventDefault();
        setEditing(null);
        setFormOpen(true);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [formOpen]);

  const trades = tradesData ?? [];
  const instruments = useMemo(() => [...new Set(trades.map((t) => t.trade.instrument))].sort(), [trades]);

  const filtered = useMemo(() => {
    return trades.filter(({ trade }) => {
      if (filters.from && (!trade.openedAt || trade.openedAt.slice(0, 10) < filters.from)) return false;
      if (filters.to && (!trade.openedAt || trade.openedAt.slice(0, 10) > filters.to)) return false;
      if (filters.instrument && trade.instrument !== filters.instrument) return false;
      if (filters.setupType && !trade.setupTypesJson?.includes(filters.setupType)) return false;
      if (filters.session && trade.session !== filters.session) return false;
      if (filters.accountId && trade.accountId !== Number(filters.accountId)) return false;
      if (filters.result === "win" && !(trade.resultR !== null && trade.resultR > 0)) return false;
      if (filters.result === "loss" && !(trade.resultR !== null && trade.resultR < 0)) return false;
      if (filters.emotion && !trade.emotionTagsJson?.includes(filters.emotion)) return false;
      if (filters.ruleCompliance !== "all") {
        const checks = Object.values(trade.ruleChecksJson ?? {});
        const allOk = checks.length > 0 && checks.every(Boolean);
        if (filters.ruleCompliance === "ok" && !allOk) return false;
        if (filters.ruleCompliance === "broken" && allOk) return false;
      }
      return true;
    });
  }, [trades, filters]);

  function openEdit(trade: Trade) {
    const entry = trades.find((t) => t.trade.id === trade.id);
    setEditing(entry ? { trade: entry.trade, images: entry.images } : { trade, images: [] });
    setFormOpen(true);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-xl text-text">Trading-Journal</h1>
        <button
          onClick={() => {
            setEditing(null);
            setFormOpen(true);
          }}
          className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-cyan to-ice px-3 py-2 text-xs text-bg0 font-medium"
        >
          <Plus size={14} /> Setup erfassen <kbd className="opacity-60 ml-1">N</kbd>
        </button>
      </div>

      <GlassCard title="Kalender-Heatmap">
        <CalendarHeatmap trades={trades.map((t) => t.trade)} />
      </GlassCard>

      <GlassCard>
        <div className="flex items-center justify-between gap-3 flex-wrap mb-3">
          <JournalFilters
            filters={filters}
            onChange={setFilters}
            instruments={instruments}
            accounts={accountsData?.map((a) => a.account) ?? []}
          />
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => setView("gallery")}
              className={clsx("p-1.5 rounded-lg border", view === "gallery" ? "border-cyan text-cyan" : "border-line text-text-faint")}
            >
              <LayoutGrid size={16} />
            </button>
            <button
              onClick={() => setView("table")}
              className={clsx("p-1.5 rounded-lg border", view === "table" ? "border-cyan text-cyan" : "border-line text-text-faint")}
            >
              <TableIcon size={16} />
            </button>
          </div>
        </div>

        {view === "gallery" ? (
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
            {filtered.map(({ trade, images }) => (
              <TradeCard key={trade.id} trade={trade} images={images} onClick={() => openEdit(trade)} />
            ))}
            {filtered.length === 0 && <p className="text-text-faint text-sm col-span-full py-6 text-center">Keine Trades gefunden.</p>}
          </div>
        ) : (
          <TradeTable trades={filtered.map((f) => f.trade)} onSelect={openEdit} />
        )}
      </GlassCard>

      <TradeFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        initial={editing?.trade}
        initialImages={editing?.images}
      />
    </div>
  );
}
