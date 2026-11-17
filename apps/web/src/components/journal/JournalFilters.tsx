import { EMOTION_TAGS, SETUP_TYPES } from "@ncc/shared";
import type { Account } from "../../lib/accountsApi";

export interface JournalFilterState {
  from: string;
  to: string;
  instrument: string;
  setupType: string;
  session: string;
  accountId: string;
  result: "all" | "win" | "loss";
  emotion: string;
  ruleCompliance: "all" | "ok" | "broken";
}

export const EMPTY_FILTERS: JournalFilterState = {
  from: "",
  to: "",
  instrument: "",
  setupType: "",
  session: "",
  accountId: "",
  result: "all",
  emotion: "",
  ruleCompliance: "all",
};

const selectClass = "bg-bg2 border border-line rounded-lg px-2 py-1.5 text-xs text-text";

export function JournalFilters({
  filters,
  onChange,
  instruments,
  accounts,
}: {
  filters: JournalFilterState;
  onChange: (next: JournalFilterState) => void;
  instruments: string[];
  accounts: Account[];
}) {
  const set = <K extends keyof JournalFilterState>(key: K, value: JournalFilterState[K]) =>
    onChange({ ...filters, [key]: value });

  return (
    <div className="flex flex-wrap items-center gap-2">
      <input type="date" className={selectClass} value={filters.from} onChange={(e) => set("from", e.target.value)} />
      <span className="text-text-faint text-xs">bis</span>
      <input type="date" className={selectClass} value={filters.to} onChange={(e) => set("to", e.target.value)} />

      <select className={selectClass} value={filters.instrument} onChange={(e) => set("instrument", e.target.value)}>
        <option value="">Alle Instrumente</option>
        {instruments.map((i) => (
          <option key={i} value={i}>
            {i}
          </option>
        ))}
      </select>

      <select className={selectClass} value={filters.setupType} onChange={(e) => set("setupType", e.target.value)}>
        <option value="">Alle Setups</option>
        {SETUP_TYPES.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>

      <select className={selectClass} value={filters.session} onChange={(e) => set("session", e.target.value)}>
        <option value="">Alle Sessions</option>
        <option value="asia">Asien</option>
        <option value="london">London</option>
        <option value="new_york">New York</option>
        <option value="overlap">Overlap</option>
      </select>

      <select className={selectClass} value={filters.accountId} onChange={(e) => set("accountId", e.target.value)}>
        <option value="">Alle Konten</option>
        {accounts.map((a) => (
          <option key={a.id} value={a.id}>
            {a.firm} {a.program}
          </option>
        ))}
      </select>

      <select className={selectClass} value={filters.result} onChange={(e) => set("result", e.target.value as JournalFilterState["result"])}>
        <option value="all">Alle Ergebnisse</option>
        <option value="win">Gewinn</option>
        <option value="loss">Verlust</option>
      </select>

      <select className={selectClass} value={filters.emotion} onChange={(e) => set("emotion", e.target.value)}>
        <option value="">Alle Emotionen</option>
        {EMOTION_TAGS.map((e) => (
          <option key={e} value={e}>
            {e}
          </option>
        ))}
      </select>

      <select
        className={selectClass}
        value={filters.ruleCompliance}
        onChange={(e) => set("ruleCompliance", e.target.value as JournalFilterState["ruleCompliance"])}
      >
        <option value="all">Regel egal</option>
        <option value="ok">Regel eingehalten</option>
        <option value="broken">Regelbruch</option>
      </select>

      {JSON.stringify(filters) !== JSON.stringify(EMPTY_FILTERS) && (
        <button onClick={() => onChange(EMPTY_FILTERS)} className="text-xs text-cyan">
          Filter zurücksetzen
        </button>
      )}
    </div>
  );
}
