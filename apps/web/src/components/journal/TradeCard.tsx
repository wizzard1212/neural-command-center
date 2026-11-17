import clsx from "clsx";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";
import { tradeImageUrl, type Trade, type TradeImage } from "../../lib/journalApi";

const STATUS_LABELS: Record<Trade["status"], string> = {
  planned: "Geplant",
  open: "Offen",
  closed: "Geschlossen",
  missed: "Verpasst",
};

export function TradeCard({
  trade,
  images,
  onClick,
}: {
  trade: Trade;
  images: TradeImage[];
  onClick: () => void;
}) {
  const thumb = images[0];
  const resultColor =
    trade.resultR === null ? "border-line" : trade.resultR >= 0 ? "border-green/50" : "border-red/50";

  return (
    <button
      onClick={onClick}
      className={clsx("glass-card overflow-hidden text-left flex flex-col border-2", resultColor)}
    >
      <div className="aspect-video bg-bg2 flex items-center justify-center">
        {thumb ? (
          <img src={tradeImageUrl(thumb.path)} className="w-full h-full object-cover" />
        ) : (
          <span className="text-text-faint text-xs">Kein Screenshot</span>
        )}
      </div>
      <div className="p-3 flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <span className="font-heading text-text flex items-center gap-1">
            {trade.direction === "long" ? (
              <ArrowUpRight size={14} className="text-green" />
            ) : (
              <ArrowDownRight size={14} className="text-red" />
            )}
            {trade.instrument}
          </span>
          <span className="text-xs text-text-faint">{STATUS_LABELS[trade.status]}</span>
        </div>
        <div className="text-xs text-text-muted">
          {trade.openedAt ? new Date(trade.openedAt).toLocaleDateString("de-DE") : "–"}
        </div>
        <div className="flex items-center justify-between font-mono-num text-sm pt-1">
          <span className="text-text-faint">R:R {trade.rrPlanned !== null ? trade.rrPlanned.toFixed(1) : "–"}</span>
          {trade.resultR !== null ? (
            <span className={trade.resultR >= 0 ? "text-green" : "text-red"}>
              {trade.resultR >= 0 ? "+" : ""}
              {trade.resultR.toFixed(2)}R
            </span>
          ) : (
            <span className="text-text-faint">–</span>
          )}
        </div>
      </div>
    </button>
  );
}
