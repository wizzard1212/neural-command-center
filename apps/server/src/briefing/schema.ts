// Strukturierte Ausgabe für das Morgen-Briefing (SPEC.md Abschnitt 5.2 "Aufbau
// des Briefings"). Nur die Erzähl-Abschnitte kommen von Claude – Zahlen zu
// Konten, Kalender und COT stammen aus eigenen, nicht-halluzinierbaren Daten
// und werden separat im UI gerendert.

export interface WatchlistBiasEntry {
  instrument: string;
  bias: "bullisch" | "neutral" | "baerisch";
  zonen: string;
  treiber: string;
}

export interface SourceRef {
  aussage: string;
  link: string;
}

export interface BriefingNarrative {
  lageInDreiSaetzen: string;
  watchlistBias: WatchlistBiasEntry[];
  zusammenhaenge: string[];
  zentralbankenGeopolitik: string;
  krypto: string;
  socialStimmung: string;
  fokusRegelDesTages: string;
  quellen: SourceRef[];
}

export const BRIEFING_TOOL = {
  name: "submit_briefing",
  description: "Übermittelt das fertige Morgen-Briefing in strukturierter Form.",
  input_schema: {
    type: "object" as const,
    properties: {
      lageInDreiSaetzen: { type: "string", description: "Was den Markt heute bewegt, in genau 3 Sätzen." },
      watchlistBias: {
        type: "array",
        items: {
          type: "object",
          properties: {
            instrument: { type: "string" },
            bias: { type: "string", enum: ["bullisch", "neutral", "baerisch"] },
            zonen: { type: "string", description: "Wichtige Zonen: Vortageshoch/-tief, Wochenhoch/-tief, runde Zahlen." },
            treiber: { type: "string", description: "Was das Instrument heute treibt." },
          },
          required: ["instrument", "bias", "zonen", "treiber"],
        },
      },
      zusammenhaenge: {
        type: "array",
        items: { type: "string" },
        description: "2-3 Ursache-Wirkungs-Ketten zwischen Anlageklassen.",
      },
      zentralbankenGeopolitik: { type: "string", description: "Fed, EZB, Reden heute, Konflikte, Zölle, Wahlen." },
      krypto: { type: "string", description: "Kurzer Krypto-Abschnitt." },
      socialStimmung: { type: "string", description: "Was trendet, Hype-Warnungen – basierend auf den gelieferten News." },
      fokusRegelDesTages: { type: "string", description: "Eine von Merlins eigenen Risiko-Regeln, die heute besonders relevant ist." },
      quellen: {
        type: "array",
        items: {
          type: "object",
          properties: { aussage: { type: "string" }, link: { type: "string" } },
          required: ["aussage", "link"],
        },
        description: "Jede Faktenaussage mit Quellenlink.",
      },
    },
    required: [
      "lageInDreiSaetzen",
      "watchlistBias",
      "zusammenhaenge",
      "zentralbankenGeopolitik",
      "krypto",
      "socialStimmung",
      "fokusRegelDesTages",
      "quellen",
    ],
  },
};
