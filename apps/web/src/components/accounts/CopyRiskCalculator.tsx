import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle } from "lucide-react";
import { GlassCard } from "../ui/GlassCard";
import { fetchCopyRisk, type Account } from "../../lib/accountsApi";

export function CopyRiskCalculator({ accounts }: { accounts: Account[] }) {
  const copyGroups = useMemo(
    () => [...new Set(accounts.map((a) => a.copyGroup).filter((g): g is string => Boolean(g)))],
    [accounts],
  );
  const [group, setGroup] = useState("");
  const [riskPct, setRiskPct] = useState(1);

  // `accounts` lädt asynchron nach – das erste Rendering kennt copyGroups noch
  // nicht. Sobald eine Gruppe verfügbar ist, aber noch keine ausgewählt wurde,
  // automatisch die erste vorauswählen.
  useEffect(() => {
    if (!group && copyGroups.length > 0) setGroup(copyGroups[0]);
  }, [group, copyGroups]);

  const { data } = useQuery({
    queryKey: ["accounts", "copy-risk", group, riskPct],
    queryFn: () => fetchCopyRisk(group, riskPct),
    enabled: Boolean(group),
  });

  const accountsById = useMemo(() => new Map(accounts.map((a) => [a.id, a])), [accounts]);

  if (copyGroups.length === 0) {
    return (
      <GlassCard title="Kopier-Risiko-Rechner">
        <p className="text-text-faint text-sm">
          Noch keine Copy-Gruppe vergeben. Trag bei den Konten eine Copy-Gruppe ein (z. B. „Gruppe A"), um zu
          sehen, wie viel ein Master-Risiko über alle kopierten Konten kostet.
        </p>
      </GlassCard>
    );
  }

  return (
    <GlassCard title="Kopier-Risiko-Rechner">
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <select
          className="bg-bg2 border border-line rounded-lg px-2.5 py-1.5 text-sm text-text"
          value={group}
          onChange={(e) => setGroup(e.target.value)}
        >
          {copyGroups.map((g) => (
            <option key={g} value={g}>
              {g}
            </option>
          ))}
        </select>
        <label className="flex items-center gap-2 text-sm text-text-muted">
          Risiko auf Master
          <input
            type="number"
            step={0.1}
            className="w-20 bg-bg2 border border-line rounded-lg px-2 py-1.5 text-sm text-text"
            value={riskPct}
            onChange={(e) => setRiskPct(Number(e.target.value))}
          />
          %
        </label>
      </div>

      {data && (
        <>
          <ul className="flex flex-col gap-1.5 mb-3">
            {data.perAccount.map((row) => {
              const account = accountsById.get(row.id);
              const isStrictest = row.id === data.strictestAccountId;
              return (
                <li key={row.id} className="flex items-center justify-between text-sm">
                  <span className={isStrictest ? "text-gold" : "text-text"}>
                    {account?.firm} {account?.program}
                    {isStrictest && " (strengstes Konto)"}
                  </span>
                  <span className="font-mono-num">{row.riskUsd.toLocaleString("de-DE")} $</span>
                </li>
              );
            })}
          </ul>
          <div className="flex items-center justify-between font-mono-num text-sm border-t border-line pt-2">
            <span className="text-text-muted">Gesamtrisiko Copy-Gruppe</span>
            <span className="text-text">{data.totalRiskUsd.toLocaleString("de-DE")} $</span>
          </div>
          {data.exceedsStrictest && (
            <div className="mt-3 flex items-start gap-2 rounded-lg border border-red/40 bg-red/10 px-3 py-2 text-xs text-red">
              <AlertTriangle size={14} className="mt-0.5 shrink-0" />
              Das kopierte Risiko überschreitet das Tagesverlust-Limit des strengsten Kontos (
              {data.strictestLimitUsd?.toLocaleString("de-DE")} $). Risiko auf dem Master-Konto reduzieren.
            </div>
          )}
        </>
      )}
    </GlassCard>
  );
}
