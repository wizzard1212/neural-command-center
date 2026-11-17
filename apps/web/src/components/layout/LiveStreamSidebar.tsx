import clsx from "clsx";
import { PanelRightClose, PanelRightOpen, FilePlus, FileEdit, FileX } from "lucide-react";
import { useAppStore } from "../../store/useAppStore";
import { useVaultStore } from "../../store/useVaultStore";

const KIND_ICON = {
  created: FilePlus,
  modified: FileEdit,
  deleted: FileX,
} as const;

const KIND_LABEL: Record<string, string> = {
  created: "Neue Notiz",
  modified: "Geändert",
  deleted: "Gelöscht",
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
  const events = useVaultStore((s) => s.recentEvents);

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
          {events.length === 0 ? (
            <div className="p-4 text-sm text-text-faint">
              Noch keine Ereignisse. Ändere eine Notiz in Obsidian – sie erscheint hier und leuchtet im
              Gehirn auf.
            </div>
          ) : (
            <ul className="divide-y divide-line">
              {events.map((event, i) => {
                const Icon = KIND_ICON[event.kind];
                return (
                  <li key={`${event.path}-${event.ts}-${i}`} className="flex items-start gap-2 px-3 py-2.5 text-xs">
                    <Icon size={14} className="mt-0.5 text-green shrink-0" />
                    <div className="min-w-0">
                      <div className="text-text truncate">{event.path.split("/").pop()}</div>
                      <div className="text-text-faint">
                        {KIND_LABEL[event.kind]} · {timeAgo(event.ts)}
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
