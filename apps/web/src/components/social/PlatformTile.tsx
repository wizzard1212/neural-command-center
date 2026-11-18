import clsx from "clsx";
import { GlassCard } from "../ui/GlassCard";
import type { SocialItem, SocialSourceStatus } from "../../lib/socialApi";

export function PlatformTile({
  title,
  items,
  sources,
  selectedId,
  onSelect,
}: {
  title: string;
  items: SocialItem[];
  sources: SocialSourceStatus[];
  selectedId: number | null;
  onSelect: (item: SocialItem) => void;
}) {
  const connected = sources.some((s) => s.status === "connected");
  const experimental = sources.some((s) => s.experimental);

  return (
    <GlassCard className="flex flex-col gap-2 h-80">
      <div className="flex items-center justify-between shrink-0">
        <h3 className="section-label">{title}</h3>
        <div className="flex items-center gap-1.5">
          {experimental && <span className="text-[10px] text-gold">experimentell</span>}
          <span className={clsx("h-1.5 w-1.5 rounded-full", connected ? "bg-green" : "bg-text-faint")} />
        </div>
      </div>

      {items.length === 0 ? (
        <p className="text-text-faint text-xs">{sources.find((s) => s.message)?.message ?? "Keine Daten."}</p>
      ) : (
        <ul className="flex flex-col gap-1.5 overflow-y-auto min-h-0">
          {items.map((item) => (
            <li key={item.id}>
              <button
                onClick={() => onSelect(item)}
                className={clsx(
                  "w-full text-left text-xs rounded-lg px-2 py-1.5 transition-colors",
                  selectedId === item.id ? "bg-cyan/10 text-text border border-cyan/30" : "text-text-muted hover:bg-bg2",
                )}
              >
                <div className="truncate">{item.title ?? item.topic}</div>
                {item.metricType && item.metricValue != null && (
                  <div className="text-text-faint text-[11px]">
                    {item.metricType}: {item.metricValue}
                  </div>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </GlassCard>
  );
}
