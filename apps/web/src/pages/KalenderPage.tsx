import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import clsx from "clsx";
import { RefreshCw, AlertTriangle } from "lucide-react";
import { GlassCard } from "../components/ui/GlassCard";
import { fetchCalendarEvents, fetchNoTradeWindows, refreshCalendar, type CalendarEvent } from "../lib/calendarApi";

const IMPACT_LABEL: Record<CalendarEvent["impact"], string> = { high: "Hoch", medium: "Mittel", low: "Niedrig" };
const IMPACT_CLASS: Record<CalendarEvent["impact"], string> = {
  high: "text-red border-red/30 bg-red/10",
  medium: "text-orange border-orange/30 bg-orange/10",
  low: "text-text-muted border-line bg-bg2",
};

function groupByDay(events: CalendarEvent[]): Map<string, CalendarEvent[]> {
  const map = new Map<string, CalendarEvent[]>();
  for (const e of events) {
    const day = e.ts.slice(0, 10);
    if (!map.has(day)) map.set(day, []);
    map.get(day)!.push(e);
  }
  return map;
}

function NoTradeTimeline() {
  const { data } = useQuery({ queryKey: ["calendar", "no-trade-windows"], queryFn: fetchNoTradeWindows });
  const windows = data?.windows ?? [];

  const today = new Date().toISOString().slice(0, 10);
  const todayWindows = windows.filter((w) => w.startsAt.slice(0, 10) === today || w.endsAt.slice(0, 10) === today);

  if (todayWindows.length === 0) {
    return <p className="text-text-faint text-sm">Heute keine Kein-Trade-Fenster (keine High-Impact-Termine oder keine Konten-Regel gesetzt).</p>;
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="relative h-8 rounded-lg bg-bg2 overflow-hidden">
        {todayWindows.map((w, i) => {
          const start = new Date(w.startsAt);
          const end = new Date(w.endsAt);
          const startPct = ((start.getUTCHours() * 60 + start.getUTCMinutes()) / 1440) * 100;
          const endPct = ((end.getUTCHours() * 60 + end.getUTCMinutes()) / 1440) * 100;
          return (
            <div
              key={i}
              className="absolute top-0 h-full bg-red/70"
              style={{ left: `${startPct}%`, width: `${Math.max(endPct - startPct, 0.5)}%` }}
              title={`${w.eventTitle} – ${w.accountLabel}`}
            />
          );
        })}
      </div>
      <div className="flex justify-between text-text-faint text-[10px] font-mono-num">
        <span>00:00 UTC</span>
        <span>12:00 UTC</span>
        <span>24:00 UTC</span>
      </div>
      <ul className="flex flex-col gap-1 mt-1">
        {todayWindows.map((w, i) => (
          <li key={i} className="flex items-center gap-2 text-xs text-text-muted">
            <AlertTriangle size={12} className="text-red shrink-0" />
            {new Date(w.startsAt).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })}–
            {new Date(w.endsAt).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })} Uhr: {w.eventTitle} (
            {w.country}) – {w.accountLabel}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function KalenderPage() {
  const queryClient = useQueryClient();
  const { data: events } = useQuery({ queryKey: ["calendar", "events"], queryFn: () => fetchCalendarEvents() });

  const refresh = useMutation({
    mutationFn: refreshCalendar,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["calendar"] }),
  });

  const byDay = groupByDay(events ?? []);
  const days = [...byDay.keys()].sort();

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-xl text-text">Kalender & Kein-Trade-Fenster</h1>
        <button
          onClick={() => refresh.mutate()}
          disabled={refresh.isPending}
          className="flex items-center gap-1.5 rounded-lg border border-cyan/30 px-3 py-1.5 text-xs text-cyan hover:bg-cyan/10 disabled:opacity-50"
        >
          <RefreshCw size={13} className={refresh.isPending ? "animate-spin" : ""} />
          {refresh.isPending ? "Aktualisiert…" : "Jetzt aktualisieren"}
        </button>
      </div>

      {refresh.data && !refresh.data.available && (
        <p className="text-xs text-orange">{refresh.data.reason}</p>
      )}

      <GlassCard title="Kein-Trade-Fenster heute">
        <NoTradeTimeline />
      </GlassCard>

      <GlassCard title="Wirtschaftskalender (7 Tage)">
        {days.length === 0 ? (
          <p className="text-text-faint text-sm">
            Keine Termine geladen. {refresh.isIdle && "FMP_API_KEY fehlt möglicherweise in .env, oder noch nicht aktualisiert."}
          </p>
        ) : (
          <div className="flex flex-col gap-4">
            {days.map((day) => (
              <div key={day}>
                <h3 className="section-label mb-2">
                  {new Date(day).toLocaleDateString("de-DE", { weekday: "long", day: "2-digit", month: "2-digit" })}
                </h3>
                <div className="flex flex-col gap-1.5">
                  {byDay.get(day)!.map((e) => (
                    <div key={e.id} className="flex items-center gap-3 text-sm">
                      <span className="font-mono-num text-text-faint w-12 shrink-0">
                        {new Date(e.ts).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })}
                      </span>
                      <span className={clsx("text-[10px] rounded-full border px-1.5 py-0.5 shrink-0", IMPACT_CLASS[e.impact])}>
                        {IMPACT_LABEL[e.impact]}
                      </span>
                      <span className="text-text-faint text-xs w-8 shrink-0">{e.country}</span>
                      <span className="text-text flex-1 truncate">{e.title}</span>
                      <span className="text-text-faint text-xs font-mono-num shrink-0">
                        P: {e.previous ?? "–"} · E: {e.forecast ?? "–"} · A: {e.actual ?? "–"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </GlassCard>
    </div>
  );
}
