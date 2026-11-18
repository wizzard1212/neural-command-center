import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  Search,
  Brain,
  Newspaper,
  Radio,
  NotebookPen,
  Landmark,
  CalendarDays,
  BarChart3,
  Settings,
  Plus,
  RefreshCw,
  FileText,
} from "lucide-react";
import { NAV_SECTIONS } from "@ncc/shared";
import { fetchVaultGraph } from "../../lib/vaultApi";
import { generateBriefing } from "../../lib/briefingApi";
import { useAppStore } from "../../store/useAppStore";
import { useVaultStore } from "../../store/useVaultStore";

const NAV_ICONS: Record<string, React.ComponentType<{ size?: number }>> = {
  brain: Brain,
  newspaper: Newspaper,
  radio: Radio,
  notebook: NotebookPen,
  bank: Landmark,
  calendar: CalendarDays,
  chart: BarChart3,
  settings: Settings,
};

interface PaletteItem {
  id: string;
  label: string;
  sublabel?: string;
  icon: React.ComponentType<{ size?: number }>;
  run: () => void;
}

/** Abschnitt 11: "Command-Palette Strg+K: Notiz suchen, Trade anlegen,
 * Briefing neu erstellen, zu Leiste springen." Einmal in AppShell gemountet,
 * global per Tastenkürzel erreichbar. */
export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const requestQuickTrade = useAppStore((s) => s.requestQuickTrade);
  const selectNote = useVaultStore((s) => s.selectNote);

  const { data: graph } = useQuery({ queryKey: ["vault", "graph"], queryFn: fetchVaultGraph, enabled: open });
  const generateBriefingMutation = useMutation({ mutationFn: generateBriefing });

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      } else if (e.key === "Escape" && open) {
        setOpen(false);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  useEffect(() => {
    if (open) {
      setQuery("");
      setActiveIndex(0);
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  const items = useMemo<PaletteItem[]>(() => {
    const actions: PaletteItem[] = [
      {
        id: "quick-trade",
        label: "Trade anlegen",
        icon: Plus,
        run: () => {
          requestQuickTrade();
          navigate("/journal");
        },
      },
      {
        id: "briefing-regen",
        label: "Briefing neu erstellen",
        icon: RefreshCw,
        run: () => {
          generateBriefingMutation.mutate();
          navigate("/zentrale");
        },
      },
      ...NAV_SECTIONS.map((section) => ({
        id: `nav-${section.key}`,
        label: `Zu ${section.label} springen`,
        icon: NAV_ICONS[section.icon] ?? Brain,
        run: () => navigate(`/${section.key}`),
      })),
    ];

    const q = query.trim().toLowerCase();
    const matchedActions = q ? actions.filter((a) => a.label.toLowerCase().includes(q)) : actions;

    const noteMatches: PaletteItem[] = q
      ? (graph?.nodes ?? [])
          .filter((n) => n.title.toLowerCase().includes(q))
          .slice(0, 6)
          .map((n) => ({
            id: `note-${n.path}`,
            label: n.title,
            sublabel: n.path,
            icon: FileText,
            run: () => {
              selectNote(n.path);
              navigate("/zentrale");
            },
          }))
      : [];

    return [...noteMatches, ...matchedActions];
  }, [query, graph, navigate, requestQuickTrade, generateBriefingMutation, selectNote]);

  useEffect(() => setActiveIndex(0), [query]);

  if (!open) return null;

  const execute = (item: PaletteItem) => {
    item.run();
    setOpen(false);
  };

  return createPortal(
    <div
      className="fixed inset-0 z-40 flex items-start justify-center bg-black/60 pt-[12vh]"
      onClick={() => setOpen(false)}
    >
      <div
        className="glass-card w-full max-w-lg flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2.5 px-4 py-3 border-b border-line">
          <Search size={16} className="text-text-faint shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setActiveIndex((i) => Math.min(i + 1, items.length - 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setActiveIndex((i) => Math.max(i - 1, 0));
              } else if (e.key === "Enter" && items[activeIndex]) {
                execute(items[activeIndex]);
              }
            }}
            placeholder="Notiz suchen, Trade anlegen, Briefing neu erstellen…"
            className="flex-1 bg-transparent text-sm text-text focus:outline-none placeholder:text-text-faint"
          />
          <kbd className="text-[10px] text-text-faint border border-line rounded px-1.5 py-0.5">Esc</kbd>
        </div>

        <div className="max-h-80 overflow-y-auto py-1.5">
          {items.length === 0 ? (
            <p className="text-text-faint text-sm px-4 py-3">Keine Treffer.</p>
          ) : (
            items.map((item, i) => (
              <button
                key={item.id}
                onClick={() => execute(item)}
                onMouseEnter={() => setActiveIndex(i)}
                className={`flex w-full items-center gap-3 px-4 py-2 text-left text-sm ${
                  i === activeIndex ? "bg-cyan/10 text-text" : "text-text-muted"
                }`}
              >
                <item.icon size={15} />
                <span className="flex-1 truncate">{item.label}</span>
                {item.sublabel && <span className="text-text-faint text-xs truncate max-w-[40%]">{item.sublabel}</span>}
              </button>
            ))
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
