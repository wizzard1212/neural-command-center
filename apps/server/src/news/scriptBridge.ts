import Anthropic from "@anthropic-ai/sdk";
import { env } from "../lib/env.js";
import { listContentIdeas } from "./repo.js";
import { getLatestBriefing } from "../briefing/repo.js";
import { writeScriptMarkdown } from "./vaultExportContentIdea.js";

// Abschnitt 11: "News-Kanal-Brücke ... passend zum Wochenplan des Kanals."
// JS Date.getDay(): 0=So, 1=Mo, ..., 6=Sa.
export const WEEKDAY_TOPICS: Record<number, string> = {
  0: "Rückblick",
  1: "Wochenausblick",
  2: "Geopolitik",
  3: "Märkte",
  4: "Politik",
  5: "KI & Konzerne",
  6: "Zusammenhang",
};

const SCRIPT_TOOL = {
  name: "submit_script_draft",
  description: "Übermittelt den Skript-Entwurf für den heutigen Content-Kanal-Tag.",
  input_schema: {
    type: "object" as const,
    properties: {
      title: { type: "string", description: "Arbeitstitel für das Video/den Post." },
      script: { type: "string", description: "Der Skript-Entwurf (3-6 Absätze, gesprochene Sprache, Deutsch)." },
    },
    required: ["title", "script"],
  },
};

export interface ScriptDraftResult {
  topic: string;
  title: string;
  script: string;
  vaultPath: string | null;
  usage: { inputTokens: number; outputTokens: number };
}

/** Baut aus dem letzten Morgen-Briefing und den zuletzt gemerkten Content-
 * Ideen einen Skript-Entwurf passend zum heutigen Wochentags-Thema des
 * Kanals "Maskierter König". */
export async function generateScriptForToday(): Promise<ScriptDraftResult> {
  if (!env.ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY fehlt – Skript-Entwurf ist nicht verfügbar.");

  const topic = WEEKDAY_TOPICS[new Date().getDay()];
  const briefing = getLatestBriefing();
  const narrative = (briefing?.contentJson as { narrative?: { lageInDreiSaetzen?: string; zusammenhaenge?: string[] } } | null)?.narrative;
  const ideas = listContentIdeas().slice(0, 10);

  const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });

  const userMessage = [
    `Heutiger Kanal-Tag: ${topic}.`,
    narrative
      ? `Aktuelles Morgen-Briefing: ${narrative.lageInDreiSaetzen ?? ""} Zusammenhänge: ${(narrative.zusammenhaenge ?? []).join("; ")}`
      : "Kein aktuelles Morgen-Briefing verfügbar.",
    `Gemerkte Content-Ideen: ${ideas.map((i) => i.idea).join("; ") || "keine"}`,
  ].join("\n\n");

  const response = await client.messages.create({
    model: env.ANTHROPIC_MODEL,
    max_tokens: 1536,
    system:
      "Du schreibst Skript-Entwürfe für Merlins Finanz-Content-Kanal 'Maskierter König'. Ton: direkt, " +
      "informativ, ohne Floskeln, auf Deutsch, in gesprochener Sprache für ein kurzes Video. Nutze " +
      "ausschließlich die gelieferten Fakten aus Briefing und Content-Ideen, erfinde keine Zahlen. Keine " +
      "Kauf-/Verkaufsempfehlungen.",
    tools: [SCRIPT_TOOL],
    tool_choice: { type: "tool", name: "submit_script_draft" },
    messages: [{ role: "user", content: userMessage }],
  });

  const toolUse = response.content.find((b) => b.type === "tool_use");
  if (!toolUse || toolUse.type !== "tool_use") throw new Error("Claude hat keinen Skript-Entwurf zurückgegeben.");
  const { title, script } = toolUse.input as { title: string; script: string };

  const vaultPath = writeScriptMarkdown({ topic, title, script });

  return {
    topic,
    title,
    script,
    vaultPath,
    usage: { inputTokens: response.usage.input_tokens, outputTokens: response.usage.output_tokens },
  };
}
