import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { like, eq, and, gt } from "drizzle-orm";
import { vaultNotes } from "@ncc/shared";
import { db } from "../db/client.js";
import { env } from "../lib/env.js";
import type { CollectResult } from "./priceCollector.js";

/** Liest den Abschnitt "Risiko-Regeln" aus Merlins eigener Plan-Notiz
 * (Abschnitt 5.2: "Trading/Trading - Prop-Firm-Plan.md"). Der genaue
 * Ordnername kann abweichen (z. B. "01 Trading"), deshalb wird die Notiz
 * über den Dateinamen im Vault-Index gesucht statt über einen festen Pfad. */
export function collectRiskRulesFromVault(): CollectResult<string> {
  if (!env.VAULT_PATH || !existsSync(env.VAULT_PATH)) {
    return { available: false, data: null, reason: "Kein Vault verbunden." };
  }

  const note = db
    .select()
    .from(vaultNotes)
    .where(like(vaultNotes.path, "%Trading - Prop-Firm-Plan.md"))
    .get();

  if (!note) {
    return { available: false, data: null, reason: 'Notiz "Trading - Prop-Firm-Plan.md" nicht im Vault gefunden.' };
  }

  try {
    const content = readFileSync(resolve(env.VAULT_PATH, note.path), "utf-8");
    const match = /##\s*Risiko-Regeln\s*\n([\s\S]*?)(\n##\s|\n#\s|$)/i.exec(content);
    if (!match) {
      return { available: false, data: null, reason: 'Kein Abschnitt "## Risiko-Regeln" in der Plan-Notiz gefunden.' };
    }
    return { available: true, data: match[1].trim() };
  } catch (err) {
    return { available: false, data: null, reason: (err as Error).message };
  }
}

export interface OpenTradingTodo {
  notePath: string;
  noteTitle: string;
  text: string;
}

/** Offene To-dos aus Trading-Notizen (Abschnitt 5.2). Liest nur Notizen neu
 * ein, die der Vault-Index bereits als "hat offene To-dos" kennt. */
export function collectOpenTradingTodos(limit = 10): OpenTradingTodo[] {
  if (!env.VAULT_PATH || !existsSync(env.VAULT_PATH)) return [];

  const notes = db
    .select()
    .from(vaultNotes)
    .where(and(eq(vaultNotes.area, "trading"), gt(vaultNotes.todosOpen, 0)))
    .all();

  const todos: OpenTradingTodo[] = [];
  for (const note of notes) {
    if (todos.length >= limit) break;
    try {
      const content = readFileSync(resolve(env.VAULT_PATH, note.path), "utf-8");
      const lines = content.match(/^\s*[-*]\s\[\s\]\s.+$/gm) ?? [];
      for (const line of lines) {
        if (todos.length >= limit) break;
        todos.push({ notePath: note.path, noteTitle: note.title, text: line.replace(/^\s*[-*]\s\[\s\]\s/, "").trim() });
      }
    } catch {
      // Datei evtl. seit Index-Aktualisierung verschoben/gelöscht – überspringen.
    }
  }
  return todos;
}
