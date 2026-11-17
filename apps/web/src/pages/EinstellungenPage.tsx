import { useQuery } from "@tanstack/react-query";
import clsx from "clsx";
import { fetchStatus } from "../lib/api";
import { GlassCard } from "../components/ui/GlassCard";
import { useAppStore } from "../store/useAppStore";

const SOURCE_LABELS: Record<string, string> = {
  vault: "Obsidian-Vault",
  mt5: "MT5 / Kontenanbindung",
  feeds: "News- & Social-Quellen",
  ki: "Anthropic API (KI)",
};

const STATUS_LABELS: Record<string, string> = {
  connected: "Verbunden",
  error: "Fehler",
  disconnected: "Nicht verbunden",
};

export function EinstellungenPage() {
  const { data, refetch, isFetching } = useQuery({ queryKey: ["status"], queryFn: fetchStatus });
  const reducedAnimation = useAppStore((s) => s.reducedAnimation);
  const setReducedAnimation = useAppStore((s) => s.setReducedAnimation);

  return (
    <div className="flex flex-col gap-4 max-w-2xl">
      <h1 className="font-heading text-xl text-text">Einstellungen</h1>

      <GlassCard title="Quellen-Status">
        <div className="flex flex-col gap-3">
          {(data?.connections ?? []).map((c) => (
            <div key={c.source} className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <span
                  className={clsx(
                    "h-2 w-2 rounded-full",
                    c.status === "connected" && "bg-green",
                    c.status === "error" && "bg-red",
                    c.status === "disconnected" && "bg-text-faint",
                  )}
                />
                <span>{SOURCE_LABELS[c.source]}</span>
              </div>
              <div className="text-text-muted text-xs text-right">
                <div>{STATUS_LABELS[c.status]}</div>
                {c.message && <div className="text-text-faint">{c.message}</div>}
              </div>
            </div>
          ))}
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="mt-2 self-start rounded-lg border border-cyan/30 px-3 py-1.5 text-xs text-cyan hover:bg-cyan/10 disabled:opacity-50"
          >
            {isFetching ? "Prüfe…" : "Erneut testen"}
          </button>
        </div>
      </GlassCard>

      <GlassCard title="Darstellung">
        <label className="flex items-center justify-between text-sm">
          <span>Animationen reduzieren</span>
          <input
            type="checkbox"
            checked={reducedAnimation}
            onChange={(e) => setReducedAnimation(e.target.checked)}
            className="h-4 w-4 accent-cyan"
          />
        </label>
      </GlassCard>

      <GlassCard title="KI-Kosten diesen Monat">
        <p className="text-text-faint text-sm">
          Kommt in Phase 6, sobald das Morgen-Briefing Tokens über die Anthropic API verbraucht
          (Tabelle <code>ai_usage</code>).
        </p>
      </GlassCard>
    </div>
  );
}
