import { lazy, Suspense } from "react";
import { useQuery } from "@tanstack/react-query";
import clsx from "clsx";
import { CheckSquare } from "lucide-react";
import { GlassCard } from "../components/ui/GlassCard";
import { FilterChips } from "../components/brain/FilterChips";
import { NoteDetailPanel } from "../components/brain/NoteDetailPanel";
import { BriefingCard } from "../components/briefing/BriefingCard";
import { BrainChat } from "../components/brainchat/BrainChat";
import { fetchHypeRadar } from "../lib/socialApi";
import { fetchCalendarEvents, fetchNoTradeWindows } from "../lib/calendarApi";
import { fetchAccountsOverview } from "../lib/accountsApi";
import { fetchSetting } from "../lib/api";
import { TrafficLightDot } from "../components/accounts/TrafficLightDot";

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
  const { data: hypeRadar } = useQuery({ queryKey: ["social", "hype-radar"], queryFn: fetchHypeRadar });
  const { data: calendarEvents } = useQuery({ queryKey: ["calendar", "events"], queryFn: () => fetchCalendarEvents() });
  const { data: accountsOverview } = useQuery({ queryKey: ["accounts", "overview"], queryFn: fetchAccountsOverview });
  const { data: capitalGoal } = useQuery({
    queryKey: ["settings", "managed_capital_goal_usd"],
    queryFn: () => fetchSetting<number>("managed_capital_goal_usd"),
  });
  const { data: noTrade } = useQuery({ queryKey: ["calendar", "no-trade-windows"], queryFn: fetchNoTradeWindows });

  const nextHighImpact = (calendarEvents ?? [])
    .filter((e) => e.impact === "high" && new Date(e.ts).getTime() > Date.now())
    .slice(0, 3);

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
          {!accountsOverview || accountsOverview.accountCount === 0 ? (
            <p className="text-text-faint text-sm">Noch keine Konten angelegt.</p>
          ) : (
            (() => {
              const goal = capitalGoal ?? 1_100_000;
              const pct = goal > 0 ? Math.min(100, (accountsOverview.managedCapitalUsd / goal) * 100) : 0;
              return (
                <div className="flex flex-col gap-3">
                  <div className="grid grid-cols-2 gap-3 font-mono-num text-sm">
                    <div>
                      <div className="text-text-faint text-xs">Summe Equity</div>
                      <div className="text-text text-lg">{accountsOverview.totalEquity.toLocaleString("de-DE")} $</div>
                    </div>
                    <div>
                      <div className="text-text-faint text-xs">Tages-P&L</div>
                      <div className={accountsOverview.totalDailyPnl >= 0 ? "text-green text-lg" : "text-red text-lg"}>
                        {accountsOverview.totalDailyPnl >= 0 ? "+" : ""}
                        {accountsOverview.totalDailyPnl.toLocaleString("de-DE")} $
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-text-muted">
                    <TrafficLightDot light={{ color: accountsOverview.worstLight, pulsing: false }} size="sm" />
                    Risiko-Ampel: strengstes Konto {accountsOverview.worstLight}
                  </div>
                  <div>
                    <div className="flex items-center justify-between text-xs text-text-faint mb-1">
                      <span>Ziel: verwaltetes Kapital</span>
                      <span className="font-mono-num">
                        {accountsOverview.managedCapitalUsd.toLocaleString("de-DE")} / {goal.toLocaleString("de-DE")} $
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-bg2 overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-cyan to-green" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                </div>
              );
            })()
          )}
        </GlassCard>

        <GlassCard className="col-span-12 lg:col-span-3" title="Heute wichtig">
          {nextHighImpact.length === 0 ? (
            <p className="text-text-faint text-sm">Keine High-Impact-Termine geladen.</p>
          ) : (
            <ul className="flex flex-col gap-1.5">
              {nextHighImpact.map((e) => (
                <li key={e.id} className="text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-text truncate">{e.title}</span>
                    <span className="text-text-faint text-xs font-mono-num shrink-0">
                      {new Date(e.ts).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                  <span className="text-text-faint text-xs">{e.country}</span>
                </li>
              ))}
            </ul>
          )}
          {noTrade?.countdown.next && (
            <p className={clsx("text-xs mt-2 pt-2 border-t border-line", noTrade.countdown.activeNow ? "text-red" : "text-orange")}>
              {noTrade.countdown.activeNow
                ? `Kein-Trade-Fenster aktiv: ${noTrade.countdown.next.eventTitle}`
                : `Nächstes Kein-Trade-Fenster in ${noTrade.countdown.minutesUntilNext} min`}
            </p>
          )}
        </GlassCard>

        <GlassCard className="col-span-12 lg:col-span-4" title="Top-Trends">
          {!hypeRadar || hypeRadar.length === 0 ? (
            <p className="text-text-faint text-sm">Noch keine Social-Daten gesammelt.</p>
          ) : (
            <ul className="flex flex-col gap-1.5">
              {hypeRadar.map((t) => (
                <li key={t.topic} className="flex items-center justify-between text-sm">
                  <span className="font-mono-num text-text">{t.topic}</span>
                  <span className="text-text-faint text-xs">
                    {t.mentions24h}/24h · Z {t.zscore.toFixed(1)}
                  </span>
                </li>
              ))}
            </ul>
          )}
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

      <BrainChat />
    </div>
  );
}
