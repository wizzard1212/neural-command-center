import { useRef, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Send, Sparkles, Loader2 } from "lucide-react";
import { GlassCard } from "../ui/GlassCard";
import { askBrain } from "../../lib/brainChatApi";
import { fetchStatus } from "../../lib/api";
import { useVaultStore } from "../../store/useVaultStore";

interface ChatEntry {
  id: string;
  question: string;
  answer?: string;
  sources?: { path: string; title: string }[];
  error?: string;
}

const EXAMPLES = [
  "Was waren meine häufigsten Regelbrüche diesen Monat?",
  "Was steht in meinem Prop-Firm-Plan zu Konsistenz?",
  "Wie steht es um meine Konten gerade?",
];

/** Abschnitt 11: "'Frag dein Gehirn': Chat-Feld auf der Zentrale. Claude
 * bekommt relevante Vault-Notizen + Dashboard-Daten als Kontext." Verlauf
 * ist bewusst nur Session-State (keine Persistenz nötig laut Spec). */
export function BrainChat() {
  const [entries, setEntries] = useState<ChatEntry[]>([]);
  const [input, setInput] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const selectNote = useVaultStore((s) => s.selectNote);

  const { data: status } = useQuery({ queryKey: ["status"], queryFn: fetchStatus });
  const kiAvailable = status?.connections.find((c) => c.source === "ki")?.status === "connected";

  const mutation = useMutation({
    mutationFn: (question: string) => askBrain(question),
  });

  const ask = (question: string) => {
    const id = crypto.randomUUID();
    setEntries((e) => [...e, { id, question }]);
    setInput("");
    mutation.mutate(question, {
      onSuccess: (res) => {
        setEntries((e) => e.map((entry) => (entry.id === id ? { ...entry, answer: res.answer, sources: res.sources } : entry)));
      },
      onError: (err) => {
        setEntries((e) => e.map((entry) => (entry.id === id ? { ...entry, error: (err as Error).message } : entry)));
      },
    });
  };

  const handleSubmit = () => {
    const question = input.trim();
    if (!question || mutation.isPending) return;
    ask(question);
  };

  return (
    <GlassCard title="Frag dein Gehirn" className="flex flex-col gap-3">
      {entries.length === 0 ? (
        <div className="flex flex-col gap-2">
          <p className="text-text-faint text-sm">
            Stell eine Frage zu deinem Vault oder deinem Dashboard – Claude liest relevante Notizen und
            Konten-/Journal-Daten dazu.
          </p>
          <div className="flex flex-wrap gap-2">
            {EXAMPLES.map((ex) => (
              <button
                key={ex}
                onClick={() => ask(ex)}
                disabled={!kiAvailable}
                className="text-xs rounded-full border border-line px-3 py-1.5 text-text-muted hover:border-cyan/30 hover:text-cyan disabled:opacity-40"
              >
                {ex}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-4 max-h-80 overflow-y-auto pr-1">
          {entries.map((entry) => (
            <div key={entry.id} className="flex flex-col gap-1.5">
              <p className="text-sm text-text font-medium">{entry.question}</p>
              {entry.error ? (
                <p className="text-xs text-red">{entry.error}</p>
              ) : entry.answer !== undefined ? (
                <>
                  <p className="text-sm text-text-muted whitespace-pre-wrap">{entry.answer}</p>
                  {entry.sources && entry.sources.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-0.5">
                      {entry.sources.map((s) => (
                        <button
                          key={s.path}
                          onClick={() => selectNote(s.path)}
                          className="text-[11px] rounded-full border border-line px-2 py-0.5 text-text-faint hover:text-cyan hover:border-cyan/30"
                        >
                          {s.title}
                        </button>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <p className="text-xs text-text-faint flex items-center gap-1.5">
                  <Loader2 size={12} className="animate-spin" /> Denkt nach…
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center gap-2 pt-1 border-t border-line">
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          disabled={!kiAvailable}
          placeholder={kiAvailable ? "Frag dein Gehirn…" : "ANTHROPIC_API_KEY fehlt in .env."}
          className="flex-1 bg-bg2 border border-line rounded-lg px-3 py-2 text-sm text-text focus:outline-none focus:border-cyan/50 disabled:opacity-50"
        />
        <button
          onClick={handleSubmit}
          disabled={!kiAvailable || !input.trim() || mutation.isPending}
          className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-cyan to-ice px-3 py-2 text-xs text-bg0 font-medium disabled:opacity-40"
        >
          {mutation.isPending ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
        </button>
      </div>
      {!kiAvailable && (
        <p className="text-text-faint text-xs flex items-center gap-1"><Sparkles size={11} /> Ohne Key zeigt das Dashboard weiterhin alle anderen Daten normal an.</p>
      )}
    </GlassCard>
  );
}
