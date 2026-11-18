import { useState } from "react";
import { createPortal } from "react-dom";
import { X, Copy, Check } from "lucide-react";
import type { ScriptDraft } from "../../lib/newsApi";

/** Abschnitt 11: "News-Kanal-Brücke". GlassCard-Vorfahren setzen backdrop-
 * filter, das für position:fixed einen eigenen Containing Block erzeugt –
 * ohne Portal bliebe das Modal in der News-Seiten-Karte eingesperrt (siehe
 * derselbe Fix am Morgen-Briefing-Modal). */
export function ScriptForTodayModal({ draft, onClose }: { draft: ScriptDraft; onClose: () => void }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(draft.script);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Zwischenablage evtl. ohne Berechtigung – kein kritischer Pfad.
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/60 p-6">
      <div className="glass-card w-full max-w-2xl max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-line shrink-0">
          <div>
            <h2 className="font-heading text-lg">Skript für heute – {draft.topic}</h2>
            <p className="text-text-faint text-xs">{draft.title}</p>
          </div>
          <button onClick={onClose} className="text-text-faint hover:text-cyan" aria-label="Schließen">
            <X size={18} />
          </button>
        </div>

        <div className="overflow-y-auto px-5 py-4 flex flex-col gap-3">
          <p className="text-sm text-text whitespace-pre-wrap leading-relaxed">{draft.script}</p>
          {draft.vaultPath && <p className="text-text-faint text-xs">Gespeichert unter: {draft.vaultPath}</p>}
        </div>

        <div className="px-5 py-3 border-t border-line shrink-0">
          <button
            onClick={copy}
            className="flex items-center gap-1.5 rounded-lg border border-cyan/30 px-3 py-1.5 text-xs text-cyan hover:bg-cyan/10"
          >
            {copied ? <Check size={13} /> : <Copy size={13} />}
            {copied ? "Kopiert" : "In Zwischenablage kopieren"}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
