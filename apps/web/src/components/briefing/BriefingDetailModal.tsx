import type { ReactNode } from "react";
import { createPortal } from "react-dom";
import { X, ExternalLink } from "lucide-react";
import clsx from "clsx";
import type { Briefing } from "../../lib/briefingApi";
import { BIAS_LABEL, BIAS_CLASS } from "./biasStyle";
import { TrafficLightDot } from "../accounts/TrafficLightDot";

function Section({ n, title, children }: { n: number; title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h3 className="section-label flex items-center gap-2">
        <span className="text-text-faint font-mono-num">{n}.</span> {title}
      </h3>
      <div className="text-sm text-text leading-relaxed">{children}</div>
    </section>
  );
}

function Unavailable({ reason }: { reason?: string }) {
  return <p className="text-text-faint text-sm italic">Nicht verfügbar{reason ? ` – ${reason}` : "."}</p>;
}

export function BriefingDetailModal({ briefing, onClose }: { briefing: Briefing; onClose: () => void }) {
  const content = briefing.contentJson;
  const narrative = content?.narrative ?? null;

  // GlassCard-Vorfahren setzen backdrop-filter, das für "position: fixed"
  // einen eigenen Containing Block erzeugt – ohne Portal bliebe das Modal in
  // der kleinen Briefing-Karte statt den ganzen Bildschirm abzudecken.
  return createPortal(
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/60 p-6">
      <div className="glass-card w-full max-w-3xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-line shrink-0">
          <div>
            <h2 className="font-heading text-lg">Morgen-Briefing</h2>
            <p className="text-text-faint text-xs">
              {briefing.date} · erstellt {new Date(briefing.createdAt).toLocaleTimeString("de-DE")}
              {briefing.vaultPath && ` · ${briefing.vaultPath}`}
            </p>
          </div>
          <button onClick={onClose} className="text-text-faint hover:text-cyan" aria-label="Schließen">
            <X size={18} />
          </button>
        </div>

        <div className="overflow-y-auto px-5 py-4 flex flex-col gap-6">
          {!narrative ? (
            <p className="text-text-muted text-sm">
              {content?.error ?? "Kein KI-Fließtext verfügbar (ANTHROPIC_API_KEY fehlt oder Monatsbudget erreicht)."}
            </p>
          ) : (
            <>
              <Section n={1} title="Lage in 3 Sätzen">
                <p>{narrative.lageInDreiSaetzen}</p>
              </Section>

              <Section n={2} title="Ampel pro Instrument">
                <div className="flex flex-col gap-2">
                  {narrative.watchlistBias.map((w) => (
                    <div key={w.instrument} className="flex flex-col gap-0.5 border border-line rounded-lg px-3 py-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono-num text-text">{w.instrument}</span>
                        <span className={clsx("text-xs rounded-full border px-2 py-0.5", BIAS_CLASS[w.bias])}>
                          {BIAS_LABEL[w.bias]}
                        </span>
                      </div>
                      <p className="text-text-muted text-xs">{w.zonen}</p>
                      <p className="text-text-faint text-xs">{w.treiber}</p>
                    </div>
                  ))}
                </div>
              </Section>

              <Section n={3} title="Zusammenhänge">
                <ul className="flex flex-col gap-1 list-disc list-inside">
                  {narrative.zusammenhaenge.map((z, i) => (
                    <li key={i}>{z}</li>
                  ))}
                </ul>
              </Section>

              <Section n={4} title="Termine & Kein-Trade-Fenster">
                {content?.calendar.available ? (
                  <pre className="text-xs text-text-muted whitespace-pre-wrap font-mono">
                    {JSON.stringify(content.calendar.data, null, 2)}
                  </pre>
                ) : (
                  <Unavailable reason={content?.calendar.reason} />
                )}
              </Section>

              <Section n={5} title="Zentralbanken & Geopolitik">
                <p>{narrative.zentralbankenGeopolitik}</p>
              </Section>

              <Section n={6} title="Krypto">
                <p>{narrative.krypto}</p>
              </Section>

              <Section n={7} title="Social-Stimmung">
                <p>{narrative.socialStimmung}</p>
              </Section>

              <Section n={8} title="Positionierung (COT)">
                {content?.cot.available ? (
                  <pre className="text-xs text-text-muted whitespace-pre-wrap font-mono">
                    {JSON.stringify(content.cot.data, null, 2)}
                  </pre>
                ) : (
                  <Unavailable reason={content?.cot.reason} />
                )}
              </Section>

              <Section n={9} title="Deine Konten heute">
                {content?.accountsToday.accounts.length ? (
                  <div className="flex flex-col gap-2">
                    {content.accountsToday.accounts.map((a) => (
                      <div key={a.id} className="flex items-center justify-between text-sm">
                        <span className="flex items-center gap-2">
                          <TrafficLightDot light={a.light} size="sm" /> {a.label}
                        </span>
                        <span className="font-mono-num text-text-muted">
                          Puffer {a.bufferUsd.toFixed(0)} $ ({a.bufferPct.toFixed(0)} %)
                        </span>
                      </div>
                    ))}
                    {content.accountsToday.strictestAccountLabel && (
                      <p className="text-xs text-text-faint mt-1">
                        Erlaubtes Risiko/Trade (0,5–1 % aufs strengste Konto „{content.accountsToday.strictestAccountLabel}
                        “): {content.accountsToday.allowedRiskUsdAt0_5Pct?.toFixed(0)}–
                        {content.accountsToday.allowedRiskUsdAt1Pct?.toFixed(0)} $
                      </p>
                    )}
                    {content.accountsToday.copyGroupRisks.map((g) => (
                      <p
                        key={g.copyGroup}
                        className={clsx("text-xs", g.exceedsStrictest ? "text-red" : "text-text-faint")}
                      >
                        {g.copyGroup}: Gesamtrisiko {g.totalRiskUsd.toFixed(0)} $
                        {g.exceedsStrictest && " – übersteigt strengstes Konto!"}
                      </p>
                    ))}
                  </div>
                ) : (
                  <Unavailable reason="Keine aktiven Konten." />
                )}
              </Section>

              <Section n={10} title="Fokus-Regel des Tages">
                <p>{narrative.fokusRegelDesTages}</p>
              </Section>

              <Section n={11} title="Quellen">
                <ul className="flex flex-col gap-1">
                  {narrative.quellen.map((q, i) => (
                    <li key={i}>
                      <a
                        href={q.link}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1.5 text-cyan hover:underline text-xs"
                      >
                        <ExternalLink size={11} className="shrink-0" /> {q.aussage}
                      </a>
                    </li>
                  ))}
                </ul>
              </Section>
            </>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
