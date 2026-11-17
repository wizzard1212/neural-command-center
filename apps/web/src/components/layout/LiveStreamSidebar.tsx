import clsx from "clsx";
import { PanelRightClose, PanelRightOpen } from "lucide-react";
import { useAppStore } from "../../store/useAppStore";

export function LiveStreamSidebar() {
  const open = useAppStore((s) => s.liveStreamOpen);
  const toggle = useAppStore((s) => s.toggleLiveStream);

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
        <div className="p-4 text-sm text-text-faint">
          Noch keine Ereignisse. Der Live-Strom füllt sich ab Phase 2 (Vault-Events) und den folgenden Phasen
          mit News, Trades und Regelwarnungen.
        </div>
      )}
    </aside>
  );
}
