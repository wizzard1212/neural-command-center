import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve, dirname } from "node:path";
import { mkdirSync, writeFileSync, existsSync } from "node:fs";
import matter from "gray-matter";
import Anthropic from "@anthropic-ai/sdk";
import { DEFAULT_WATCHLIST } from "@ncc/shared";
import { env } from "../lib/env.js";
import { logAiUsage, isAiBudgetExceeded } from "../lib/aiUsageRepo.js";
import { listNewsItems } from "../news/repo.js";
import { collectWatchlistPrices, collectEconomicCalendar, collectCotData } from "./priceCollector.js";
import { collectRiskRulesFromVault, collectOpenTradingTodos } from "./vaultRules.js";
import { collectAccountsToday } from "./accountsCollector.js";
import { collectSocialTrends } from "./socialCollector.js";
import { BRIEFING_TOOL, type BriefingNarrative } from "./schema.js";
import { createBriefing } from "./repo.js";
import { broadcast } from "../ws.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SYSTEM_PROMPT = readFileSync(resolve(__dirname, "../prompts/briefing.md"), "utf-8");

async function sendNtfyPush(title: string, message: string) {
  if (!env.NTFY_TOPIC) return;
  try {
    await fetch(`https://ntfy.sh/${env.NTFY_TOPIC}`, {
      method: "POST",
      headers: { Title: title },
      body: message,
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    // Push ist ein Komfort-Feature – ein Fehler hier darf das Briefing nicht scheitern lassen.
  }
}

function writeBriefingMarkdown(date: string, markdown: string): string | null {
  if (!env.VAULT_PATH || !existsSync(env.VAULT_PATH)) return null;
  const dir = `${env.VAULT_WRITE_DIR}/Briefings`;
  const absoluteDir = resolve(env.VAULT_PATH, dir);
  mkdirSync(absoluteDir, { recursive: true });
  const fileName = `${date} Briefing.md`;
  const content = matter.stringify(markdown, { tags: ["briefing", "trading"] });
  writeFileSync(resolve(absoluteDir, fileName), content, "utf-8");
  return `${dir}/${fileName}`;
}

function buildMarkdown(date: string, narrative: BriefingNarrative, raw: Record<string, unknown>): string {
  const lines: string[] = [`# Morgen-Briefing ${date}`, "", "## Lage", narrative.lageInDreiSaetzen, ""];

  lines.push("## Watchlist");
  for (const w of narrative.watchlistBias) {
    lines.push(`- **${w.instrument}** (${w.bias}): ${w.zonen} – ${w.treiber}`);
  }

  lines.push("", "## Zusammenhänge");
  for (const z of narrative.zusammenhaenge) lines.push(`- ${z}`);

  lines.push("", "## Zentralbanken & Geopolitik", narrative.zentralbankenGeopolitik);
  lines.push("", "## Krypto", narrative.krypto);
  lines.push("", "## Social-Stimmung", narrative.socialStimmung);

  const accounts = raw.accountsToday as ReturnType<typeof collectAccountsToday>;
  lines.push("", "## Deine Konten heute");
  for (const a of accounts.accounts) {
    lines.push(`- ${a.label}: Puffer ${a.bufferUsd.toFixed(0)} $ (${a.bufferPct.toFixed(0)} %), Ampel ${a.light.color}`);
  }
  if (accounts.strictestAccountLabel) {
    lines.push(
      `- Erlaubtes Risiko/Trade (0,5-1 % aufs strengste Konto "${accounts.strictestAccountLabel}"): ` +
        `${accounts.allowedRiskUsdAt0_5Pct?.toFixed(0)}–${accounts.allowedRiskUsdAt1Pct?.toFixed(0)} $`,
    );
  }

  lines.push("", "## Fokus-Regel des Tages", narrative.fokusRegelDesTages);

  lines.push("", "## Quellen");
  for (const q of narrative.quellen) lines.push(`- [${q.aussage}](${q.link})`);

  return lines.join("\n") + "\n";
}

export async function generateBriefing(): Promise<{ status: "ok" | "partial" | "failed"; briefingId?: number }> {
  const date = new Date().toISOString().slice(0, 10);

  const [prices, calendar, cot] = await Promise.all([
    collectWatchlistPrices(),
    collectEconomicCalendar(date, new Date(Date.now() + 86_400_000).toISOString().slice(0, 10)),
    collectCotData(),
  ]);

  const riskRules = collectRiskRulesFromVault();
  const openTodos = collectOpenTradingTodos();
  const accountsToday = collectAccountsToday();
  const socialTrends = collectSocialTrends();

  const since = new Date(Date.now() - 18 * 60 * 60 * 1000).toISOString();
  const recentNews = listNewsItems({ from: since, limit: 100 })
    .filter((n) => n.relevance !== null)
    .sort((a, b) => (b.relevance ?? 0) - (a.relevance ?? 0))
    .slice(0, 20);

  const raw = { prices, calendar, cot, riskRules, openTodos, accountsToday, socialTrends, recentNews };

  if (!env.ANTHROPIC_API_KEY) {
    // Ohne KI kein Fließtext-Briefing, aber die reinen Daten werden trotzdem
    // gespeichert, damit das Dashboard sie zeigen kann (Abschnitt 5: "Fehler
    // einzelner Quellen dürfen das Briefing nicht abbrechen").
    const briefing = createBriefing({
      date,
      status: "partial",
      contentJson: { narrative: null, ...raw },
      markdown: `# Morgen-Briefing ${date}\n\nKI nicht verfügbar – ANTHROPIC_API_KEY fehlt in .env. Nur Rohdaten gespeichert.\n`,
      vaultPath: null,
    });
    return { status: "partial", briefingId: briefing?.id };
  }

  if (isAiBudgetExceeded()) {
    const briefing = createBriefing({
      date,
      status: "partial",
      contentJson: { narrative: null, ...raw },
      markdown: `# Morgen-Briefing ${date}\n\nKI-Monatsbudget erreicht. Nur Rohdaten gespeichert.\n`,
      vaultPath: null,
    });
    return { status: "partial", briefingId: briefing?.id };
  }

  try {
    const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });

    const userMessage = [
      `Watchlist: ${DEFAULT_WATCHLIST.join(", ")}`,
      `Kurse: ${prices.available ? JSON.stringify(prices.data) : `nicht verfügbar (${prices.reason})`}`,
      `Wirtschaftskalender heute/morgen: ${calendar.available ? JSON.stringify(calendar.data) : `nicht verfügbar (${calendar.reason})`}`,
      `COT-Daten: ${cot.available ? JSON.stringify(cot.data) : `nicht verfügbar (${cot.reason})`}`,
      `Merlins Risiko-Regeln aus dem Vault: ${riskRules.available ? riskRules.data : `nicht verfügbar (${riskRules.reason})`}`,
      `Offene Trading-To-dos: ${openTodos.map((t) => t.text).join("; ") || "keine"}`,
      `Social-Trends der letzten 24h (Reddit/LunarCrush/CoinGecko/Trends/YouTube, stärkster Anstieg der Erwähnungen zuerst): ${
        socialTrends.available
          ? socialTrends.data!.map((t) => `${t.topic} (Z-Score ${t.zscore.toFixed(1)}, ${t.mentions24h} Erwähnungen/24h)`).join(", ")
          : `nicht verfügbar (${socialTrends.reason})`
      }`,
      `News der letzten 18h (bereits mit Relevanz 1-5 bewertet): ${JSON.stringify(
        recentNews.map((n) => ({ title: n.title, relevance: n.relevance, category: n.category, url: n.url, assets: n.assetsJson })),
      )}`,
    ].join("\n\n");

    const response = await client.messages.create({
      model: env.ANTHROPIC_MODEL,
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      tools: [BRIEFING_TOOL],
      tool_choice: { type: "tool", name: "submit_briefing" },
      messages: [{ role: "user", content: userMessage }],
    });

    logAiUsage("briefing", env.ANTHROPIC_MODEL, response.usage.input_tokens, response.usage.output_tokens);

    const toolUse = response.content.find((b) => b.type === "tool_use");
    if (!toolUse || toolUse.type !== "tool_use") throw new Error("Claude hat kein strukturiertes Briefing zurückgegeben.");

    const narrative = toolUse.input as BriefingNarrative;
    const markdown = buildMarkdown(date, narrative, raw);
    const vaultPath = writeBriefingMarkdown(date, markdown);

    const briefing = createBriefing({
      date,
      status: "ok",
      contentJson: { narrative, ...raw },
      markdown,
      vaultPath,
    });

    broadcast({ type: "briefing:done", briefingId: briefing!.id });
    await sendNtfyPush("Morgen-Briefing fertig", narrative.lageInDreiSaetzen);

    return { status: "ok", briefingId: briefing?.id };
  } catch (err) {
    const briefing = createBriefing({
      date,
      status: "failed",
      contentJson: { narrative: null, error: (err as Error).message, ...raw },
      markdown: `# Morgen-Briefing ${date}\n\nFehler bei der Erstellung: ${(err as Error).message}\n`,
      vaultPath: null,
    });
    return { status: "failed", briefingId: briefing?.id };
  }
}
