import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import clsx from "clsx";
import { Check, X, Trash2, Plus } from "lucide-react";
import { GlassCard } from "../ui/GlassCard";
import { fetchPredictions, createPrediction, resolvePrediction, deletePrediction } from "../../lib/predictionsApi";

const OUTCOME_LABEL: Record<string, string> = { open: "Offen", hit: "Eingetroffen", miss: "Nicht eingetroffen" };
const OUTCOME_CLASS: Record<string, string> = {
  open: "text-text-muted border-line bg-bg2",
  hit: "text-green border-green/30 bg-green/10",
  miss: "text-red border-red/30 bg-red/10",
};

/** Abschnitt 11: "Prognose-Logbuch: Einschätzungen aus Briefing oder eigene
 * Prognosen speichern, später als eingetroffen/nicht eingetroffen markieren,
 * Trefferquote anzeigen." */
export function PredictionLogCard() {
  const queryClient = useQueryClient();
  const [text, setText] = useState("");
  const [asset, setAsset] = useState("");

  const { data } = useQuery({ queryKey: ["predictions"], queryFn: fetchPredictions });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["predictions"] });
  const create = useMutation({
    mutationFn: () => createPrediction({ text, asset: asset || null }),
    onSuccess: () => {
      invalidate();
      setText("");
      setAsset("");
    },
  });
  const resolve = useMutation({
    mutationFn: ({ id, outcome }: { id: number; outcome: "hit" | "miss" | "open" }) => resolvePrediction(id, outcome),
    onSuccess: invalidate,
  });
  const remove = useMutation({
    mutationFn: (id: number) => deletePrediction(id),
    onSuccess: invalidate,
  });

  const hitRate = data?.hitRate;
  const items = data?.items ?? [];

  return (
    <GlassCard title="Prognose-Logbuch">
      <div className="flex items-center justify-between mb-3">
        <span className="text-text-faint text-xs">
          {hitRate?.hitRatePct !== null && hitRate?.hitRatePct !== undefined
            ? `Trefferquote: ${hitRate.hitRatePct.toFixed(0)}% (${hitRate.resolvedCount} bewertet, ${hitRate.openCount} offen)`
            : `Noch keine bewerteten Prognosen (${hitRate?.openCount ?? 0} offen)`}
        </span>
      </div>

      <div className="flex items-center gap-2 mb-3">
        <input
          value={asset}
          onChange={(e) => setAsset(e.target.value)}
          placeholder="Asset (optional)"
          className="w-28 bg-bg2 border border-line rounded-lg px-2.5 py-1.5 text-xs text-text"
        />
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && text.trim() && create.mutate()}
          placeholder="Eigene Prognose, z. B. 'XAUUSD testet 2700 diese Woche'"
          className="flex-1 bg-bg2 border border-line rounded-lg px-2.5 py-1.5 text-xs text-text"
        />
        <button
          onClick={() => create.mutate()}
          disabled={!text.trim() || create.isPending}
          className="flex items-center gap-1 rounded-lg border border-cyan/30 px-2.5 py-1.5 text-xs text-cyan hover:bg-cyan/10 disabled:opacity-40"
        >
          <Plus size={13} /> Merken
        </button>
      </div>

      {items.length === 0 ? (
        <p className="text-text-faint text-sm">Noch keine Prognosen gespeichert.</p>
      ) : (
        <ul className="flex flex-col gap-1.5 max-h-72 overflow-y-auto">
          {items.map((p) => (
            <li key={p.id} className="flex items-center gap-2 text-sm">
              <span className={clsx("text-[10px] rounded-full border px-1.5 py-0.5 shrink-0", OUTCOME_CLASS[p.outcome])}>
                {OUTCOME_LABEL[p.outcome]}
              </span>
              {p.asset && <span className="font-mono-num text-text-faint text-xs shrink-0">{p.asset}</span>}
              <span className="text-text flex-1 truncate">{p.text}</span>
              <span className="text-text-faint text-[10px] shrink-0">{p.createdAt.slice(0, 10)}</span>
              {p.outcome === "open" && (
                <>
                  <button
                    onClick={() => resolve.mutate({ id: p.id, outcome: "hit" })}
                    title="Eingetroffen"
                    className="text-green hover:bg-green/10 rounded p-1 shrink-0"
                  >
                    <Check size={14} />
                  </button>
                  <button
                    onClick={() => resolve.mutate({ id: p.id, outcome: "miss" })}
                    title="Nicht eingetroffen"
                    className="text-red hover:bg-red/10 rounded p-1 shrink-0"
                  >
                    <X size={14} />
                  </button>
                </>
              )}
              <button
                onClick={() => remove.mutate(p.id)}
                title="Löschen"
                className="text-text-faint hover:text-red rounded p-1 shrink-0"
              >
                <Trash2 size={13} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </GlassCard>
  );
}
