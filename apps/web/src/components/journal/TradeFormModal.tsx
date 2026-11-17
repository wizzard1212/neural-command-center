import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { X, Sparkles } from "lucide-react";
import clsx from "clsx";
import {
  SETUP_TYPES,
  EMOTION_TAGS,
  resolveInstrumentSpec,
  riskUsd as calcRiskUsd,
  riskPct as calcRiskPct,
  weightedRR,
  resultUsdFromExits,
  recommendedSize,
  type TradeDirection,
  type TpAllocation,
} from "@ncc/shared";
import {
  createTrade,
  updateTrade,
  uploadTradeImage,
  deleteTradeImage,
  analyzeScreenshot,
  type Trade,
  type TradeImage,
  type ChartExtraction,
} from "../../lib/journalApi";
import { fetchAccounts } from "../../lib/accountsApi";
import { fetchStatus } from "../../lib/api";
import { ScreenshotUploader, type StagedImage } from "./ScreenshotUploader";

// <input type="datetime-local"> erwartet und zeigt lokale Zeit – mit
// toISOString() (UTC) würde die angezeigte/bearbeitete Uhrzeit bei jedem Save
// um die Zeitzonen-Differenz verrutschen (in Berlin z. B. 1-2h pro Bearbeitung).
function toLocalDatetimeValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

type FormState = {
  accountId: number | null;
  instrument: string;
  direction: TradeDirection;
  openedAt: string;
  session: "asia" | "london" | "new_york" | "overlap" | null;
  entry: string;
  sl: string;
  tp1: string;
  tp2: string;
  tp3: string;
  tpSplit: [number, number, number];
  size: string;
  setupTypes: string[];
  timeframeHtf: string;
  timeframeEntry: string;
  reasoning: string;
  emotionScore: number;
  emotionTags: string[];
  ruleChecks: Record<string, boolean>;
  status: Trade["status"];
  followedPlan: boolean | null;
  lesson: string;
  exitPrice: string;
  resultUsd: string;
};

function emptyForm(): FormState {
  return {
    accountId: null,
    instrument: "",
    direction: "long",
    openedAt: toLocalDatetimeValue(new Date()),
    session: sessionFromTime(toLocalDatetimeValue(new Date())),
    entry: "",
    sl: "",
    tp1: "",
    tp2: "",
    tp3: "",
    tpSplit: [100, 0, 0],
    size: "",
    setupTypes: [],
    timeframeHtf: "",
    timeframeEntry: "",
    reasoning: "",
    emotionScore: 5,
    emotionTags: [],
    ruleChecks: { "SL gesetzt": false, "Kein News-Fenster": false, "HTF-Bias passt": false },
    status: "planned",
    followedPlan: null,
    lesson: "",
    exitPrice: "",
    resultUsd: "",
  };
}

function sessionFromTime(isoLocal: string): FormState["session"] {
  const hourUtc = new Date(isoLocal).getUTCHours();
  const inWindow = (open: number, close: number) => (open <= close ? hourUtc >= open && hourUtc < close : hourUtc >= open || hourUtc < close);
  const london = inWindow(8, 17);
  const ny = inWindow(13, 22);
  if (london && ny) return "overlap";
  if (london) return "london";
  if (ny) return "new_york";
  if (inWindow(0, 9)) return "asia";
  return null;
}

const num = (s: string): number | null => (s.trim() === "" ? null : Number(s));

const inputClass =
  "bg-bg2 border border-line rounded-lg px-2.5 py-1.5 text-sm text-text focus:outline-none focus:border-cyan/50";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-xs text-text-muted">
      {label}
      {children}
    </label>
  );
}

