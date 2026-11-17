import { NavLink } from "react-router-dom";
import clsx from "clsx";
import {
  Brain,
  Newspaper,
  Radio,
  NotebookPen,
  Landmark,
  CalendarDays,
  BarChart3,
  Settings,
  ChevronRight,
} from "lucide-react";
import { NAV_SECTIONS } from "@ncc/shared";
import { useAppStore } from "../../store/useAppStore";

const ICONS: Record<string, React.ComponentType<{ size?: number }>> = {
  brain: Brain,
  newspaper: Newspaper,
  radio: Radio,
  notebook: NotebookPen,
  bank: Landmark,
  calendar: CalendarDays,
  chart: BarChart3,
  settings: Settings,
};

export function IconRail() {
  const navExpanded = useAppStore((s) => s.navExpanded);
  const toggleNav = useAppStore((s) => s.toggleNav);

  return (
    <nav
      className={clsx(
        "flex flex-col border-r border-line bg-bg1 transition-[width] duration-200 shrink-0",
        navExpanded ? "w-60" : "w-[72px]",
      )}
    >
      <div className="flex flex-col gap-1 py-4 flex-1">
        {NAV_SECTIONS.map((section) => {
          const Icon = ICONS[section.icon] ?? Brain;
          return (
            <NavLink
              key={section.key}
              to={`/${section.key}`}
              className={({ isActive }) =>
                clsx(
                  "flex items-center gap-3 mx-2 px-3 py-2.5 rounded-lg text-sm transition-colors",
                  isActive
                    ? "bg-bg3 text-cyan border border-cyan/20"
                    : "text-text-muted hover:text-text hover:bg-bg2",
                )
              }
            >
              <Icon size={20} />
              {navExpanded && <span className="truncate">{section.label}</span>}
            </NavLink>
          );
        })}
      </div>
      <button
        onClick={toggleNav}
        className="mx-2 mb-3 flex items-center justify-center gap-2 rounded-lg py-2 text-text-faint hover:text-cyan hover:bg-bg2"
        aria-label="Navigation ein-/ausklappen"
      >
        <ChevronRight size={16} className={clsx("transition-transform", navExpanded && "rotate-180")} />
        {navExpanded && <span className="text-xs">Einklappen</span>}
      </button>
    </nav>
  );
}
