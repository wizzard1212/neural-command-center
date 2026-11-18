import { DEFAULT_WATCHLIST } from "@ncc/shared";
import { CATEGORY_COLORS } from "./categoryColors";
import type { FeedSource } from "../../lib/newsApi";

export interface NewsFilterState {
  asset: string;
  category: string;
  minRelevance: number;
  source: string;
  from: string;
}

export const EMPTY_NEWS_FILTERS: NewsFilterState = { asset: "", category: "", minRelevance: 0, source: "", from: "" };

const selectClass = "w-full bg-bg2 border border-line rounded-lg px-2.5 py-1.5 text-sm text-text";

export function NewsFiltersPanel({
  filters,
  onChange,
  sources,
}: {
  filters: NewsFilterState;
  onChange: (next: NewsFilterState) => void;
  sources: FeedSource[];
}) {
  const set = <K extends keyof NewsFilterState>(key: K, value: NewsFilterState[K]) => onChange({ ...filters, [key]: value });

  return (
    <div className="flex flex-col gap-4">
      <div>
        <label className="section-label mb-1.5 block">Asset</label>
        <select className={selectClass} value={filters.asset} onChange={(e) => set("asset", e.target.value)}>
          <option value="">Alle</option>
          {DEFAULT_WATCHLIST.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="section-label mb-1.5 block">Kategorie</label>
        <select className={selectClass} value={filters.category} onChange={(e) => set("category", e.target.value)}>
          <option value="">Alle</option>
          {Object.keys(CATEGORY_COLORS).map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="section-label mb-1.5 block">Min. Relevanz</label>
        <select
          className={selectClass}
          value={filters.minRelevance}
          onChange={(e) => set("minRelevance", Number(e.target.value))}
        >
          <option value={0}>Alle</option>
          {[1, 2, 3, 4, 5].map((r) => (
            <option key={r} value={r}>
              ≥ {r}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="section-label mb-1.5 block">Quelle</label>
        <select className={selectClass} value={filters.source} onChange={(e) => set("source", e.target.value)}>
          <option value="">Alle</option>
          {sources.map((s) => (
            <option key={s.id} value={s.name}>
              {s.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="section-label mb-1.5 block">Zeitraum ab</label>
        <input
          type="datetime-local"
          className={selectClass}
          value={filters.from}
          onChange={(e) => set("from", e.target.value)}
        />
      </div>

      {JSON.stringify(filters) !== JSON.stringify(EMPTY_NEWS_FILTERS) && (
        <button onClick={() => onChange(EMPTY_NEWS_FILTERS)} className="text-xs text-cyan self-start">
          Filter zurücksetzen
        </button>
      )}
    </div>
  );
}
