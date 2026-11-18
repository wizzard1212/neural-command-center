import Anthropic from "@anthropic-ai/sdk";
import { env } from "../lib/env.js";

const HOOK_TOOL = {
  name: "submit_hook_idea",
  description: "Übermittelt eine Hook-Idee für einen Content-Kanal zu einem viralen Social-Media-Thema.",
  input_schema: {
    type: "object" as const,
    properties: {
      hookDe: { type: "string", description: "Eine knackige Hook-Idee auf Deutsch (1-2 Sätze)." },
      hookEn: { type: "string", description: "Dieselbe Hook-Idee auf Englisch (1-2 Sätze)." },
    },
    required: ["hookDe", "hookEn"],
  },
};

export interface HookIdeaResult {
  hookDe: string;
  hookEn: string;
  usage: { inputTokens: number; outputTokens: number };
}

/** Abschnitt 7.2: "Viral-Analyse für Content ... + KI-Vorschlag: 'Hook-Idee
 * für deinen Kanal' (deutsch und englisch)." */
export async function generateHookIdea(input: { title: string; platform: string; metricType?: string | null; metricValue?: number | null }): Promise<HookIdeaResult> {
  if (!env.ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY fehlt – Hook-Idee ist nicht verfügbar.");

  const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
  const metric = input.metricType && input.metricValue != null ? ` (${input.metricType}: ${input.metricValue})` : "";

  const response = await client.messages.create({
    model: env.ANTHROPIC_MODEL_FAST,
    max_tokens: 400,
    tools: [HOOK_TOOL],
    tool_choice: { type: "tool", name: "submit_hook_idea" },
    messages: [
      {
        role: "user",
        content:
          `Dieses Thema geht gerade auf ${input.platform} viral: "${input.title}"${metric}. ` +
          `Schlage eine knackige Hook-Idee für den ersten Satz eines kurzen Trading-/Finance-Videos oder Posts vor, ` +
          `die Neugier weckt, ohne reißerisch oder falsch zu sein. Keine Kauf-/Verkaufsempfehlung.`,
      },
    ],
  });

  const toolUse = response.content.find((b) => b.type === "tool_use");
  if (!toolUse || toolUse.type !== "tool_use") throw new Error("Claude hat keine Hook-Idee zurückgegeben.");

  const input_ = toolUse.input as { hookDe: string; hookEn: string };
  return {
    hookDe: input_.hookDe,
    hookEn: input_.hookEn,
    usage: { inputTokens: response.usage.input_tokens, outputTokens: response.usage.output_tokens },
  };
}
