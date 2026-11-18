import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { RefreshCw, FileText } from "lucide-react";
import { GlassCard } from "../components/ui/GlassCard";
import { NewsCard } from "../components/news/NewsCard";
import { NewsDetailPanel } from "../components/news/NewsDetailPanel";
import { NewsFiltersPanel, EMPTY_NEWS_FILTERS, type NewsFilterState } from "../components/news/NewsFiltersPanel";
import { fetchNews, fetchNewsSources, refreshNews, generateScriptForToday, type ScriptDraft } from "../lib/newsApi";
import { ScriptForTodayModal } from "../components/news/ScriptForTodayModal";
import { fetchStatus } from "../lib/api";

export function NewsPage() {
  const [filters, setFilters] = useState<NewsFilterState>(EMPTY_NEWS_FILTERS);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [scriptDraft, setScriptDraft] = useState<ScriptDraft | null>(null);
  const [scriptError, setScriptError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data: status } = useQuery({ queryKey: ["status"], queryFn: fetchStatus });
  const kiAvailable = status?.connections.find((c) => c.source === "ki")?.status === "connected";

  const scriptMutation = useMutation({
    mutationFn: generateScriptForToday,
    onSuccess: (draft) => {
      setScriptDraft(draft);
      setScriptError(null);
    },
    onError: (err) => setScriptError((err as Error).message),
  });

  const { data: sources } = useQuery({ queryKey: ["news", "sources"], queryFn: fetchNewsSources });
  const { data: clusters, isLoading } = useQuery({
    queryKey: ["news", filters],
    queryFn: () =>
      fetchNews({
        asset: filters.asset || undefined,
        category: filters.category || undefined,
        minRelevance: filters.minRelevance || undefined,
        source: filters.source || undefined,
        from: filters.from ? new Date(filters.from).toISOString() : undefined,
      }),
    refetchInterval: 60_000,
  });

  const refresh = useMutation({
    mutationFn: refreshNews,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["news"] });
      queryClient.invalidateQueries({ queryKey: ["news", "sources"] });
    },
  });

  const selected = useMemo(
    () => clusters?.find((c) => c.representative.id === selectedId)?.representative ?? null,
    [clusters, selectedId],
  );

  return (
    <div className="flex flex-col gap-4 h-full">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-xl text-text">News-Feed</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => scriptMutation.mutate()}
            disabled={!kiAvailable || scriptMutation.isPending}
            title={
              kiAvailable
                ? "News-Kanal-Brücke: Skript-Entwurf aus Briefing + Content-Ideen passend zum heutigen Wochenplan-Thema"
                : "ANTHROPIC_API_KEY fehlt in .env."
            }
            className="flex items-center gap-1.5 rounded-lg border border-cyan/30 px-3 py-2 text-xs text-cyan hover:bg-cyan/10 disabled:opacity-40"
          >
            <FileText size={14} className={scriptMutation.isPending ? "animate-pulse" : ""} />
            {scriptMutation.isPending ? "Erstellt…" : "Skript für heute"}
          </button>
          <button
            onClick={() => refresh.mutate()}
            disabled={refresh.isPending}
            className="flex items-center gap-1.5 rounded-lg border border-line px-3 py-2 text-xs text-text-muted hover:text-cyan disabled:opacity-50"
          >
            <RefreshCw size={14} className={refresh.isPending ? "animate-spin" : ""} /> Jetzt aktualisieren
          </button>
        </div>
      </div>
      {scriptError && <p className="text-xs text-red">{scriptError}</p>}

      <div className="grid grid-cols-12 gap-4 flex-1 min-h-0">
        <GlassCard className="col-span-12 lg:col-span-2 overflow-y-auto">
          <NewsFiltersPanel filters={filters} onChange={setFilters} sources={sources ?? []} />
        </GlassCard>

        <div className="col-span-12 lg:col-span-6 flex flex-col gap-3 overflow-y-auto pr-1">
          {isLoading && <p className="text-text-faint text-sm">Lade News…</p>}
          {clusters?.length === 0 && (
            <GlassCard className="text-center py-10">
              <p className="text-text-faint text-sm">
                Noch keine News. Prüfe die Quellen in der Seitenleiste links oder klicke „Jetzt aktualisieren".
              </p>
            </GlassCard>
          )}
          {clusters?.map((cluster) => (
            <NewsCard
              key={cluster.representative.id}
              cluster={cluster}
              selected={cluster.representative.id === selectedId}
              onClick={() => setSelectedId(cluster.representative.id)}
            />
          ))}
        </div>

        <div className="col-span-12 lg:col-span-4 min-h-0">
          <NewsDetailPanel item={selected} />
        </div>
      </div>

      {scriptDraft && <ScriptForTodayModal draft={scriptDraft} onClose={() => setScriptDraft(null)} />}
    </div>
  );
}
