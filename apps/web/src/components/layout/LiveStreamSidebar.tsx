import clsx from "clsx";
import { PanelRightClose, PanelRightOpen, FileEdit, Newspaper, LineChart, Landmark, Sunrise } from "lucide-react";
import { useAppStore } from "../../store/useAppStore";
import { useLiveStreamStore, type LiveStreamKind } from "../../store/useLiveStreamStore";

const KIND_ICON: Record<LiveStreamKind, typeof FileEdit> = {
  vault: FileEdit,
  news: Newspaper,
  trade: LineChart,
  account: Landmark,
  briefing: Sunrise,
};

const KIND_COLOR: Record<LiveStreamKind, string> = {
  vault: "text-green",
  news: "text-cyan",
  trade: "text-violet-light",
  account: "text-red",
  briefing: "text-gold",
};

function timeAgo(ts: number): string {
  const seconds = Math.max(0, Math.round((Date.now() - ts) / 1000));
  if (seconds < 5) return "gerade eben";
  if (seconds < 60) return `vor ${seconds}s`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `vor ${minutes}min`;
  return `vor ${Math.round(minutes / 60)}h`;
}

export function LiveStreamSidebar() {
  const open = useAppStore((s) => s.liveStreamOpen);
  const toggle = useAppStore((s) => s.toggleLiveStream);
  const entries = useLiveStreamStore((s) => s.entries);

  return (
    <aside
      className={clsx(
        "border-l border-line bg-bg1 shrink-0 transition-[width] duration-200 overflow-hidden",
        open ? "w-80" : "w-10",
      )}
    >
      <div className="flex items-center justify-between px-3 py-3 border-b border-line">
        {open && <span className="section-label">Live-Strom</span>}
        <button
          onClick={toggle}
          className="text-text-faint hover:text-cyan ml-auto"
          aria-label="Live-Strom ein-/ausklappen"
        >
          {open ? <PanelRightClose size={16} /> : <PanelRightOpen size={16} />}
        </button>
      </div>
      {open && (
        <div className="overflow-y-auto h-[calc(100%-49px)]">
          {entries.length === 0 ? (
            <div className="p-4 text-sm text-text-faint">
              Noch keine Ereignisse. Neue News, Trades, Kontowarnungen und Vault-Änderungen erscheinen hier
              live.
            </div>
          ) : (
            <ul className="divide-y divide-line">
              {entries.map((entry) => {
                const Icon = KIND_ICON[entry.kind];
                return (
                  <li key={entry.id} className="flex items-start gap-2 px-3 py-2.5 text-xs">
                    <Icon size={14} className={clsx("mt-0.5 shrink-0", KIND_COLOR[entry.kind])} />
                    <div className="min-w-0">
                      <div className="text-text truncate">{entry.label}</div>
                      <div className="text-text-faint truncate">
                        {entry.detail ? `${entry.detail} · ` : ""}
                        {timeAgo(entry.ts)}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </aside>
  );
}
