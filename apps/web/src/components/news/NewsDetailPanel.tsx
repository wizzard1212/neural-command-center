import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ExternalLink, Sparkles, BookmarkPlus, Check } from "lucide-react";
import { GlassCard } from "../ui/GlassCard";
import { RelevanceBars } from "./RelevanceBars";
import { categoryColor } from "./categoryColors";
import { explainNews, saveContentIdea, type NewsItem } from "../../lib/newsApi";
import { fetchStatus } from "../../lib/api";

export function NewsDetailPanel({ item }: { item: NewsItem | null }) {
  const [hookDe, setHookDe] = useState("");
  const [hookEn, setHookEn] = useState("");
  const [explanation, setExplanation] = useState<string | null>(null);
  const [explainError, setExplainError] = useState<string | null>(null);

  const { data: status } = useQuery({ queryKey: ["status"], queryFn: fetchStatus });
  const kiAvailable = status?.connections.find((c) => c.source === "ki")?.status === "connected";

  const explainMutation = useMutation({
    mutationFn: () => explainNews(item!.id),
    onSuccess: (res) => setExplanation(res.explanation),
    onError: (err) => setExplainError((err as Error).message),
  });

  const ideaMutation = useMutation({
    mutationFn: () => saveContentIdea(item!.id, hookDe || undefined, hookEn || undefined),
  });

  if (!item) {
    return (
      <GlassCard className="h-full flex items-center justify-center">
        <p className="text-text-faint text-sm text-center">Wähle eine Meldung aus der Liste.</p>
      </GlassCard>
    );
  }

  const assets = item.assetsJson ?? [];
  const directions = item.directionJson ?? {};

  return (
    <GlassCard className="flex flex-col gap-4 h-full overflow-y-auto">
      <div>
        <div className="flex items-center justify-between mb-1">
          {item.category && (
            <span
              className="text-xs font-medium rounded-full px-2 py-0.5"
              style={{ color: categoryColor(item.category), backgroundColor: `${categoryColor(item.category)}22` }}
            >
              {item.category}
            </span>
          )}
          <RelevanceBars relevance={item.relevance} />
        </div>
        <h2 className="font-heading text-base text-text leading-snug">{item.title}</h2>
        <p className="text-xs text-text-faint mt-1">
          {item.source} · {new Date(item.publishedAt).toLocaleString("de-DE")}
        </p>
      </div>

      {assets.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {assets.map((a) => (
            <span key={a} className="rounded-full border border-line px-2 py-0.5 text-xs text-text-muted">
              {a}: {directions[a] === "up" ? "↑" : directions[a] === "down" ? "↓" : "unklar"}
            </span>
          ))}
        </div>
      )}

      {item.summaryDe ? (
        <p className="text-sm text-text">{item.summaryDe}</p>
      ) : (
        <p className="text-sm text-text-faint">Noch keine KI-Zusammenfassung (wartet auf nächsten Bewertungslauf).</p>
      )}

      <a
        href={item.url}
        target="_blank"
        rel="noreferrer"
        className="flex items-center gap-1.5 text-xs text-cyan w-fit"
      >
        <ExternalLink size={13} /> Original öffnen
      </a>

      <div className="border-t border-line pt-3">
        <button
          onClick={() => explainMutation.mutate()}
          disabled={!kiAvailable || explainMutation.isPending}
          className="flex items-center gap-1.5 text-xs text-cyan disabled:opacity-40"
        >
          <Sparkles size={13} /> {explainMutation.isPending ? "Erklärt..." : "Zusammenhang erklären"}
        </button>
        {!kiAvailable && <p className="text-text-faint text-xs mt-1">ANTHROPIC_API_KEY fehlt in .env.</p>}
        {explanation && <p className="text-sm text-text mt-2 bg-bg2/60 rounded-lg p-2.5">{explanation}</p>}
        {explainError && <p className="text-xs text-red mt-1">{explainError}</p>}
      </div>

      <div className="border-t border-line pt-3 flex flex-col gap-2">
        <input
          placeholder="Hook-Idee (DE)"
          value={hookDe}
          onChange={(e) => setHookDe(e.target.value)}
          className="bg-bg2 border border-line rounded-lg px-2.5 py-1.5 text-xs text-text"
        />
        <input
          placeholder="Hook-Idee (EN)"
          value={hookEn}
          onChange={(e) => setHookEn(e.target.value)}
          className="bg-bg2 border border-line rounded-lg px-2.5 py-1.5 text-xs text-text"
        />
        <button
          onClick={() => ideaMutation.mutate()}
          disabled={ideaMutation.isPending}
          className="flex items-center justify-center gap-1.5 rounded-lg border border-cyan/30 px-3 py-1.5 text-xs text-cyan disabled:opacity-50"
        >
          {ideaMutation.isSuccess ? <Check size={13} /> : <BookmarkPlus size={13} />}
          {ideaMutation.isSuccess ? "Gemerkt" : "Als Content-Idee merken"}
        </button>
      </div>
    </GlassCard>
  );
}
