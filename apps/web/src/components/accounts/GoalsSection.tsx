import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { GlassCard } from "../ui/GlassCard";
import { fetchGoals, createGoal, updateGoal, deleteGoalApi, type Goal } from "../../lib/accountsApi";

function GoalRow({ goal }: { goal: Goal }) {
  const queryClient = useQueryClient();
  const [value, setValue] = useState(goal.currentValue);

  const save = useMutation({
    mutationFn: () => updateGoal(goal.id, { currentValue: value }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["goals"] }),
  });
  const remove = useMutation({
    mutationFn: () => deleteGoalApi(goal.id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["goals"] }),
  });

  const pct = goal.targetValue > 0 ? Math.min(100, (value / goal.targetValue) * 100) : 0;
  const unitSuffix = goal.unit === "usd" ? "$" : "%";

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="text-text">{goal.title}</span>
        <div className="flex items-center gap-2">
          <input
            type="number"
            value={value}
            onChange={(e) => setValue(Number(e.target.value))}
            onBlur={() => value !== goal.currentValue && save.mutate()}
            className="w-24 bg-bg2 border border-line rounded px-1.5 py-0.5 text-xs text-text font-mono-num text-right"
          />
          <span className="text-text-faint text-xs">
            / {goal.targetValue.toLocaleString("de-DE")} {unitSuffix}
          </span>
          <button onClick={() => remove.mutate()} className="text-text-faint hover:text-red">
            <Trash2 size={13} />
          </button>
        </div>
      </div>
      <div className="h-1.5 rounded-full bg-bg2 overflow-hidden">
        <div className="h-full bg-gradient-to-r from-cyan to-green" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function GoalsSection() {
  const queryClient = useQueryClient();
  const { data: goals } = useQuery({ queryKey: ["goals", "global"], queryFn: () => fetchGoals("global") });
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState("");
  const [targetValue, setTargetValue] = useState(1000);
  const [unit, setUnit] = useState<"usd" | "pct">("usd");

  const create = useMutation({
    mutationFn: () => createGoal({ title, targetValue, unit, accountId: null }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["goals"] });
      setAdding(false);
      setTitle("");
    },
  });

  return (
    <GlassCard title="Eigene Ziele">
      <div className="flex flex-col gap-4">
        {(goals ?? []).map((g) => (
          <GoalRow key={g.id} goal={g} />
        ))}
        {goals?.length === 0 && !adding && <p className="text-text-faint text-sm">Noch keine Ziele angelegt.</p>}

        {adding ? (
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-line">
            <input
              placeholder="z. B. Monatsziel 4%"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="flex-1 min-w-32 bg-bg2 border border-line rounded px-2 py-1 text-xs text-text"
            />
            <input
              type="number"
              value={targetValue}
              onChange={(e) => setTargetValue(Number(e.target.value))}
              className="w-24 bg-bg2 border border-line rounded px-2 py-1 text-xs text-text"
            />
            <select
              value={unit}
              onChange={(e) => setUnit(e.target.value as "usd" | "pct")}
              className="bg-bg2 border border-line rounded px-2 py-1 text-xs text-text"
            >
              <option value="usd">$</option>
              <option value="pct">%</option>
            </select>
            <button
              onClick={() => create.mutate()}
              disabled={!title || create.isPending}
              className="rounded-lg bg-cyan/20 text-cyan px-2.5 py-1 text-xs disabled:opacity-50"
            >
              Speichern
            </button>
            <button onClick={() => setAdding(false)} className="text-text-faint text-xs">
              Abbrechen
            </button>
          </div>
        ) : (
          <button
            onClick={() => setAdding(true)}
            className="flex items-center gap-1.5 text-xs text-cyan self-start pt-1"
          >
            <Plus size={14} /> Ziel hinzufügen
          </button>
        )}
      </div>
    </GlassCard>
  );
}
