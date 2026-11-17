import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import clsx from "clsx";
import { fetchStatus } from "../../lib/api";
import { DEFAULT_WATCHLIST } from "@ncc/shared";

function useClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}

function formatTime(date: Date, timeZone: string) {
  return date.toLocaleTimeString("de-DE", { timeZone, hour: "2-digit", minute: "2-digit" });
}

const SESSION_LABELS: Record<string, string> = {
  asia: "Asien",
  london: "London",
  new_york: "New York",
};

const CONNECTION_LABELS: Record<string, string> = {
  vault: "Vault",
  mt5: "MT5",
  feeds: "Feeds",
  ki: "KI",
};

export function StatusBar() {
  const now = useClock();
  const { data } = useQuery({
    queryKey: ["status"],
    queryFn: fetchStatus,
    refetchInterval: 15_000,
  });

  return (
    <header className="h-14 shrink-0 border-b border-line bg-bg1 flex items-center justify-between px-5 gap-6 text-sm">
      <div className="flex items-center gap-4 font-mono-num text-text">
        <span title="Berlin">BER {formatTime(now, "Europe/Berlin")}</span>
        <span className="text-text-faint">·</span>
        <span title="New York">NY {formatTime(now, "America/New_York")}</span>
      </div>

      <div className="flex items-center gap-3">
        {(data?.sessions ?? []).map((s) => (
          <div key={s.key} className="flex items-center gap-1.5" title={SESSION_LABELS[s.key]}>
            <span
              className={clsx(
                "h-2 w-2 rounded-full",
                s.isOpen ? "bg-green shadow-[0_0_8px_rgba(0,255,157,0.8)] animate-breathe" : "bg-text-faint",
              )}
            />
            <span className="text-text-muted text-xs hidden lg:inline">{SESSION_LABELS[s.key]}</span>
          </div>
        ))}
      </div>

      <div className="hidden xl:flex items-center gap-3 font-mono-num text-xs text-text-muted overflow-hidden">
        {DEFAULT_WATCHLIST.map((symbol) => (
          <span key={symbol} className="whitespace-nowrap">
            {symbol} <span className="text-text-faint">–</span>
          </span>
        ))}
      </div>

      <div className="flex items-center gap-1.5" title="Risiko-Ampel gesamt (ab Phase 3)">
        <span className="h-2.5 w-2.5 rounded-full border border-text-faint" />
        <span className="text-xs text-text-faint hidden md:inline">Risiko –</span>
      </div>

      <div className="hidden md:flex items-center gap-1.5 text-xs text-text-faint" title="Nächster High-Impact-Termin (ab Phase 10)">
        Termin –
      </div>

      <div className="flex items-center gap-2.5">
        {(data?.connections ?? []).map((c) => (
          <span
            key={c.source}
            title={`${CONNECTION_LABELS[c.source]}: ${c.status}${c.message ? " – " + c.message : ""}`}
            className={clsx(
              "h-2 w-2 rounded-full",
              c.status === "connected" && "bg-green",
              c.status === "error" && "bg-red animate-pulse-red",
              c.status === "disconnected" && "bg-text-faint",
            )}
          />
        ))}
      </div>
    </header>
  );
}
