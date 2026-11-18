// Duplikaterkennung für den News-Feed (SPEC.md Abschnitt 6: "Duplikate erkennen
// (gleiche URL oder Titel-Ähnlichkeit > 85 %) und zusammenfassen").

function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "") // Akzente entfernen
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function bigrams(s: string): Set<string> {
  const set = new Set<string>();
  for (let i = 0; i < s.length - 1; i++) set.add(s.slice(i, i + 2));
  return set;
}

/** Sørensen-Dice-Koeffizient über Zeichen-Bigramme, 0 (komplett verschieden) bis 1 (identisch). */
export function titleSimilarity(a: string, b: string): number {
  const na = normalizeTitle(a);
  const nb = normalizeTitle(b);
  if (na === nb) return 1;
  if (na.length < 2 || nb.length < 2) return na === nb ? 1 : 0;

  const bigramsA = bigrams(na);
  const bigramsB = bigrams(nb);
  let overlap = 0;
  for (const bg of bigramsA) if (bigramsB.has(bg)) overlap++;

  return (2 * overlap) / (bigramsA.size + bigramsB.size);
}

const SIMILARITY_THRESHOLD = 0.85;

export interface ExistingItem {
  id: number;
  url: string;
  title: string;
  clusterId: string | null;
}

export interface DuplicateMatch {
  existing: ExistingItem;
  reason: "url" | "title";
}

/** Findet die zuerst passende bestehende Meldung (gleiche URL oder sehr ähnlicher
 * Titel), um einen neuen Artikel demselben Cluster zuzuordnen statt ihn doppelt
 * anzulegen. */
export function findDuplicate(candidate: { url: string; title: string }, existing: ExistingItem[]): DuplicateMatch | null {
  for (const item of existing) {
    if (item.url === candidate.url) return { existing: item, reason: "url" };
  }
  for (const item of existing) {
    if (titleSimilarity(candidate.title, item.title) > SIMILARITY_THRESHOLD) {
      return { existing: item, reason: "title" };
    }
  }
  return null;
}

export interface ClusterableItem {
  id: number;
  clusterId: string | null;
  source: string;
  relevance: number | null;
  publishedAt: string;
}

export interface ClusterGroup<T extends ClusterableItem> {
  representative: T;
  sourceCount: number;
  sources: string[];
}

/**
 * Fasst als Duplikate erkannte Meldungen zu einer Anzeige-Gruppe zusammen
 * ("3 Quellen berichten", Abschnitt 6). Gruppenschlüssel ist clusterId, oder
 * die eigene id für Meldungen ohne Duplikate. Repräsentant ist die Meldung
 * mit der höchsten Relevanz (KI-bewertet), sonst die zuerst veröffentlichte.
 */
export function groupByCluster<T extends ClusterableItem>(items: T[]): ClusterGroup<T>[] {
  const groups = new Map<string, T[]>();
  for (const item of items) {
    const key = item.clusterId ?? String(item.id);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(item);
  }

  return [...groups.values()].map((group) => {
    const sorted = [...group].sort((a, b) => {
      if (a.relevance !== b.relevance) return (b.relevance ?? -1) - (a.relevance ?? -1);
      return a.publishedAt.localeCompare(b.publishedAt);
    });
    return {
      representative: sorted[0],
      sourceCount: group.length,
      sources: [...new Set(group.map((g) => g.source))],
    };
  });
}
