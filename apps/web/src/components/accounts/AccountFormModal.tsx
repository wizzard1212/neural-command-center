import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { X } from "lucide-react";
import {
  createAccount,
  updateAccount,
  fetchAccountTemplates,
  type Account,
  type AccountPhase,
  type DailyLossMode,
  type MaxLossMode,
} from "../../lib/accountsApi";

type FormState = Omit<Account, "id" | "createdAt" | "updatedAt">;

const EMPTY_FORM: FormState = {
  firm: "",
  program: "",
  size: 100_000,
  phase: "challenge_1",
  platform: "MT5",
  loginNo: "",
  server: "",
  purchasePrice: null,
  purchaseDate: null,
  startBalance: 100_000,
  profitTargetPct: 10,
  dailyLossPct: 5,
  dailyLossMode: "higher_of_balance_equity",
  maxLossPct: 10,
  maxLossMode: "static",
  minTradingDays: null,
  minProfitableDays: null,
  consistencyPct: null,
  newsRuleMinutes: null,
  weekendAllowed: true,
  inactivityDays: 30,
  profitSplitPct: 80,
  payoutCap: null,
  payoutIntervalDays: 14,
  copyGroup: "",
  notes: "",
};

const PHASE_LABELS: Record<AccountPhase, string> = {
  challenge_1: "Challenge Phase 1",
  challenge_2: "Challenge Phase 2",
  funded: "Funded",
  lost: "Verloren",
  paused: "Pausiert",
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-xs text-text-muted">
      {label}
      {children}
    </label>
  );
}

const inputClass =
  "bg-bg2 border border-line rounded-lg px-2.5 py-1.5 text-sm text-text focus:outline-none focus:border-cyan/50";

