import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import matter from "gray-matter";
import { vaultNotes } from "@ncc/shared";
import { db } from "../db/client.js";
import { env } from "../lib/env.js";

export interface NoteMatch {
  path: string;
  title: string;
  excerpt: string;
  score: number;
}

const STOPWORDS = new Set([
  "der", "die", "das", "und", "oder", "ist", "war", "ein", "eine", "im", "in", "zu", "von", "auf", "für",
  "mit", "was", "wie", "wann", "wer", "wo", "meine", "meinen", "meiner", "mein", "ich", "du", "sie", "es",
  "the", "and", "or", "is", "was", "a", "an", "in", "to", "of", "for", "with", "what", "how",
]);

export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOPWORDS.has(w));
}

/** Einfache Volltextsuche über den Vault (Abschnitt 11: "Frag dein Gehirn":
 * "einfache Volltextsuche oder Embeddings in SQLite"). Liest die Notizen bei
 * jeder Anfrage frisch von der Platte – bei den üblichen Vault-Größen (zig
 * bis wenige hundert Notizen) ist das schnell genug und immer aktuell, ohne
 * einen separaten Suchindex pflegen zu müssen. */
export function searchVault(query: string, limit = 5): NoteMatch[] {
  if (!env.VAULT_PATH || !existsSync(env.VAULT_PATH)) return [];

  const queryTokens = tokenize(query);
  if (queryTokens.length === 0) return [];

  const notes = db.select().from(vaultNotes).all();
  const matches: NoteMatch[] = [];

  for (const note of notes) {
    let content: string;
    try {
      const raw = readFileSync(resolve(env.VAULT_PATH, note.path), "utf-8");
      content = matter(raw).content;
    } catch {
      continue; // Datei seit Index-Aktualisierung verschoben/gelöscht
    }

    const titleTokens = tokenize(note.title);
    const bodyLower = content.toLowerCase();

    let score = 0;
    for (const token of queryTokens) {
      if (titleTokens.includes(token)) score += 5;
      const bodyMatches = bodyLower.split(token).length - 1;
      score += bodyMatches;
    }
    if (score === 0) continue;

    // Excerpt um die erste Fundstelle herum, statt immer vom Dateianfang.
    const firstHitIdx = Math.max(0, bodyLower.indexOf(queryTokens[0]));
    const start = Math.max(0, firstHitIdx - 200);
    const excerpt = content.slice(start, start + 1200).trim();

    matches.push({ path: note.path, title: note.title, excerpt, score });
  }

  return matches.sort((a, b) => b.score - a.score).slice(0, limit);
}
