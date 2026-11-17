import clsx from "clsx";
import { brainRegions, type AreaKey } from "@ncc/shared";
import { useVaultStore } from "../../store/useVaultStore";

const AREA_LABELS: Record<AreaKey, string> = {
  trading: "Trading",
  firma: "Firma",
  modeln: "Modeln",
  ideen_business: "App-/Business-Ideen",
  clipping: "Clipping & Content",
  fundament: "Fundament",
  ideen_start: "Ideen",
  dashboard_daten: "Dashboard",
};

const ALL_AREAS = Object.keys(brainRegions) as AreaKey[];

export function FilterChips() {
  const visibleAreas = useVaultStore((s) => s.visibleAreas);
  const toggleArea = useVaultStore((s) => s.toggleArea);
  const onlyOpenTodos = useVaultStore((s) => s.onlyOpenTodos);
  const setOnlyOpenTodos = useVaultStore((s) => s.setOnlyOpenTodos);
  const onlyRecentlyChanged = useVaultStore((s) => s.onlyRecentlyChanged);
  const setOnlyRecentlyChanged = useVaultStore((s) => s.setOnlyRecentlyChanged);

  return (
    <div className="flex flex-wrap items-center gap-2 px-1">
      {ALL_AREAS.map((area) => {
        const active = !visibleAreas || visibleAreas.has(area);
        const color = brainRegions[area].color;
        return (
          <button
            key={area}
            onClick={() => toggleArea(area, ALL_AREAS)}
            className={clsx(
              "flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-colors",
              active ? "border-line text-text" : "border-line/40 text-text-faint opacity-50",
            )}
          >
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
            {AREA_LABELS[area]}
          </button>
        );
      })}

      <span className="w-px h-4 bg-line mx-1" />

      <button
        onClick={() => setOnlyOpenTodos(!onlyOpenTodos)}
        className={clsx(
          "rounded-full border px-2.5 py-1 text-xs",
          onlyOpenTodos ? "border-cyan text-cyan" : "border-line text-text-muted",
        )}
      >
        Nur offene To-dos
      </button>

      <button
        onClick={() => setOnlyRecentlyChanged(!onlyRecentlyChanged)}
        className={clsx(
          "rounded-full border px-2.5 py-1 text-xs",
          onlyRecentlyChanged ? "border-cyan text-cyan" : "border-line text-text-muted",
        )}
      >
        Zuletzt geändert (7 Tage)
      </button>
    </div>
  );
}
