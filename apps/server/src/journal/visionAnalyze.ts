import Anthropic from "@anthropic-ai/sdk";
import { env } from "../lib/env.js";

export interface ChartExtraction {
  instrument: string | null;
  timeframe: string | null;
  direction: "long" | "short" | null;
  entry: number | null;
  sl: number | null;
  tp1: number | null;
  tp2: number | null;
  tp3: number | null;
  visibleElements: string[];
  confidence: "hoch" | "mittel" | "niedrig";
}

const EXTRACT_TOOL = {
  name: "extract_chart_data",
  description:
    "Trägt die aus dem Trading-Chart-Screenshot abgelesenen Werte ein. Felder, die nicht sicher erkennbar " +
    "sind, bleiben null statt geraten zu werden.",
  input_schema: {
    type: "object" as const,
    properties: {
      instrument: { type: ["string", "null"], description: "z. B. NQ, EURUSD, XAUUSD" },
      timeframe: { type: ["string", "null"], description: "z. B. M5, H1, H4" },
      direction: { type: ["string", "null"], enum: ["long", "short", null] },
      entry: { type: ["number", "null"] },
      sl: { type: ["number", "null"] },
      tp1: { type: ["number", "null"] },
      tp2: { type: ["number", "null"] },
      tp3: { type: ["number", "null"] },
      visibleElements: {
        type: "array",
        items: { type: "string" },
        description: "Sichtbare Elemente, z. B. Fibonacci-Level, EMA, Order Block, FVG",
      },
      confidence: { type: "string", enum: ["hoch", "mittel", "niedrig"] },
    },
    required: ["visibleElements", "confidence"],
  },
};

export interface ChartExtractionResult {
  extraction: ChartExtraction;
  usage: { inputTokens: number; outputTokens: number };
}

export async function analyzeChartScreenshot(dataUrl: string): Promise<ChartExtractionResult> {
  if (!env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY fehlt – Screenshot-Analyse ist nicht verfügbar.");
  }

  const match = /^data:(image\/[a-zA-Z+]+);base64,(.+)$/.exec(dataUrl);
  if (!match) throw new Error("Ungültiges Bildformat.");
  const [, mediaType, base64] = match;

  const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });

  const response = await client.messages.create({
    model: env.ANTHROPIC_MODEL,
    max_tokens: 1024,
    tools: [EXTRACT_TOOL],
    tool_choice: { type: "tool", name: "extract_chart_data" },
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: { type: "base64", media_type: mediaType as "image/png" | "image/jpeg" | "image/webp", data: base64 },
          },
          {
            type: "text",
            text:
              "Das ist ein Trading-Chart-Screenshot (vermutlich aus TradingView). Lies Instrument, " +
              "Zeiteinheit, Richtung, Entry, Stop Loss und Take-Profit-Level aus, falls über ein " +
              "Long/Short-Position-Tool oder Preislinien sichtbar. Erkenne außerdem sichtbare Elemente wie " +
              "Fibonacci-Level, EMAs, Order Blocks oder Fair Value Gaps. Erfinde keine Werte – wenn etwas " +
              "nicht eindeutig ablesbar ist, lass das Feld leer (null) und senke die confidence.",
          },
        ],
      },
    ],
  });

  const toolUse = response.content.find((block) => block.type === "tool_use");
  if (!toolUse || toolUse.type !== "tool_use") {
    throw new Error("Claude hat keine strukturierten Daten zurückgegeben.");
  }

  const input = toolUse.input as Partial<ChartExtraction>;
  return {
    extraction: {
      instrument: input.instrument ?? null,
      timeframe: input.timeframe ?? null,
      direction: input.direction ?? null,
      entry: input.entry ?? null,
      sl: input.sl ?? null,
      tp1: input.tp1 ?? null,
      tp2: input.tp2 ?? null,
      tp3: input.tp3 ?? null,
      visibleElements: input.visibleElements ?? [],
      confidence: input.confidence ?? "niedrig",
    },
    usage: {
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
    },
  };
}
