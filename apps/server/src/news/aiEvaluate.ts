import Anthropic from "@anthropic-ai/sdk";
import { DEFAULT_WATCHLIST } from "@ncc/shared";
import { env } from "../lib/env.js";

export interface NewsEvaluation {
  id: number;
  relevance: number;
  assets: string[];
  direction: Record<string, string>; // Asset -> "↑" | "↓" | "unklar" + Begründung als Freitext separat
  directionReasoning: string;
  category: "Zentralbank" | "Makrodaten" | "Geopolitik" | "Unternehmen" | "Krypto" | "Regulierung";
  summaryDe: string;
}

const BATCH_TOOL = {
  name: "evaluate_news_batch",
  description: "Bewertet jeden der übergebenen Artikel für Merlins Watchlist.",
  input_schema: {
    type: "object" as const,
    properties: {
      evaluations: {
        type: "array",
        items: {
          type: "object",
          properties: {
            id: { type: "number", description: "Die id des Artikels aus der Eingabe" },
            relevance: { type: "number", description: "1 (irrelevant) bis 5 (sehr relevant) für die Watchlist" },
            assets: { type: "array", items: { type: "string" }, description: "Betroffene Assets, z. B. XAUUSD, NQ, BTC" },
            direction: {
              type: "object",
              description: "Pro betroffenem Asset: 'up', 'down' oder 'unclear'",
              additionalProperties: { type: "string", enum: ["up", "down", "unclear"] },
            },
            directionReasoning: { type: "string", description: "Ein Satz Begründung für die erwartete Richtung" },
            category: {
              type: "string",
              enum: ["Zentralbank", "Makrodaten", "Geopolitik", "Unternehmen", "Krypto", "Regulierung"],
            },
            summaryDe: { type: "string", description: "Deutsche Kurz-Zusammenfassung, max. 2 Sätze" },
          },
          required: ["id", "relevance", "assets", "direction", "category", "summaryDe"],
        },
      },
    },
    required: ["evaluations"],
  },
};

export interface EvaluateBatchResult {
  evaluations: NewsEvaluation[];
  usage: { inputTokens: number; outputTokens: number };
}

export async function evaluateNewsBatch(
  articles: { id: number; title: string; source: string }[],
): Promise<EvaluateBatchResult> {
  if (!env.ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY fehlt – News-Bewertung ist nicht verfügbar.");
  if (articles.length === 0) return { evaluations: [], usage: { inputTokens: 0, outputTokens: 0 } };

  const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });

  const articleList = articles.map((a) => `- id=${a.id} [${a.source}] ${a.title}`).join("\n");

  const response = await client.messages.create({
    model: env.ANTHROPIC_MODEL_FAST,
    max_tokens: 2048,
    tools: [BATCH_TOOL],
    tool_choice: { type: "tool", name: "evaluate_news_batch" },
    messages: [
      {
        role: "user",
        content:
          `Watchlist: ${DEFAULT_WATCHLIST.join(", ")}.\n\n` +
          `Bewerte jeden der folgenden Nachrichtenartikel (nur anhand der Überschrift) für diese Watchlist. ` +
          `Erfinde keine Fakten – wenn die Überschrift allein keine klare Richtung erkennen lässt, setze "unclear". ` +
          `Antworte auf Deutsch (summaryDe).\n\n${articleList}`,
      },
    ],
  });

  const toolUse = response.content.find((b) => b.type === "tool_use");
  if (!toolUse || toolUse.type !== "tool_use") throw new Error("Claude hat keine strukturierte Bewertung zurückgegeben.");

  const input = toolUse.input as { evaluations: NewsEvaluation[] };

  return {
    evaluations: input.evaluations ?? [],
    usage: { inputTokens: response.usage.input_tokens, outputTokens: response.usage.output_tokens },
  };
}
