import { mkdirSync, writeFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import matter from "gray-matter";
import { env } from "../lib/env.js";
import { logAiUsage, isAiBudgetExceeded } from "../lib/aiUsageRepo.js";
import { sendNtfyPush } from "../lib/ntfy.js";
import { listTrades } from "./repo.js";
import { computeWeekStats, weekLabel, weekRange, type WeekTradeLike } from "./weeklyReviewStats.js";
import { generateWeeklyReviewNarrative, type WeeklyReviewNarrative } from "./weeklyReviewAi.js";
import { createReview } from "./reviewRepo.js";

function buildMarkdown(label: string, stats: ReturnType<typeof computeWeekStats>, narrative: WeeklyReviewNarrative | null): string {
  const lines = [`# Wochen-Review ${label}`, ""];
  lines.push(
    "## Zahlen",
    `- Geschlossene Trades: ${stats.tradeCount}`,
    `- Winrate: ${stats.winRatePct !== null ? stats.winRatePct.toFixed(0) + " %" : "–"}`,
    `- Profit-Faktor: ${stats.profitFactor !== null ? stats.profitFactor.toFixed(2) : "–"}`,
    `- Durchschnitts-R: ${stats.averageR !== null ? stats.averageR.toFixed(2) : "–"}`,
    `- Max-Drawdown: ${stats.maxDrawdownR !== null ? stats.maxDrawdownR.toFixed(2) + "R" : "–"}`,
    `- Längste Gewinnserie: ${stats.longestWinStreak}, längste Verlustserie: ${stats.longestLossStreak}`,
    `- Gesamtergebnis: ${stats.totalResultR.toFixed(2)}R / ${stats.totalResultUsd.toFixed(0)} $`,
    `- Regelbrüche: ${stats.ruleBreaches}`,
    "",
  );

  if (narrative) {
    lines.push("## Zusammenfassung", narrative.zusammenfassungDe, "");
    lines.push("## Muster", ...narrative.muster.map((m) => `- ${m}`), "");
    lines.push("## Regelbrüche", ...(narrative.regelbrueche.length > 0 ? narrative.regelbrueche.map((r) => `- ${r}`) : ["Keine."]), "");
    lines.push("## 3 Verbesserungen für nächste Woche", ...narrative.verbesserungen.map((v, i) => `${i + 1}. ${v}`), "");
  } else {
    lines.push("KI-Fließtext nicht verfügbar – nur Kennzahlen gespeichert.", "");
  }

  return lines.join("\n");
}

function writeReviewMarkdown(label: string, markdown: string): string | null {
  if (!env.VAULT_PATH || !existsSync(env.VAULT_PATH)) return null;
  const dir = `${env.VAULT_WRITE_DIR}/Reviews`;
  const absoluteDir = resolve(env.VAULT_PATH, dir);
  mkdirSync(absoluteDir, { recursive: true });
  const fileName = `${label}.md`;
  const content = matter.stringify(markdown, { tags: ["review", "trading"] });
  writeFileSync(resolve(absoluteDir, fileName), content, "utf-8");
  return `${dir}/${fileName}`;
}

/** Abschnitt 9.3: "Wochen-Review automatisch (Sonntag 18:00)". `forDate`
 * bestimmt, welche Kalenderwoche zusammengefasst wird (Default: die
 * laufende Woche bis jetzt, für manuelles Auslösen vor Sonntagabend). */
export async function generateWeeklyReview(forDate: Date = new Date()): Promise<{ status: "ok" | "partial"; reviewId?: number }> {
  const label = weekLabel(forDate);
  const { from, to } = weekRange(forDate);

  const allTrades = listTrades() as unknown as (WeekTradeLike & { closedAt: string | null })[];
  const weekTrades = allTrades.filter((t) => t.closedAt && t.closedAt >= from && t.closedAt <= to);
  const stats = computeWeekStats(weekTrades);

  if (!env.ANTHROPIC_API_KEY || isAiBudgetExceeded()) {
    const markdown = buildMarkdown(label, stats, null);
    const vaultPath = writeReviewMarkdown(label, markdown);
    const review = createReview({ week: label, contentJson: { narrative: null, stats }, vaultPath });
    return { status: "partial", reviewId: review?.id };
  }

  try {
    const tradeNotes = weekTrades.map((t) => ({
      instrument: t.instrument,
      setupTypes: t.setupTypesJson ?? [],
      resultR: t.resultR,
      followedPlan: t.followedPlan,
      lesson: t.lesson,
    }));
    const { narrative, usage } = await generateWeeklyReviewNarrative(stats, tradeNotes);
    logAiUsage("weekly_review", env.ANTHROPIC_MODEL, usage.inputTokens, usage.outputTokens);

    const markdown = buildMarkdown(label, stats, narrative);
    const vaultPath = writeReviewMarkdown(label, markdown);
    const review = createReview({ week: label, contentJson: { narrative, stats }, vaultPath });

    await sendNtfyPush("Wochen-Review fertig", narrative.zusammenfassungDe);
    return { status: "ok", reviewId: review?.id };
  } catch (err) {
    const markdown = buildMarkdown(label, stats, null);
    const vaultPath = writeReviewMarkdown(label, markdown);
    const review = createReview({ week: label, contentJson: { narrative: null, stats, error: (err as Error).message }, vaultPath });
    return { status: "partial", reviewId: review?.id };
  }
}
