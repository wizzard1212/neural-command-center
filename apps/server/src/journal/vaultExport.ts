import { mkdirSync, writeFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import matter from "gray-matter";
import { env } from "../lib/env.js";
import { SCREENSHOTS_DIR } from "./screenshots.js";
import type { trades, tradeImages } from "@ncc/shared";

type Trade = typeof trades.$inferSelect;
type TradeImage = typeof tradeImages.$inferSelect;

function sanitizeFilename(name: string): string {
  return name.replace(/[\\/:*?"<>|]/g, "-");
}

const KIND_LABELS: Record<string, string> = {
  before: "Vorher",
  after: "Nachher",
  htf: "HTF",
  ltf: "LTF",
};

/**
 * Schreibt den Trade als Markdown-Notiz in Vault/Dashboard/Trades (Abschnitt
 * 9.1), damit er im Gehirn als neuer Knoten auftaucht. Screenshots liegen
 * bewusst außerhalb des Vaults unter data/screenshots/ (Abschnitt 2) und
 * werden per file://-Link eingebunden statt per Obsidian-Embed.
 * Gibt den vault-relativen Pfad zurück, oder null, wenn kein Vault verbunden ist.
 */
export function writeTradeMarkdown(trade: Trade, images: TradeImage[]): string | null {
  if (!env.VAULT_PATH || !existsSync(env.VAULT_PATH)) return null;

  const dateStr = (trade.openedAt ?? trade.createdAt).slice(0, 10);
  const dirName = sanitizeFilename("Trades");
  const fileName = sanitizeFilename(`${dateStr} ${trade.instrument} ${trade.direction === "long" ? "Long" : "Short"}.md`);
  const vaultRelativeDir = `${env.VAULT_WRITE_DIR}/${dirName}`;
  const absoluteDir = resolve(env.VAULT_PATH, vaultRelativeDir);
  mkdirSync(absoluteDir, { recursive: true });

  const setupTypes = (trade.setupTypesJson as string[] | null) ?? [];
  const ruleChecks = (trade.ruleChecksJson as Record<string, boolean> | null) ?? {};
  const emotionTags = (trade.emotionTagsJson as string[] | null) ?? [];

  const lines: string[] = [];
  lines.push(`# ${trade.instrument} ${trade.direction === "long" ? "Long" : "Short"} – ${dateStr}`);
  lines.push("");
  lines.push(`- **Status:** ${trade.status}`);
  if (trade.session) lines.push(`- **Session:** ${trade.session}`);
  if (trade.entry !== null) lines.push(`- **Entry:** ${trade.entry}`);
  if (trade.sl !== null) lines.push(`- **Stop Loss:** ${trade.sl}`);
  for (const [i, tp] of [trade.tp1, trade.tp2, trade.tp3].entries()) {
    if (tp !== null && tp !== undefined) lines.push(`- **TP${i + 1}:** ${tp}`);
  }
  if (trade.size !== null) lines.push(`- **Größe:** ${trade.size}`);
  if (trade.riskPct !== null) lines.push(`- **Risiko:** ${trade.riskPct.toFixed(2)}% (${trade.riskUsd?.toFixed(2)} $)`);
  if (trade.rrPlanned !== null) lines.push(`- **R:R geplant:** ${trade.rrPlanned.toFixed(2)}`);
  if (trade.resultR !== null) lines.push(`- **Ergebnis:** ${trade.resultR.toFixed(2)}R (${trade.resultUsd?.toFixed(2)} $)`);
  if (setupTypes.length > 0) lines.push(`- **Setup:** ${setupTypes.join(", ")}`);
  if (trade.followedPlan !== null) lines.push(`- **Nach Plan gehandelt:** ${trade.followedPlan ? "Ja" : "Nein"}`);
  if (emotionTags.length > 0) lines.push(`- **Emotion:** ${emotionTags.join(", ")}`);

  const checkedRules = Object.entries(ruleChecks);
  if (checkedRules.length > 0) {
    lines.push("");
    lines.push("## Regel-Check");
    for (const [rule, checked] of checkedRules) {
      lines.push(`- [${checked ? "x" : " "}] ${rule}`);
    }
  }

  if (trade.reasoning) {
    lines.push("");
    lines.push("## Begründung");
    lines.push(trade.reasoning);
  }

  if (trade.lesson) {
    lines.push("");
    lines.push("## Lektion");
    lines.push(trade.lesson);
  }

  if (images.length > 0) {
    lines.push("");
    lines.push("## Screenshots");
    for (const img of images) {
      const absoluteImgPath = resolve(SCREENSHOTS_DIR, img.path);
      const fileUrl = pathToFileURL(absoluteImgPath).href;
      lines.push(`![${KIND_LABELS[img.kind] ?? img.kind}](${fileUrl})`);
    }
  }

  const content = matter.stringify(lines.join("\n") + "\n", {
    tags: ["trade", "trading"],
    instrument: trade.instrument,
    status: trade.status,
  });

  writeFileSync(resolve(absoluteDir, fileName), content, "utf-8");

  return `${vaultRelativeDir}/${fileName}`;
}