export function TradeFormModal({
  open,
  onClose,
  initial,
  initialImages,
}: {
  open: boolean;
  onClose: () => void;
  initial?: Trade | null;
  initialImages?: TradeImage[];
}) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<FormState>(emptyForm());
  const [staged, setStaged] = useState<StagedImage[]>([]);
  const [savedImages, setSavedImages] = useState<TradeImage[]>([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [aiNote, setAiNote] = useState<string | null>(null);
  const [customSetupType, setCustomSetupType] = useState("");

  const { data: accounts } = useQuery({ queryKey: ["accounts"], queryFn: fetchAccounts });
  const { data: status } = useQuery({ queryKey: ["status"], queryFn: fetchStatus });
  const kiAvailable = status?.connections.find((c) => c.source === "ki")?.status === "connected";

  useEffect(() => {
    if (!open) return;
    if (initial) {
      setForm({
        accountId: initial.accountId,
        instrument: initial.instrument,
        direction: initial.direction,
        openedAt: toLocalDatetimeValue(initial.openedAt ? new Date(initial.openedAt) : new Date()),
        session: initial.session,
        entry: initial.entry?.toString() ?? "",
        sl: initial.sl?.toString() ?? "",
        tp1: initial.tp1?.toString() ?? "",
        tp2: initial.tp2?.toString() ?? "",
        tp3: initial.tp3?.toString() ?? "",
        tpSplit: (initial.tpSplitJson as [number, number, number]) ?? [100, 0, 0],
        size: initial.size?.toString() ?? "",
        setupTypes: initial.setupTypesJson ?? [],
        timeframeHtf: initial.timeframesJson?.htf ?? "",
        timeframeEntry: initial.timeframesJson?.entry ?? "",
        reasoning: initial.reasoning ?? "",
        emotionScore: initial.emotionScore ?? 5,
        emotionTags: initial.emotionTagsJson ?? [],
        ruleChecks: initial.ruleChecksJson ?? { "SL gesetzt": false, "Kein News-Fenster": false, "HTF-Bias passt": false },
        status: initial.status,
        followedPlan: initial.followedPlan,
        lesson: initial.lesson ?? "",
        exitPrice: initial.exitPricesJson?.[0]?.price.toString() ?? "",
        resultUsd: initial.resultUsd?.toString() ?? "",
      });
      setSavedImages(initialImages ?? []);
    } else {
      setForm(emptyForm());
      setSavedImages([]);
    }
    setStaged([]);
    setAiNote(null);
  }, [initial, initialImages, open]);

  const selectedAccount = useMemo(
    () => accounts?.find((a) => a.account.id === form.accountId)?.account ?? null,
    [accounts, form.accountId],
  );

  const spec = useMemo(() => resolveInstrumentSpec(form.instrument || "?"), [form.instrument]);

  const entry = num(form.entry);
  const sl = num(form.sl);
  const size = num(form.size);

  const tpAllocations: TpAllocation[] = useMemo(() => {
    const prices = [num(form.tp1), num(form.tp2), num(form.tp3)];
    return prices
      .map((price, i) => (price !== null && form.tpSplit[i] > 0 ? { price, sharePct: form.tpSplit[i] } : null))
      .filter((t): t is TpAllocation => t !== null);
  }, [form.tp1, form.tp2, form.tp3, form.tpSplit]);

  const calc = useMemo(() => {
    if (entry === null || sl === null) return { riskUsd: null, riskPct: null, rr: null, recSize: null };
    const risk = size !== null ? calcRiskUsd(form.direction, entry, sl, size, spec) : null;
    const pct = risk !== null && selectedAccount ? calcRiskPct(risk, selectedAccount.startBalance) : null;
    const rr = weightedRR(form.direction, entry, sl, tpAllocations, spec.pipSize);
    const recSize = selectedAccount
      ? recommendedSize(selectedAccount.startBalance, 1, form.direction, entry, sl, spec)
      : null;
    return { riskUsd: risk, riskPct: pct, rr, recSize };
  }, [entry, sl, size, form.direction, spec, selectedAccount, tpAllocations]);

  // Auto-Vorschlag für "Risiko <= 1%" im Regel-Check, sobald berechenbar.
  useEffect(() => {
    if (calc.riskPct === null || !selectedAccount) return;
    const ok = calc.riskPct <= selectedAccount.dailyLossPct;
    setForm((f) => {
      const label = `Risiko ≤ ${selectedAccount.dailyLossPct}% (${selectedAccount.firm})`;
      const next = { ...f.ruleChecks };
      delete next[Object.keys(next).find((k) => k.startsWith("Risiko ≤")) ?? ""];
      next[label] = ok;
      return { ...f, ruleChecks: next };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [calc.riskPct, selectedAccount?.dailyLossPct, selectedAccount?.firm]);

  useEffect(() => {
    setForm((f) => ({ ...f, ruleChecks: { ...f.ruleChecks, "SL gesetzt": sl !== null } }));
  }, [sl]);

  const suggestedResultUsd = useMemo(() => {
    if (entry === null || size === null || !form.exitPrice) return null;
    return resultUsdFromExits(form.direction, entry, size, spec, [{ price: Number(form.exitPrice), sharePct: 100 }]);
  }, [entry, size, form.exitPrice, form.direction, spec]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload: Partial<Trade> = {
        accountId: form.accountId,
        copyGroup: selectedAccount?.copyGroup ?? null,
        instrument: form.instrument.toUpperCase(),
        direction: form.direction,
        openedAt: new Date(form.openedAt).toISOString(),
        session: form.session,
        entry,
        sl,
        tp1: num(form.tp1),
        tp2: num(form.tp2),
        tp3: num(form.tp3),
        tpSplitJson: form.tpSplit,
        size,
        setupTypesJson: form.setupTypes,
        timeframesJson: { htf: form.timeframeHtf || undefined, entry: form.timeframeEntry || undefined },
        reasoning: form.reasoning || null,
        emotionScore: form.emotionScore,
        emotionTagsJson: form.emotionTags,
        ruleChecksJson: form.ruleChecks,
        status: form.status,
        followedPlan: form.followedPlan,
        lesson: form.lesson || null,
      };

      if (form.status === "closed") {
        payload.closedAt = new Date().toISOString();
        payload.exitPricesJson = form.exitPrice ? [{ price: Number(form.exitPrice), sharePct: 100 }] : null;
        payload.resultUsd = form.resultUsd ? Number(form.resultUsd) : suggestedResultUsd;
      }

      const trade = initial ? (await updateTrade(initial.id, payload)).trade : await createTrade(payload);

      for (const img of staged) {
        await uploadTradeImage(trade.id, img.dataUrl, img.kind);
      }

      return trade;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trades"] });
      onClose();
    },
  });

  const removeSavedImage = useMutation({
    mutationFn: (id: number) => deleteTradeImage(id),
    onSuccess: (_void, id) => setSavedImages((imgs) => imgs.filter((i) => i.id !== id)),
  });

  async function handleAnalyze(dataUrlOrUrl: string) {
    setAnalyzing(true);
    setAiNote(null);
    try {
      let dataUrl = dataUrlOrUrl;
      if (!dataUrl.startsWith("data:")) {
        const res = await fetch(dataUrl);
        const blob = await res.blob();
        dataUrl = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.readAsDataURL(blob);
        });
      }
      const extraction: ChartExtraction = await analyzeScreenshot(dataUrl);
      setForm((f) => ({
        ...f,
        instrument: extraction.instrument ?? f.instrument,
        direction: extraction.direction ?? f.direction,
        entry: extraction.entry?.toString() ?? f.entry,
        sl: extraction.sl?.toString() ?? f.sl,
        tp1: extraction.tp1?.toString() ?? f.tp1,
        tp2: extraction.tp2?.toString() ?? f.tp2,
        tp3: extraction.tp3?.toString() ?? f.tp3,
        timeframeEntry: extraction.timeframe ?? f.timeframeEntry,
      }));
      setAiNote(
        `KI-Vertrauen: ${extraction.confidence}. Bitte Werte prüfen, bevor du speicherst.` +
          (extraction.visibleElements.length ? ` Erkannt: ${extraction.visibleElements.join(", ")}.` : ""),
      );
    } catch (err) {
      setAiNote(`Analyse fehlgeschlagen: ${(err as Error).message}`);
    } finally {
      setAnalyzing(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/60 p-6">
      <div className="glass-card w-full max-w-3xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-line shrink-0">
          <h2 className="font-heading text-lg">{initial ? "Trade bearbeiten" : "Setup erfassen"}</h2>
          <button onClick={onClose} className="text-text-faint hover:text-cyan" aria-label="Schließen">
            <X size={18} />
          </button>
        </div>

        <div className="overflow-y-auto px-5 py-4 flex flex-col gap-5">
          <ScreenshotUploader
            savedImages={savedImages}
            stagedImages={staged}
            onAddStaged={(img) => setStaged((s) => [...s, img])}
            onRemoveStaged={(id) => setStaged((s) => s.filter((i) => i.tempId !== id))}
            onRemoveSaved={(id) => removeSavedImage.mutate(id)}
            onAnalyze={handleAnalyze}
            kiAvailable={kiAvailable}
            analyzing={analyzing}
          />
          {analyzing && <p className="text-xs text-cyan flex items-center gap-1.5"><Sparkles size={12} /> Claude liest den Screenshot...</p>}
          {aiNote && <p className="text-xs text-gold bg-gold/10 border border-gold/30 rounded-lg px-3 py-2">{aiNote}</p>}

          <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Field label="Instrument">
              <input
                className={inputClass}
                value={form.instrument}
                onChange={(e) => setForm((f) => ({ ...f, instrument: e.target.value }))}
                placeholder="z. B. EURUSD"
              />
            </Field>
            <Field label="Richtung">
              <select
                className={inputClass}
                value={form.direction}
                onChange={(e) => setForm((f) => ({ ...f, direction: e.target.value as TradeDirection }))}
              >
                <option value="long">Long</option>
                <option value="short">Short</option>
              </select>
            </Field>
            <Field label="Datum/Uhrzeit">
              <input
                type="datetime-local"
                className={inputClass}
                value={form.openedAt}
                onChange={(e) =>
                  setForm((f) => ({ ...f, openedAt: e.target.value, session: sessionFromTime(e.target.value) }))
                }
              />
            </Field>
            <Field label="Session (automatisch)">
              <input className={inputClass} value={form.session ?? "–"} disabled />
            </Field>
            <Field label="Konto">
              <select
                className={inputClass}
                value={form.accountId ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, accountId: e.target.value ? Number(e.target.value) : null }))}
              >
                <option value="">— kein Konto —</option>
                {accounts?.map(({ account }) => (
                  <option key={account.id} value={account.id}>
                    {account.firm} {account.program}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Status">
              <select
                className={inputClass}
                value={form.status}
                onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as Trade["status"] }))}
              >
                <option value="planned">Geplant</option>
                <option value="open">Offen</option>
                <option value="closed">Geschlossen</option>
                <option value="missed">Verpasst</option>
              </select>
            </Field>
            <Field label="HTF-Bias">
              <input className={inputClass} value={form.timeframeHtf} onChange={(e) => setForm((f) => ({ ...f, timeframeHtf: e.target.value }))} placeholder="z. B. H4" />
            </Field>
            <Field label="Entry-TF">
              <input className={inputClass} value={form.timeframeEntry} onChange={(e) => setForm((f) => ({ ...f, timeframeEntry: e.target.value }))} placeholder="z. B. M5" />
            </Field>
          </section>

          <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Field label="Entry">
              <input type="number" step="any" className={inputClass} value={form.entry} onChange={(e) => setForm((f) => ({ ...f, entry: e.target.value }))} />
            </Field>
            <Field label="Stop Loss">
              <input type="number" step="any" className={inputClass} value={form.sl} onChange={(e) => setForm((f) => ({ ...f, sl: e.target.value }))} />
            </Field>
            <Field label="Größe (Lots/Kontrakte)">
              <input type="number" step="any" className={inputClass} value={form.size} onChange={(e) => setForm((f) => ({ ...f, size: e.target.value }))} />
            </Field>
            <Field label="Positionsgrößen-Rechner (1% Risiko)">
              <input
                className={inputClass}
                disabled
                value={calc.recSize !== null ? calc.recSize.toFixed(2) : "–"}
              />
            </Field>

            {([0, 1, 2] as const).map((i) => (
              <Field key={i} label={`TP${i + 1}`}>
                <div className="flex gap-1">
                  <input
                    type="number"
                    step="any"
                    className={inputClass + " flex-1 min-w-0"}
                    value={form[`tp${i + 1}` as "tp1" | "tp2" | "tp3"]}
                    onChange={(e) => setForm((f) => ({ ...f, [`tp${i + 1}`]: e.target.value }) as FormState)}
                  />
                  <input
                    type="number"
                    className="w-14 bg-bg2 border border-line rounded-lg px-1 py-1.5 text-xs text-text"
                    value={form.tpSplit[i]}
                    onChange={(e) =>
                      setForm((f) => {
                        const next = [...f.tpSplit] as [number, number, number];
                        next[i] = Number(e.target.value);
                        return { ...f, tpSplit: next };
                      })
                    }
                    title="Anteil der Position in %"
                  />
                </div>
              </Field>
            ))}
          </section>

          <section className="glass-card !bg-bg2/60 p-3 grid grid-cols-2 md:grid-cols-4 gap-3 font-mono-num text-sm">
            <div>
              <div className="text-text-faint text-xs">Risiko</div>
              <div className="text-text">
                {calc.riskUsd !== null ? `${calc.riskUsd.toFixed(2)} $` : "–"}
                {calc.riskPct !== null && ` (${calc.riskPct.toFixed(2)}%)`}
              </div>
            </div>
            <div>
              <div className="text-text-faint text-xs">R:R geplant</div>
              <div className="text-text">{calc.rr !== null ? calc.rr.toFixed(2) : "–"}</div>
            </div>
          </section>

          <section>
            <h3 className="section-label mb-2">Setup-Typ</h3>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {SETUP_TYPES.map((t) => {
                const active = form.setupTypes.includes(t);
                return (
                  <button
                    key={t}
                    onClick={() =>
                      setForm((f) => ({
                        ...f,
                        setupTypes: active ? f.setupTypes.filter((s) => s !== t) : [...f.setupTypes, t],
                      }))
                    }
                    className={clsx(
                      "rounded-full border px-2.5 py-1 text-xs",
                      active ? "border-cyan text-cyan" : "border-line text-text-muted",
                    )}
                  >
                    {t}
                  </button>
                );
              })}
              {form.setupTypes
                .filter((t) => !(SETUP_TYPES as readonly string[]).includes(t))
                .map((t) => (
                  <button
                    key={t}
                    onClick={() => setForm((f) => ({ ...f, setupTypes: f.setupTypes.filter((s) => s !== t) }))}
                    className="rounded-full border border-cyan text-cyan px-2.5 py-1 text-xs"
                  >
                    {t} ×
                  </button>
                ))}
            </div>
            <div className="flex gap-2">
              <input
                className={inputClass + " flex-1"}
                placeholder="Eigenen Setup-Typ hinzufügen…"
                value={customSetupType}
                onChange={(e) => setCustomSetupType(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && customSetupType.trim()) {
                    setForm((f) => ({ ...f, setupTypes: [...f.setupTypes, customSetupType.trim()] }));
                    setCustomSetupType("");
                  }
                }}
              />
            </div>
          </section>

          <Field label="Begründung">
            <textarea
              className={inputClass + " min-h-16"}
              value={form.reasoning}
              onChange={(e) => setForm((f) => ({ ...f, reasoning: e.target.value }))}
            />
          </Field>

          <section>
            <h3 className="section-label mb-2">Emotion vor dem Trade</h3>
            <div className="flex items-center gap-3 mb-2">
              <input
                type="range"
                min={1}
                max={10}
                value={form.emotionScore}
                onChange={(e) => setForm((f) => ({ ...f, emotionScore: Number(e.target.value) }))}
                className="flex-1 accent-cyan"
              />
              <span className="font-mono-num text-sm w-6 text-right">{form.emotionScore}</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {EMOTION_TAGS.map((tag) => {
                const active = form.emotionTags.includes(tag);
                return (
                  <button
                    key={tag}
                    onClick={() =>
                      setForm((f) => ({
                        ...f,
                        emotionTags: active ? f.emotionTags.filter((t) => t !== tag) : [...f.emotionTags, tag],
                      }))
                    }
                    className={clsx(
                      "rounded-full border px-2.5 py-1 text-xs",
                      active ? "border-violet text-violet-light" : "border-line text-text-muted",
                    )}
                  >
                    {tag}
                  </button>
                );
              })}
            </div>
          </section>

          <section>
            <h3 className="section-label mb-2">Regel-Check</h3>
            <div className="flex flex-col gap-1.5">
              {Object.entries(form.ruleChecks).map(([rule, checked]) => (
                <label key={rule} className="flex items-center gap-2 text-sm text-text">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(e) => setForm((f) => ({ ...f, ruleChecks: { ...f.ruleChecks, [rule]: e.target.checked } }))}
                    className="h-4 w-4 accent-cyan"
                  />
                  {rule}
                </label>
              ))}
            </div>
          </section>

          {form.status === "closed" && (
            <section className="glass-card !bg-bg2/60 p-3">
              <h3 className="section-label mb-2">Nach dem Trade</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-3">
                <Field label="Exit-Preis">
                  <input
                    type="number"
                    step="any"
                    className={inputClass}
                    value={form.exitPrice}
                    onChange={(e) => setForm((f) => ({ ...f, exitPrice: e.target.value }))}
                  />
                </Field>
                <Field label="Ergebnis ($, tatsächlich)">
                  <input
                    type="number"
                    step="any"
                    className={inputClass}
                    value={form.resultUsd}
                    placeholder={suggestedResultUsd !== null ? suggestedResultUsd.toFixed(2) : ""}
                    onChange={(e) => setForm((f) => ({ ...f, resultUsd: e.target.value }))}
                  />
                </Field>
                <div className="flex items-end pb-1.5 text-xs text-text-faint">
                  {suggestedResultUsd !== null && `Rechnerisch: ${suggestedResultUsd.toFixed(2)} $`}
                </div>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-sm text-text-muted">Hätte ich nach Plan gehandelt?</span>
                <label className="flex items-center gap-1 text-sm">
                  <input
                    type="radio"
                    checked={form.followedPlan === true}
                    onChange={() => setForm((f) => ({ ...f, followedPlan: true }))}
                  />
                  Ja
                </label>
                <label className="flex items-center gap-1 text-sm">
                  <input
                    type="radio"
                    checked={form.followedPlan === false}
                    onChange={() => setForm((f) => ({ ...f, followedPlan: false }))}
                  />
                  Nein
                </label>
              </div>
              <Field label="Lektion">
                <textarea
                  className={inputClass + " min-h-14 mt-2"}
                  value={form.lesson}
                  onChange={(e) => setForm((f) => ({ ...f, lesson: e.target.value }))}
                />
              </Field>
            </section>
          )}

          {saveMutation.isError && (
            <p className="text-xs text-red">Speichern fehlgeschlagen: {(saveMutation.error as Error).message}</p>
          )}
        </div>

        <div className="flex justify-end gap-2 px-5 py-4 border-t border-line shrink-0">
          <button onClick={onClose} className="rounded-lg border border-line px-4 py-2 text-sm text-text-muted">
            Abbrechen
          </button>
          <button
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending || !form.instrument}
            className="rounded-lg bg-gradient-to-r from-cyan to-ice px-4 py-2 text-sm text-bg0 font-medium disabled:opacity-50"
          >
            {saveMutation.isPending ? "Speichert…" : "Speichern"}
          </button>
        </div>
      </div>
    </div>
  );
}
