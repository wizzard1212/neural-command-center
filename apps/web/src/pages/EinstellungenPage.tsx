import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import clsx from "clsx";
import { fetchStatus, fetchAiUsageSummary } from "../lib/api";
import { fetchNewsSources, toggleNewsSource, refreshNews } from "../lib/newsApi";
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

function timeAgo(iso?: string): string {
  if (!iso) return "noch nie";
  const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (minutes < 1) return "gerade eben";
  if (minutes < 60) return `vor ${minutes} min`;
  return `vor ${Math.round(minutes / 60)} h`;
}

export function EinstellungenPage() {
  const queryClient = useQueryClient();
  const { data, refetch, isFetching } = useQuery({ queryKey: ["status"], queryFn: fetchStatus });
  const { data: sources } = useQuery({ queryKey: ["news", "sources"], queryFn: fetchNewsSources });
  const { data: aiUsage } = useQuery({ queryKey: ["ai-usage"], queryFn: fetchAiUsageSummary });
  const reducedAnimation = useAppStore((s) => s.reducedAnimation);
  const setReducedAnimation = useAppStore((s) => s.setReducedAnimation);

  const toggleSource = useMutation({
    mutationFn: ({ id, enabled }: { id: string; enabled: boolean }) => toggleNewsSource(id, enabled),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["news", "sources"] }),
  });

  const refresh = useMutation({
    mutationFn: refreshNews,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["news", "sources"] });
      queryClient.invalidateQueries({ queryKey: ["news"] });
    },
  });

  const budgetPct = aiUsage ? Math.min(150, (aiUsage.monthToDateUsd / aiUsage.budgetUsd) * 100) : 0;

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

      <GlassCard title="News-Quellen (RSS)">
        <div className="flex flex-col gap-2.5">
          {(sources ?? []).map((s) => (
            <div key={s.id} className="flex items-center justify-between text-sm">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={s.enabled}
                  onChange={(e) => toggleSource.mutate({ id: s.id, enabled: e.target.checked })}
                  className="h-4 w-4 accent-cyan"
                />
                <span className={s.enabled ? "text-text" : "text-text-faint"}>{s.name}</span>
              </label>
              <div className="flex items-center gap-1.5 text-xs text-text-muted">
                <span
                  className={clsx(
                    "h-1.5 w-1.5 rounded-full",
                    s.status?.status === "connected" ? "bg-green" : "bg-red",
                  )}
                />
                {s.status?.status === "connected"
                  ? `${s.status.itemsFound ?? 0} Artikel · ${timeAgo(s.status.lastCheckedAt)}`
                  : s.status
                    ? `Fehler · ${timeAgo(s.status.lastCheckedAt)}`
                    : "noch nicht abgerufen"}
              </div>
            </div>
          ))}
          <button
            onClick={() => refresh.mutate()}
            disabled={refresh.isPending}
            className="mt-1 self-start rounded-lg border border-cyan/30 px-3 py-1.5 text-xs text-cyan hover:bg-cyan/10 disabled:opacity-50"
          >
            {refresh.isPending ? "Aktualisiert…" : "Alle Quellen jetzt testen"}
          </button>
          <p className="text-text-faint text-xs">
            Weitere Feeds lassen sich direkt in <code>config/feeds.json</code> ergänzen.
          </p>
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
        {aiUsage ? (
          <>
            <div className="flex items-end justify-between mb-2 font-mono-num">
              <span className={clsx("text-xl", budgetPct >= 100 ? "text-red" : budgetPct >= 80 ? "text-orange" : "text-text")}>
                {aiUsage.monthToDateUsd.toFixed(2)} $
              </span>
              <span className="text-text-faint text-sm">Budget: {aiUsage.budgetUsd.toFixed(0)} $</span>
            </div>
            <div className="h-2 rounded-full bg-bg2 overflow-hidden">
              <div
                className={clsx(
                  "h-full",
                  budgetPct >= 100 ? "bg-red" : budgetPct >= 80 ? "bg-orange" : "bg-gradient-to-r from-cyan to-green",
                )}
                style={{ width: `${Math.min(100, budgetPct)}%` }}
              />
            </div>
            {budgetPct >= 80 && (
              <p className="text-xs text-orange mt-2">
                {budgetPct >= 100
                  ? "Monatsbudget erreicht – automatische KI-Läufe (News-Bewertung, Briefing) pausieren."
                  : "80 % des Monatsbudgets erreicht."}
              </p>
            )}
          </>
        ) : (
          <p className="text-text-faint text-sm">Lade…</p>
        )}
      </GlassCard>
    </div>
  );
}
