import { useMemo } from "react";
import type { Trade } from "../../lib/journalApi";

const WEEKS = 16;
const DAY_LABELS = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];

export function CalendarHeatmap({ trades }: { trades: Trade[] }) {
  const dailyPnl = useMemo(() => {
    const map = new Map<string, number>();
    for (const t of trades) {
      if (t.resultUsd === null || !t.closedAt) continue;
      const day = t.closedAt.slice(0, 10);
      map.set(day, (map.get(day) ?? 0) + t.resultUsd);
    }
    return map;
  }, [trades]);

  const days = useMemo(() => {
    const today = new Date();
    const start = new Date(today);
    start.setDate(start.getDate() - WEEKS * 7);
    // Auf Montag ausrichten
    const dayOfWeek = (start.getDay() + 6) % 7;
    start.setDate(start.getDate() - dayOfWeek);

    const list: { date: string; pnl: number | undefined }[] = [];
    const cursor = new Date(start);
    while (cursor <= today) {
      const iso = cursor.toISOString().slice(0, 10);
      list.push({ date: iso, pnl: dailyPnl.get(iso) });
      cursor.setDate(cursor.getDate() + 1);
    }
    return list;
  }, [dailyPnl]);

  const weeks: { date: string; pnl: number | undefined }[][] = [];
  for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7));

  const maxAbs = Math.max(1, ...[...dailyPnl.values()].map((v) => Math.abs(v)));

  function colorFor(pnl: number | undefined): string {
    if (pnl === undefined) return "#0A0D16"; // --bg-2
    if (pnl === 0) return "#1B2740"; // --line
    const intensity = Math.min(1, Math.abs(pnl) / maxAbs);
    return pnl > 0 ? `rgba(0,255,157,${0.25 + intensity * 0.6})` : `rgba(255,90,90,${0.25 + intensity * 0.6})`;
  }

  return (
    <div className="flex gap-3">
      <div className="flex flex-col gap-1 text-[10px] text-text-faint pt-4">
        {DAY_LABELS.map((d) => (
          <div key={d} className="h-3 leading-3">
            {d}
          </div>
        ))}
      </div>
      <div className="flex gap-1 overflow-x-auto">
        {weeks.map((week, wi) => (
          <div key={wi} className="flex flex-col gap-1">
            {week.map((day) => (
              <div
                key={day.date}
                title={`${day.date}${day.pnl !== undefined ? `: ${day.pnl >= 0 ? "+" : ""}${day.pnl.toFixed(0)} $` : ""}`}
                className="h-3 w-3 rounded-sm"
                style={{ backgroundColor: colorFor(day.pnl) }}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
