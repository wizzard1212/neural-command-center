import { mkdirSync, writeFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import matter from "gray-matter";
import { env } from "../lib/env.js";

function sanitizeFilename(name: string): string {
  return name.replace(/[\\/:*?"<>|]/g, "-").slice(0, 120);
}

/** Speichert eine Content-Idee als Markdown-Notiz in Vault/Dashboard/Content-Ideen
 * (Abschnitt 6: Brücke zum News-Kanal). Gibt den vault-relativen Pfad zurück,
 * oder null, wenn kein Vault verbunden ist. */
export function writeContentIdeaMarkdown(input: {
  idea: string;
  hookDe?: string | null;
  hookEn?: string | null;
  sourceUrl?: string;
}): string | null {
  if (!env.VAULT_PATH || !existsSync(env.VAULT_PATH)) return null;

  const dateStr = new Date().toISOString().slice(0, 10);
  const vaultRelativeDir = `${env.VAULT_WRITE_DIR}/Content-Ideen`;
  const absoluteDir = resolve(env.VAULT_PATH, vaultRelativeDir);
  mkdirSync(absoluteDir, { recursive: true });

  const fileName = sanitizeFilename(`${dateStr} ${input.idea}.md`) || `${dateStr} Content-Idee.md`;

  const lines = [`# ${input.idea}`, ""];
  if (input.hookDe) lines.push("## Hook (DE)", input.hookDe, "");
  if (input.hookEn) lines.push("## Hook (EN)", input.hookEn, "");
  if (input.sourceUrl) lines.push("## Quelle", input.sourceUrl, "");

  const content = matter.stringify(lines.join("\n"), { tags: ["content-idee"] });
  writeFileSync(resolve(absoluteDir, fileName), content, "utf-8");

  return `${vaultRelativeDir}/${fileName}`;
}
