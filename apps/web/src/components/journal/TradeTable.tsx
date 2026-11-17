import type { Trade } from "../../lib/journalApi";

const STATUS_LABELS: Record<Trade["status"], string> = {
  planned: "Geplant",
  open: "Offen",
  closed: "Geschlossen",
  missed: "Verpasst",
};

export function TradeTable({ trades, onSelect }: { trades: Trade[]; onSelect: (trade: Trade) => void }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-text-faint text-xs text-left border-b border-line">
            <th className="font-normal py-2 pr-3">Datum</th>
            <th className="font-normal py-2 pr-3">Instrument</th>
            <th className="font-normal py-2 pr-3">Richtung</th>
            <th className="font-normal py-2 pr-3">Session</th>
            <th className="font-normal py-2 pr-3">Setup</th>
            <th className="font-normal py-2 pr-3">R:R</th>
            <th className="font-normal py-2 pr-3">Ergebnis</th>
            <th className="font-normal py-2 pr-3">Status</th>
          </tr>
        </thead>
        <tbody className="font-mono-num">
          {trades.map((t) => (
            <tr
              key={t.id}
              onClick={() => onSelect(t)}
              className="border-b border-line/50 cursor-pointer hover:bg-bg2/60"
            >
              <td className="py-2 pr-3 whitespace-nowrap">
                {t.openedAt ? new Date(t.openedAt).toLocaleDateString("de-DE") : "–"}
              </td>
              <td className="py-2 pr-3">{t.instrument}</td>
              <td className="py-2 pr-3">
                <span className={t.direction === "long" ? "text-green" : "text-red"}>
                  {t.direction === "long" ? "Long" : "Short"}
                </span>
              </td>
              <td className="py-2 pr-3">{t.session ?? "–"}</td>
              <td className="py-2 pr-3 font-body text-xs max-w-[220px] truncate">
                {t.setupTypesJson?.join(", ") ?? "–"}
              </td>
              <td className="py-2 pr-3">{t.rrPlanned !== null ? t.rrPlanned.toFixed(1) : "–"}</td>
              <td className="py-2 pr-3">
                {t.resultR !== null ? (
                  <span className={t.resultR >= 0 ? "text-green" : "text-red"}>
                    {t.resultR >= 0 ? "+" : ""}
                    {t.resultR.toFixed(2)}R
                  </span>
                ) : (
                  "–"
                )}
              </td>
              <td className="py-2 pr-3 font-body">{STATUS_LABELS[t.status]}</td>
            </tr>
          ))}
          {trades.length === 0 && (
            <tr>
              <td colSpan={8} className="py-6 text-center text-text-faint font-body">
                Keine Trades gefunden.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
