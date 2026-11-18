import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ExternalLink, Sparkles, BookmarkPlus, Check } from "lucide-react";
import { GlassCard } from "../ui/GlassCard";
import { generateSocialHookIdea, saveSocialContentIdea, type SocialItem } from "../../lib/socialApi";
import { fetchStatus } from "../../lib/api";

export function SocialDetailPanel({ item }: { item: SocialItem | null }) {
  const [hookDe, setHookDe] = useState("");
  const [hookEn, setHookEn] = useState("");
  const [hookError, setHookError] = useState<string | null>(null);

  const { data: status } = useQuery({ queryKey: ["status"], queryFn: fetchStatus });
  const kiAvailable = status?.connections.find((c) => c.source === "ki")?.status === "connected";

  const hookMutation = useMutation({
    mutationFn: () => generateSocialHookIdea(item!.id),
    onSuccess: (res) => {
      setHookDe(res.hookDe);
      setHookEn(res.hookEn);
      setHookError(null);
    },
    onError: (err) => setHookError((err as Error).message),
  });

  const ideaMutation = useMutation({
    mutationFn: () => saveSocialContentIdea(item!.id, hookDe || undefined, hookEn || undefined),
  });

  if (!item) {
    return (
      <GlassCard className="h-full flex items-center justify-center">
        <p className="text-text-faint text-sm text-center">Wähle ein Thema aus einer Kachel.</p>
      </GlassCard>
    );
  }

  return (
    <GlassCard className="flex flex-col gap-4 h-full overflow-y-auto">
      <div>
        <h2 className="font-heading text-base text-text leading-snug">{item.title ?? item.topic}</h2>
        <p className="text-xs text-text-faint mt-1">
          {item.platform} · {new Date(item.ts).toLocaleString("de-DE")}
        </p>
        {item.metricType && item.metricValue != null && (
          <p className="text-xs text-text-muted mt-1">
            {item.metricType}: {item.metricValue}
          </p>
        )}
      </div>

      {item.url && (
        <a href={item.url} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-xs text-cyan w-fit">
          <ExternalLink size={13} /> Original öffnen
        </a>
      )}

      <div className="border-t border-line pt-3">
        <button
          onClick={() => hookMutation.mutate()}
          disabled={!kiAvailable || hookMutation.isPending}
          className="flex items-center gap-1.5 text-xs text-cyan disabled:opacity-40"
        >
          <Sparkles size={13} /> {hookMutation.isPending ? "Generiert..." : "Hook-Idee generieren (KI)"}
        </button>
        {!kiAvailable && <p className="text-text-faint text-xs mt-1">ANTHROPIC_API_KEY fehlt in .env.</p>}
        {hookError && <p className="text-xs text-red mt-1">{hookError}</p>}
      </div>

      <div className="border-t border-line pt-3 flex flex-col gap-2">
        <textarea
          placeholder="Hook-Idee (DE)"
          value={hookDe}
          onChange={(e) => setHookDe(e.target.value)}
          rows={2}
          className="bg-bg2 border border-line rounded-lg px-2.5 py-1.5 text-xs text-text resize-none"
        />
        <textarea
          placeholder="Hook-Idee (EN)"
          value={hookEn}
          onChange={(e) => setHookEn(e.target.value)}
          rows={2}
          className="bg-bg2 border border-line rounded-lg px-2.5 py-1.5 text-xs text-text resize-none"
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
