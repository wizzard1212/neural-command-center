import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import clsx from "clsx";
import { RefreshCw } from "lucide-react";
import { fetchLatestBriefing, generateBriefing } from "../../lib/briefingApi";
import { BriefingDetailModal } from "./BriefingDetailModal";

const STATUS_LABEL: Record<string, string> = {
  pending: "Wird erstellt…",
  ok: "Fertig",
  partial: "Teilweise (einige Quellen fehlen)",
  failed: "Fehlgeschlagen",
};

export function BriefingCard() {
  const [showDetail, setShowDetail] = useState(false);
  const queryClient = useQueryClient();

  const { data: briefing, isLoading } = useQuery({
    queryKey: ["briefing", "latest"],
    queryFn: fetchLatestBriefing,
  });

  const generate = useMutation({
    mutationFn: generateBriefing,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["briefing"] }),
  });

  const narrative = briefing?.contentJson?.narrative ?? null;
  const today = new Date().toISOString().slice(0, 10);
  const isToday = briefing?.date === today;

  return (
    <>
      <div className="flex flex-col gap-3 h-full">
        {isLoading ? (
          <p className="text-text-faint text-sm">Lade…</p>
        ) : !briefing ? (
          <p className="text-text-faint text-sm">Noch kein Briefing erstellt.</p>
        ) : (
          <>
            <div className="flex items-center justify-between text-xs">
              <span className="text-text-faint">
                {briefing.date}
                {!isToday && " (nicht heute)"}
              </span>
              <span
                className={clsx(
                  briefing.status === "ok" && "text-green",
                  briefing.status === "partial" && "text-orange",
                  briefing.status === "failed" && "text-red",
                  briefing.status === "pending" && "text-text-faint",
                )}
              >
                {STATUS_LABEL[briefing.status]}
              </span>
            </div>
            <p className="text-sm text-text leading-relaxed line-clamp-4">
              {narrative?.lageInDreiSaetzen ?? "Kein KI-Fließtext verfügbar – nur Rohdaten gesammelt."}
            </p>
          </>
        )}

        <div className="mt-auto flex items-center gap-2 pt-1">
          <button
            onClick={() => setShowDetail(true)}
            disabled={!briefing}
            className="rounded-lg border border-cyan/30 px-3 py-1.5 text-xs text-cyan hover:bg-cyan/10 disabled:opacity-40"
          >
            Ganzes Briefing
          </button>
          <button
            onClick={() => generate.mutate()}
            disabled={generate.isPending}
            className="flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-xs text-text-muted hover:text-text hover:border-cyan/30 disabled:opacity-50"
          >
            <RefreshCw size={12} className={generate.isPending ? "animate-spin" : ""} />
            {generate.isPending ? "Erstelle…" : "Jetzt erstellen"}
          </button>
        </div>
      </div>

      {showDetail && briefing && <BriefingDetailModal briefing={briefing} onClose={() => setShowDetail(false)} />}
    </>
  );
}
