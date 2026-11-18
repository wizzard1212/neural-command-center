import { lazy, Suspense } from "react";
import { useQuery } from "@tanstack/react-query";
import { CheckSquare } from "lucide-react";
import { GlassCard } from "../components/ui/GlassCard";
import { FilterChips } from "../components/brain/FilterChips";
import { NoteDetailPanel } from "../components/brain/NoteDetailPanel";
import { BriefingCard } from "../components/briefing/BriefingCard";

// three.js/@react-three/* sind der größte Teil des Bundles – nur laden, wenn
// die Zentrale wirklich besucht wird, statt bei jedem Seitenaufruf.
const BrainScene = lazy(() => import("../components/brain/BrainScene").then((m) => ({ default: m.BrainScene })));
import { fetchVaultGraph, fetchVaultMeta, fetchVaultStats } from "../lib/vaultApi";
import { useAppStore } from "../store/useAppStore";
import { useVaultStore } from "../store/useVaultStore";
import type { AreaKey } from "@ncc/shared";

const AREA_LABELS: Record<AreaKey, string> = {
  trading: "Trading",
  firma: "Firma",
  modeln: "Modeln",
  ideen_business: "App-/Business-Ideen",
  clipping: "Clipping & Content",
  fundament: "Fundament",
  ideen_start: "Ideen",
  dashboard_daten: "Dashboard",
};

export function ZentralePage() {
  const reducedAnimation = useAppStore((s) => s.reducedAnimation);
  const selectNote = useVaultStore((s) => s.selectNote);

  const { data: meta } = useQuery({ queryKey: ["vault", "meta"], queryFn: fetchVaultMeta });
  const { data: graph } = useQuery({
    queryKey: ["vault", "graph"],
    queryFn: fetchVaultGraph,
    enabled: meta?.connected ?? false,
  });
  const { data: stats } = useQuery({
    queryKey: ["vault", "stats"],
    queryFn: fetchVaultStats,
    enabled: meta?.connected ?? false,
  });

  const openTodoNodes = (graph?.nodes ?? [])
    .filter((n) => n.todosOpen > 0)
    .sort((a, b) => b.todosOpen - a.todosOpen)
    .slice(0, 8);

  return (
    <div className="flex flex-col gap-4 h-full">
      <GlassCard className="flex-1 min-h-[460px] relative overflow-hidden p-0">
        {!meta?.connected ? (
          <div className="h-full flex items-center justify-center text-center text-text-faint p-6">
            <div>
              <p className="font-heading text-lg text-text-muted mb-1">Gehirn</p>
              <p className="text-sm max-w-sm mx-auto">
                Kein Obsidian-Vault verbunden. VAULT_PATH in den Einstellungen bzw. in der .env eintragen.
              </p>
            </div>
          </div>
        ) : !graph ? (
          <div className="h-full flex items-center justify-center text-text-faint text-sm">Lade Gehirn…</div>
        ) : (
          <>
            <Suspense
              fallback={<div className="h-full flex items-center justify-center text-text-faint text-sm">Lade Gehirn…</div>}
            >
              <BrainScene graph={graph} reducedAnimation={reducedAnimation} />
            </Suspense>
            <div className="absolute bottom-3 left-3 right-3">
              <FilterChips />
            </div>
            <NoteDetailPanel />
          </>
        )}
      </GlassCard>

      <div className="grid grid-cols-12 gap-4">
        <GlassCard className="col-span-12 lg:col-span-5" title="Morgen-Briefing">
          <BriefingCard />
        </GlassCard>

        <GlassCard className="col-span-12 lg:col-span-4" title="Konten-Übersicht">
          <p className="text-text-faint text-sm">Kommt in Phase 3 (Konten, Ampel, Ziel 1,1 Mio $).</p>
        </GlassCard>

        <GlassCard className="col-span-12 lg:col-span-3" title="Heute wichtig">
          <p className="text-text-faint text-sm">Kommt in Phase 9 (Kalender & Kein-Trade-Fenster).</p>
        </GlassCard>

        <GlassCard className="col-span-12 lg:col-span-4" title="Top-Trends">
          <p className="text-text-faint text-sm">Kommt in Phase 7 (Social-Feed, Hype-Radar).</p>
        </GlassCard>

        <GlassCard className="col-span-12 lg:col-span-4" title="Offene To-dos aus dem Vault">
          {!meta?.connected ? (
            <p className="text-text-faint text-sm">Kein Vault verbunden.</p>
          ) : openTodoNodes.length === 0 ? (
            <p className="text-text-faint text-sm">Keine offenen To-dos gefunden.</p>
          ) : (
            <ul className="flex flex-col gap-1.5">
              {openTodoNodes.map((n) => (
                <li key={n.path}>
                  <button
                    onClick={() => selectNote(n.path)}
                    className="flex items-center gap-2 text-sm text-text hover:text-cyan w-full text-left"
                  >
                    <CheckSquare size={14} className="text-text-faint shrink-0" />
                    <span className="truncate flex-1">{n.title}</span>
                    <span className="text-text-faint text-xs shrink-0">{n.todosOpen}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </GlassCard>

        <GlassCard className="col-span-12 lg:col-span-4" title="Gehirn-Statistik">
          {!stats ? (
            <p className="text-text-faint text-sm">Kein Vault verbunden.</p>
          ) : (
            <div className="grid grid-cols-2 gap-3 font-mono-num text-sm">
              <div>
                <div className="text-text-faint text-xs">Notizen</div>
                <div className="text-text text-lg">{stats.noteCount}</div>
              </div>
              <div>
                <div className="text-text-faint text-xs">Links</div>
                <div className="text-text text-lg">{stats.linkCount}</div>
              </div>
              <div>
                <div className="text-text-faint text-xs">Änderungen heute</div>
                <div className="text-text text-lg">{stats.changesToday}</div>
              </div>
              <div>
                <div className="text-text-faint text-xs">Aktivste Region</div>
                <div className="text-text text-sm">
                  {stats.mostActiveRegion ? AREA_LABELS[stats.mostActiveRegion as AreaKey] : "–"}
                </div>
              </div>
            </div>
          )}
        </GlassCard>
      </div>
    </div>
  );
}
