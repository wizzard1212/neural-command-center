import clsx from "clsx";
import { ArrowUp, ArrowDown, Minus } from "lucide-react";
import { RelevanceBars } from "./RelevanceBars";
import { categoryColor } from "./categoryColors";
import type { NewsCluster } from "../../lib/newsApi";

const DIRECTION_ICON = { up: ArrowUp, down: ArrowDown, unclear: Minus } as const;
const DIRECTION_COLOR = { up: "text-green", down: "text-red", unclear: "text-text-faint" } as const;

function timeLabel(iso: string): string {
  return new Date(iso).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
}

export function NewsCard({ cluster, selected, onClick }: { cluster: NewsCluster; selected: boolean; onClick: () => void }) {
  const item = cluster.representative;
  const assets = item.assetsJson ?? [];
  const directions = item.directionJson ?? {};

  return (
    <button
      onClick={onClick}
      className={clsx(
        "glass-card w-full text-left p-3.5 flex flex-col gap-2 border-l-2",
        selected && "border-cyan/60 bg-bg2/40",
      )}
      style={{ borderLeftColor: item.category ? categoryColor(item.category) : undefined }}
    >
      <div className="flex items-center justify-between text-xs text-text-faint">
        <span>
          {timeLabel(item.publishedAt)} · {item.source}
          {cluster.sourceCount > 1 && ` (+${cluster.sourceCount - 1} weitere)`}
        </span>
        <RelevanceBars relevance={item.relevance} />
      </div>

      <p className="text-sm text-text leading-snug">{item.title}</p>

      {assets.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {assets.map((asset) => {
            const dir = (directions[asset] as keyof typeof DIRECTION_ICON) ?? "unclear";
            const Icon = DIRECTION_ICON[dir] ?? Minus;
            return (
              <span
                key={asset}
                className="flex items-center gap-1 rounded-full border border-line px-2 py-0.5 text-xs text-text-muted"
              >
                {asset}
                <Icon size={11} className={DIRECTION_COLOR[dir] ?? "text-text-faint"} />
              </span>
            );
          })}
        </div>
      )}
    </button>
  );
}
