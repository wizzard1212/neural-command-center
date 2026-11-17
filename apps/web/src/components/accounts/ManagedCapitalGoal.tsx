import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil } from "lucide-react";
import { GlassCard } from "../ui/GlassCard";
import { fetchSetting, putSetting } from "../../lib/api";
import { fetchAccountsOverview } from "../../lib/accountsApi";

const SETTING_KEY = "managed_capital_goal_usd";
const DEFAULT_GOAL = 1_100_000;

export function ManagedCapitalGoal() {
  const queryClient = useQueryClient();
  const { data: overview } = useQuery({ queryKey: ["accounts", "overview"], queryFn: fetchAccountsOverview });
  const { data: goalValue } = useQuery({
    queryKey: ["settings", SETTING_KEY],
    queryFn: () => fetchSetting<number>(SETTING_KEY),
  });
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(DEFAULT_GOAL);

  const goal = goalValue ?? DEFAULT_GOAL;

  const save = useMutation({
    mutationFn: () => putSetting(SETTING_KEY, draft),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings", SETTING_KEY] });
      setEditing(false);
    },
  });

  const current = overview?.managedCapitalUsd ?? 0;
  const pct = goal > 0 ? Math.min(100, (current / goal) * 100) : 0;

  return (
    <GlassCard>
      <div className="flex items-center justify-between mb-2">
        <h3 className="section-label">Fortschritt zum Gesamtziel (verwaltetes Kapital)</h3>
        {editing ? (
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={draft}
              onChange={(e) => setDraft(Number(e.target.value))}
              className="w-28 bg-bg2 border border-line rounded px-2 py-1 text-xs text-text"
            />
            <button onClick={() => save.mutate()} className="text-xs text-cyan">
              Speichern
            </button>
          </div>
        ) : (
          <button
            onClick={() => {
              setDraft(goal);
              setEditing(true);
            }}
            className="text-text-faint hover:text-cyan"
          >
            <Pencil size={13} />
          </button>
        )}
      </div>

      <div className="flex items-end justify-between mb-2 font-mono-num">
        <span className="text-2xl text-green" style={{ textShadow: "0 0 12px rgba(0,255,157,0.4)" }}>
          {current.toLocaleString("de-DE")} $
        </span>
        <span className="text-text-faint text-sm">Ziel: {goal.toLocaleString("de-DE")} $</span>
      </div>

      <div className="h-3 rounded-full bg-bg2 overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-cyan via-green to-green"
          style={{ width: `${pct}%`, boxShadow: "0 0 10px rgba(0,255,157,0.5)" }}
        />
      </div>
    </GlassCard>
  );
}
