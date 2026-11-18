import Anthropic from "@anthropic-ai/sdk";
import { env } from "../lib/env.js";
import type { WeekStats } from "./weeklyReviewStats.js";

const REVIEW_TOOL = {
  name: "submit_weekly_review",
  description: "Übermittelt das fertige Wochen-Review.",
  input_schema: {
    type: "object" as const,
    properties: {
      zusammenfassungDe: { type: "string", description: "Zusammenfassung der Handelswoche in 2-3 Sätzen." },
      muster: { type: "array", items: { type: "string" }, description: "Erkannte Muster, gute wie schlechte." },
      regelbrueche: { type: "array", items: { type: "string" }, description: "Konkrete Regelbrüche dieser Woche (leer, falls keine)." },
      verbesserungen: {
        type: "array",
        items: { type: "string" },
        description: "Genau 3 konkrete, umsetzbare Verbesserungen für die kommende Woche.",
      },
    },
    required: ["zusammenfassungDe", "muster", "regelbrueche", "verbesserungen"],
  },
};

export interface WeeklyReviewNarrative {
  zusammenfassungDe: string;
  muster: string[];
  regelbrueche: string[];
  verbesserungen: string[];
}

export interface WeeklyReviewAiResult {
  narrative: WeeklyReviewNarrative;
  usage: { inputTokens: number; outputTokens: number };
}

const SYSTEM_PROMPT =
  "Du bist Merlins Trading-Coach. Er ist Day-Trader (Fibonacci, EMAs, Smart-Money-Konzepte) und handelt " +
  "Prop-Firm-Konten bei The5ers und FTMO. Fasse seine abgelaufene Handelswoche zusammen: nüchtern, direkt, " +
  "ohne Floskeln, auf Deutsch. Nutze ausschließlich die gelieferten Zahlen und Trade-Notizen – erfinde keine " +
  "Zahlen oder Trades. Erkenne wiederkehrende Muster (Setup-Typen, Sessions, Emotionen) und benenne konkrete " +
  "Regelbrüche beim Namen. Die 3 Verbesserungsvorschläge müssen umsetzbar und spezifisch sein, keine " +
  "Allgemeinplätze wie 'diszipliniert bleiben'.";

export async function generateWeeklyReviewNarrative(
  stats: WeekStats,
  tradeNotes: { instrument: string; setupTypes: string[]; resultR: number | null; followedPlan: boolean | null; lesson: string | null }[],
): Promise<WeeklyReviewAiResult> {
  if (!env.ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY fehlt – Wochen-Review-Text ist nicht verfügbar.");

  const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });

  const userMessage = [
    `Kennzahlen der Woche: ${stats.tradeCount} geschlossene Trades, Winrate ${stats.winRatePct?.toFixed(0) ?? "–"}%, ` +
      `Profit-Faktor ${stats.profitFactor?.toFixed(2) ?? "–"}, Durchschnitts-R ${stats.averageR?.toFixed(2) ?? "–"}, ` +
      `Max-Drawdown ${stats.maxDrawdownR?.toFixed(2) ?? "–"}R, längste Gewinnserie ${stats.longestWinStreak}, ` +
      `längste Verlustserie ${stats.longestLossStreak}, Gesamtergebnis ${stats.totalResultR.toFixed(2)}R / ` +
      `${stats.totalResultUsd.toFixed(0)} $, Regelbrüche: ${stats.ruleBreaches}.`,
    `Einzelne Trades: ${JSON.stringify(tradeNotes)}`,
  ].join("\n\n");

  const response = await client.messages.create({
    model: env.ANTHROPIC_MODEL,
    max_tokens: 2048,
    system: SYSTEM_PROMPT,
    tools: [REVIEW_TOOL],
    tool_choice: { type: "tool", name: "submit_weekly_review" },
    messages: [{ role: "user", content: userMessage }],
  });

  const toolUse = response.content.find((b) => b.type === "tool_use");
  if (!toolUse || toolUse.type !== "tool_use") throw new Error("Claude hat kein strukturiertes Review zurückgegeben.");

  return {
    narrative: toolUse.input as WeeklyReviewNarrative,
    usage: { inputTokens: response.usage.input_tokens, outputTokens: response.usage.output_tokens },
  };
}
