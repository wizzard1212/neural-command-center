import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { marked } from "marked";
import { X, ExternalLink } from "lucide-react";
import { fetchVaultMeta, fetchVaultNote, obsidianDeepLink } from "../../lib/vaultApi";
import { useVaultStore } from "../../store/useVaultStore";

export function NoteDetailPanel() {
  const selectedPath = useVaultStore((s) => s.selectedNotePath);
  const selectNote = useVaultStore((s) => s.selectNote);

  const { data: meta } = useQuery({ queryKey: ["vault", "meta"], queryFn: fetchVaultMeta });
  const { data: note, isLoading } = useQuery({
    queryKey: ["vault", "note", selectedPath],
    queryFn: () => fetchVaultNote(selectedPath as string),
    enabled: Boolean(selectedPath),
  });

  const html = useMemo(() => {
    if (!note) return "";
    // Obsidian-Wikilinks sind kein Standard-Markdown – marked würde sie sonst
    // als rohe "[[...]]"-Klammern durchreichen. Hier nur optisch hervorheben,
    // da die Notiz ohnehin schreibgeschützt ist (Navigation läuft über den
    // "In Obsidian öffnen"-Button).
    const withHighlightedLinks = note.markdown.replace(
      /\[\[([^\]|#]+)(?:#[^\]|]+)?(?:\|([^\]]+))?\]\]/g,
      (_match, target: string, alias?: string) =>
        `<span class="text-cyan">${alias ?? target}</span>`,
    );
    return marked.parse(withHighlightedLinks, { async: false });
  }, [note]);

  if (!selectedPath) return null;

  const deepLink = meta?.vaultName ? obsidianDeepLink(meta.vaultName, selectedPath) : null;

  return (
    <div className="absolute top-0 right-0 bottom-0 w-96 bg-bg1 border-l border-line z-20 flex flex-col shadow-2xl">
      <div className="flex items-center justify-between px-4 py-3 border-b border-line shrink-0">
        <span className="section-label truncate">{selectedPath.split("/").pop()}</span>
        <button onClick={() => selectNote(null)} className="text-text-faint hover:text-cyan" aria-label="Schließen">
          <X size={16} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        {isLoading && <p className="text-text-faint text-sm">Lade Notiz…</p>}
        {note && (
          <div
            className="prose-ncc text-sm text-text [&_h1]:font-heading [&_h1]:text-lg [&_h1]:mb-2 [&_h2]:font-heading [&_h2]:text-base [&_h2]:mt-4 [&_h2]:mb-2 [&_a]:text-cyan [&_li]:ml-4 [&_ul]:list-disc [&_ol]:list-decimal [&_p]:mb-3 [&_code]:text-ice"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        )}
      </div>

      <div className="px-4 py-3 border-t border-line shrink-0">
        {deepLink ? (
          <a
            href={deepLink}
            className="flex items-center justify-center gap-2 rounded-lg border border-cyan/30 px-3 py-2 text-xs text-cyan hover:bg-cyan/10"
          >
            <ExternalLink size={14} /> In Obsidian öffnen
          </a>
        ) : (
          <p className="text-text-faint text-xs text-center">Vault-Name unbekannt (VAULT_PATH prüfen).</p>
        )}
      </div>
    </div>
  );
}
