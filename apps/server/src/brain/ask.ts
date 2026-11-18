import Anthropic from "@anthropic-ai/sdk";
import { env } from "../lib/env.js";
import { searchVault, type NoteMatch } from "./search.js";
import { listAccounts, listSnapshots } from "../accounts/repo.js";
import { computeAccountSummary, type AccountRuleConfig } from "../accounts/summary.js";
import { listTrades } from "../journal/repo.js";
import { getLatestBriefing } from "../briefing/repo.js";

const SYSTEM_PROMPT =
  "Du bist 'Frag dein Gehirn', Merlins persönlicher Assistent für sein Trading-Dashboard und seinen " +
  "Obsidian-Vault. Antworte auf Deutsch, direkt und knapp. Nutze ausschließlich die gelieferten Notiz-" +
  "Auszüge und Dashboard-Daten. Wenn die Antwort darin nicht steht, sag das ehrlich ('Dazu finde ich nichts " +
  "in deinem Vault/Dashboard') statt zu raten oder Zahlen zu erfinden. Gib bei Vault-Inhalten an, aus welcher " +
  "Notiz die Information stammt.";

function toRuleConfig(account: ReturnType<typeof listAccounts>[number]): AccountRuleConfig {
  return {
    startBalance: account.startBalance,
    dailyLossPct: account.dailyLossPct,
    dailyLossMode: account.dailyLossMode as AccountRuleConfig["dailyLossMode"],
    maxLossPct: account.maxLossPct,
    maxLossMode: account.maxLossMode as AccountRuleConfig["maxLossMode"],
    profitTargetPct: account.profitTargetPct,
    consistencyPct: account.consistencyPct,
    minTradingDays: account.minTradingDays,
    minProfitableDays: account.minProfitableDays,
    inactivityDays: account.inactivityDays,
  };
}

function buildDashboardContext(): string {
  const accounts = listAccounts().filter((a) => a.phase !== "lost");
  const accountLines = accounts.map((a) => {
    const snapshots = listSnapshots(a.id);
    const summary = computeAccountSummary(toRuleConfig(a), snapshots, new Date(), snapshots.at(-1)?.ts ? new Date(snapshots.at(-1)!.ts) : null);
    return `${a.firm} ${a.program}: Equity ${summary.latestEquity.toFixed(0)} $, Tages-P&L ${summary.todayPnl.toFixed(0)} $, Ampel ${summary.overallLight.color}.`;
  });

  const since30d = new Date(Date.now() - 30 * 86_400_000).toISOString();
  const recentTrades = listTrades()
    .filter((t) => t.closedAt && t.closedAt >= since30d)
    .map((t) => ({
      instrument: t.instrument,
      closedAt: t.closedAt,
      resultR: t.resultR,
      followedPlan: t.followedPlan,
      setupTypes: t.setupTypesJson,
      lesson: t.lesson,
      ruleChecks: t.ruleChecksJson,
    }));

  const latestBriefing = getLatestBriefing();
  const briefingLine = latestBriefing?.contentJson
    ? `Letztes Morgen-Briefing (${latestBriefing.date}): ${
        (latestBriefing.contentJson as { narrative?: { lageInDreiSaetzen?: string } }).narrative?.lageInDreiSaetzen ??
        "kein KI-Fließtext verfügbar"
      }`
    : "Noch kein Morgen-Briefing erstellt.";

  return [
    "## Konten", accountLines.join("\n") || "Keine aktiven Konten.",
    "## Trades der letzten 30 Tage (geschlossen)", JSON.stringify(recentTrades),
    "## Briefing", briefingLine,
  ].join("\n\n");
}

export interface AskBrainResult {
  answer: string;
  sources: { path: string; title: string }[];
  usage: { inputTokens: number; outputTokens: number };
}

export async function askBrain(question: string): Promise<AskBrainResult> {
  if (!env.ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY fehlt – Frag-dein-Gehirn ist nicht verfügbar.");

  const matches: NoteMatch[] = searchVault(question, 5);
  const vaultContext = matches.length > 0
    ? matches.map((m) => `### ${m.title} (${m.path})\n${m.excerpt}`).join("\n\n")
    : "Keine passenden Vault-Notizen gefunden.";

  const dashboardContext = buildDashboardContext();

  const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
  const response = await client.messages.create({
    model: env.ANTHROPIC_MODEL,
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: `# Relevante Vault-Notizen\n\n${vaultContext}\n\n# Dashboard-Daten\n\n${dashboardContext}\n\n# Frage\n\n${question}`,
      },
    ],
  });

  const text = response.content.find((b) => b.type === "text");
  return {
    answer: text && text.type === "text" ? text.text : "",
    sources: matches.map((m) => ({ path: m.path, title: m.title })),
    usage: { inputTokens: response.usage.input_tokens, outputTokens: response.usage.output_tokens },
  };
}