export function AccountFormModal({
  open,
  onClose,
  initial,
}: {
  open: boolean;
  onClose: () => void;
  initial?: Account | null;
}) {
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [templateApplied, setTemplateApplied] = useState(false);
  const queryClient = useQueryClient();

  const { data: templates } = useQuery({ queryKey: ["accounts", "templates"], queryFn: fetchAccountTemplates });

  useEffect(() => {
    if (initial) {
      const { id, createdAt, updatedAt, ...rest } = initial;
      setForm(rest);
      setTemplateApplied(false);
    } else {
      setForm(EMPTY_FORM);
      setTemplateApplied(false);
    }
  }, [initial, open]);

  const mutation = useMutation({
    mutationFn: () => (initial ? updateAccount(initial.id, form) : createAccount(form)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      onClose();
    },
  });

  if (!open) return null;

  function applyTemplate(key: string) {
    const t = templates?.find((t) => t.key === key);
    if (!t) return;
    setForm((f) => ({ ...f, firm: t.firm, program: t.program, ...t.defaults }));
    setTemplateApplied(true);
  }

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  const profitTargetUsd =
    form.profitTargetPct && form.startBalance ? (form.startBalance * form.profitTargetPct) / 100 : null;

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/60 p-6">
      <div className="glass-card w-full max-w-3xl max-h-[88vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-line shrink-0">
          <h2 className="font-heading text-lg">{initial ? "Konto bearbeiten" : "Konto anlegen"}</h2>
          <button onClick={onClose} className="text-text-faint hover:text-cyan" aria-label="Schließen">
            <X size={18} />
          </button>
        </div>

        <div className="overflow-y-auto px-5 py-4 flex flex-col gap-5">
          {!initial && (
            <Field label="Vorlage wählen (optional, alle Werte bleiben editierbar)">
              <select className={inputClass} onChange={(e) => e.target.value && applyTemplate(e.target.value)} defaultValue="">
                <option value="">— eigene Werte eingeben —</option>
                {templates?.map((t) => (
                  <option key={t.key} value={t.key}>
                    {t.label}
                  </option>
                ))}
              </select>
            </Field>
          )}

          {templateApplied && (
            <p className="text-xs text-gold bg-gold/10 border border-gold/30 rounded-lg px-3 py-2">
              Werte aus Vorlage übernommen – bitte mit den aktuellen Regeln der Firma abgleichen, bevor du das
              Konto kaufst oder handelst.
            </p>
          )}

          <section className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <Field label="Firma">
              <input className={inputClass} value={form.firm} onChange={(e) => set("firm", e.target.value)} />
            </Field>
            <Field label="Programm">
              <input className={inputClass} value={form.program} onChange={(e) => set("program", e.target.value)} />
            </Field>
            <Field label="Phase">
              <select className={inputClass} value={form.phase} onChange={(e) => set("phase", e.target.value as AccountPhase)}>
                {Object.entries(PHASE_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Kontogröße ($)">
              <input
                type="number"
                className={inputClass}
                value={form.size}
                onChange={(e) => set("size", Number(e.target.value))}
              />
            </Field>
            <Field label="Startbalance ($)">
              <input
                type="number"
                className={inputClass}
                value={form.startBalance}
                onChange={(e) => set("startBalance", Number(e.target.value))}
              />
            </Field>
            <Field label="Copy-Gruppe">
              <input className={inputClass} value={form.copyGroup ?? ""} onChange={(e) => set("copyGroup", e.target.value)} />
            </Field>
            <Field label="Plattform">
              <input className={inputClass} value={form.platform} onChange={(e) => set("platform", e.target.value)} />
            </Field>
            <Field label="Login-Nr.">
              <input className={inputClass} value={form.loginNo ?? ""} onChange={(e) => set("loginNo", e.target.value)} />
            </Field>
            <Field label="Server (kein Passwort!)">
              <input className={inputClass} value={form.server ?? ""} onChange={(e) => set("server", e.target.value)} />
            </Field>
            <Field label="Kaufpreis ($)">
              <input
                type="number"
                className={inputClass}
                value={form.purchasePrice ?? ""}
                onChange={(e) => set("purchasePrice", e.target.value ? Number(e.target.value) : null)}
              />
            </Field>
            <Field label="Kaufdatum">
              <input
                type="date"
                className={inputClass}
                value={form.purchaseDate ?? ""}
                onChange={(e) => set("purchaseDate", e.target.value || null)}
              />
            </Field>
          </section>

          <section>
            <h3 className="section-label mb-2">Risiko-Regeln</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <Field label="Profitziel Phase (%)">
                <input
                  type="number"
                  className={inputClass}
                  value={form.profitTargetPct ?? ""}
                  onChange={(e) => set("profitTargetPct", e.target.value ? Number(e.target.value) : null)}
                />
              </Field>
              <div className="flex flex-col gap-1 text-xs text-text-muted justify-end pb-1.5">
                {profitTargetUsd !== null ? `≈ ${profitTargetUsd.toLocaleString("de-DE")} $` : "—"}
              </div>
              <div />
              <Field label="Tagesverlust-Limit (%)">
                <input
                  type="number"
                  className={inputClass}
                  value={form.dailyLossPct}
                  onChange={(e) => set("dailyLossPct", Number(e.target.value))}
                />
              </Field>
              <Field label="Berechnungsart Tagesverlust">
                <select
                  className={inputClass}
                  value={form.dailyLossMode}
                  onChange={(e) => set("dailyLossMode", e.target.value as DailyLossMode)}
                >
                  <option value="balance">Balance</option>
                  <option value="equity">Equity</option>
                  <option value="higher_of_balance_equity">Höherer Wert aus Balance/Equity</option>
                </select>
              </Field>
              <div />
              <Field label="Max-Verlust (%)">
                <input
                  type="number"
                  className={inputClass}
                  value={form.maxLossPct}
                  onChange={(e) => set("maxLossPct", Number(e.target.value))}
                />
              </Field>
              <Field label="Art Max-Verlust">
                <select
                  className={inputClass}
                  value={form.maxLossMode}
                  onChange={(e) => set("maxLossMode", e.target.value as MaxLossMode)}
                >
                  <option value="static">Statisch</option>
                  <option value="trailing">Trailing</option>
                </select>
              </Field>
              <div />
              <Field label="Mindest-Handelstage">
                <input
                  type="number"
                  className={inputClass}
                  value={form.minTradingDays ?? ""}
                  onChange={(e) => set("minTradingDays", e.target.value ? Number(e.target.value) : null)}
                />
              </Field>
              <Field label="Mind. profitable Tage">
                <input
                  type="number"
                  className={inputClass}
                  value={form.minProfitableDays ?? ""}
                  onChange={(e) => set("minProfitableDays", e.target.value ? Number(e.target.value) : null)}
                />
              </Field>
              <Field label="Konsistenzregel (max. %/Tag)">
                <input
                  type="number"
                  className={inputClass}
                  value={form.consistencyPct ?? ""}
                  onChange={(e) => set("consistencyPct", e.target.value ? Number(e.target.value) : null)}
                />
              </Field>
              <Field label="News-Regel (Minuten gesperrt)">
                <input
                  type="number"
                  className={inputClass}
                  value={form.newsRuleMinutes ?? ""}
                  onChange={(e) => set("newsRuleMinutes", e.target.value ? Number(e.target.value) : null)}
                />
              </Field>
              <Field label="Inaktivitätsfrist (Tage)">
                <input
                  type="number"
                  className={inputClass}
                  value={form.inactivityDays ?? ""}
                  onChange={(e) => set("inactivityDays", e.target.value ? Number(e.target.value) : null)}
                />
              </Field>
              <label className="flex items-center gap-2 text-sm text-text pt-5">
                <input
                  type="checkbox"
                  checked={form.weekendAllowed}
                  onChange={(e) => set("weekendAllowed", e.target.checked)}
                  className="h-4 w-4 accent-cyan"
                />
                Wochenend-Halten erlaubt
              </label>
            </div>
          </section>

          <section>
            <h3 className="section-label mb-2">Ziele & Auszahlung</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <Field label="Profit-Split (%)">
                <input
                  type="number"
                  className={inputClass}
                  value={form.profitSplitPct ?? ""}
                  onChange={(e) => set("profitSplitPct", e.target.value ? Number(e.target.value) : null)}
                />
              </Field>
              <Field label="Auszahlungs-Deckel ($)">
                <input
                  type="number"
                  className={inputClass}
                  value={form.payoutCap ?? ""}
                  onChange={(e) => set("payoutCap", e.target.value ? Number(e.target.value) : null)}
                />
              </Field>
              <Field label="Auszahlungs-Rhythmus (Tage)">
                <input
                  type="number"
                  className={inputClass}
                  value={form.payoutIntervalDays ?? ""}
                  onChange={(e) => set("payoutIntervalDays", e.target.value ? Number(e.target.value) : null)}
                />
              </Field>
            </div>
          </section>

          <Field label="Notizen">
            <textarea
              className={inputClass + " min-h-20"}
              value={form.notes ?? ""}
              onChange={(e) => set("notes", e.target.value)}
            />
          </Field>

          {mutation.isError && (
            <p className="text-xs text-red">Speichern fehlgeschlagen: {(mutation.error as Error).message}</p>
          )}
        </div>

        <div className="flex justify-end gap-2 px-5 py-4 border-t border-line shrink-0">
          <button onClick={onClose} className="rounded-lg border border-line px-4 py-2 text-sm text-text-muted">
            Abbrechen
          </button>
          <button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending || !form.firm || !form.program}
            className="rounded-lg bg-gradient-to-r from-cyan to-ice px-4 py-2 text-sm text-bg0 font-medium disabled:opacity-50"
          >
            {mutation.isPending ? "Speichert…" : "Speichern"}
          </button>
        </div>
      </div>
    </div>
  );
}
