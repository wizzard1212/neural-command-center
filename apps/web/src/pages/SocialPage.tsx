import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { RefreshCw } from "lucide-react";
import { GlassCard } from "../components/ui/GlassCard";
import { HypeRadar } from "../components/social/HypeRadar";
import { PlatformTile } from "../components/social/PlatformTile";
import { SocialDetailPanel } from "../components/social/SocialDetailPanel";
import { SentimentGauge } from "../components/social/SentimentGauge";
import {
  fetchHypeRadar,
  fetchSocialFeed,
  fetchSentiment,
  fetchSocialSources,
  refreshSocial,
  type SocialItem,
} from "../lib/socialApi";

export function SocialPage() {
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<SocialItem | null>(null);

  const { data: hypeRadar } = useQuery({ queryKey: ["social", "hype-radar"], queryFn: fetchHypeRadar });
  const { data: sentiment } = useQuery({ queryKey: ["social", "sentiment"], queryFn: fetchSentiment });
  const { data: sources } = useQuery({ queryKey: ["social", "sources"], queryFn: fetchSocialSources });

  const { data: reddit } = useQuery({ queryKey: ["social", "feed", "reddit"], queryFn: () => fetchSocialFeed("reddit") });
  const { data: coingecko } = useQuery({
    queryKey: ["social", "feed", "coingecko_trending"],
    queryFn: () => fetchSocialFeed("coingecko_trending"),
  });
  const { data: lunarcrush } = useQuery({
    queryKey: ["social", "feed", "lunarcrush"],
    queryFn: () => fetchSocialFeed("lunarcrush"),
  });
  const { data: youtube } = useQuery({ queryKey: ["social", "feed", "youtube"], queryFn: () => fetchSocialFeed("youtube") });
  const { data: trends } = useQuery({
    queryKey: ["social", "feed", "google_trends"],
    queryFn: () => fetchSocialFeed("google_trends"),
  });

  const refresh = useMutation({
    mutationFn: refreshSocial,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["social"] }),
  });

  const krypto = [...(coingecko ?? []), ...(lunarcrush ?? [])];
  const sourceById = (id: string) => (sources ?? []).filter((s) => s.id === id);

  return (
    <div className="flex flex-col gap-4 h-full">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-xl text-text">Social-Feed / Trends</h1>
        <button
          onClick={() => refresh.mutate()}
          disabled={refresh.isPending}
          className="flex items-center gap-1.5 rounded-lg border border-cyan/30 px-3 py-1.5 text-xs text-cyan hover:bg-cyan/10 disabled:opacity-50"
        >
          <RefreshCw size={13} className={refresh.isPending ? "animate-spin" : ""} />
          {refresh.isPending ? "Aktualisiert…" : "Jetzt aktualisieren"}
        </button>
      </div>

      <GlassCard title="Hype-Radar">
        <HypeRadar entries={hypeRadar ?? []} />
      </GlassCard>

      <div className="grid grid-cols-12 gap-4 flex-1 min-h-[360px]">
        <div className="col-span-12 lg:col-span-8 grid grid-cols-2 gap-4">
          <PlatformTile
            title="Reddit"
            items={reddit ?? []}
            sources={sourceById("reddit")}
            selectedId={selected?.id ?? null}
            onSelect={setSelected}
          />
          <PlatformTile
            title="Krypto"
            items={krypto}
            sources={sourceById("coingecko_trending").concat(sourceById("lunarcrush"))}
            selectedId={selected?.id ?? null}
            onSelect={setSelected}
          />
          <PlatformTile
            title="YouTube"
            items={youtube ?? []}
            sources={sourceById("youtube")}
            selectedId={selected?.id ?? null}
            onSelect={setSelected}
          />
          <PlatformTile
            title="Trends"
            items={trends ?? []}
            sources={sourceById("google_trends")}
            selectedId={selected?.id ?? null}
            onSelect={setSelected}
          />
        </div>
        <div className="col-span-12 lg:col-span-4">
          <SocialDetailPanel item={selected} />
        </div>
      </div>

      <GlassCard title="Sentiment-Barometer (Watchlist)">
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
          {(sentiment ?? []).map((s) => (
            <SentimentGauge key={s.asset} sentiment={s} />
          ))}
        </div>
      </GlassCard>
    </div>
  );
}
