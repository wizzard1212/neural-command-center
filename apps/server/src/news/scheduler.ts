import cron from "node-cron";
import type { FastifyBaseLogger } from "fastify";
import { loadFeeds } from "./feedsConfig.js";
import { fetchAllFeeds } from "./rssFetcher.js";
import { findDuplicate } from "./dedupe.js";
import * as repo from "./repo.js";
import { evaluateNewsBatch } from "./aiEvaluate.js";
import { logAiUsage, isAiBudgetExceeded } from "../lib/aiUsageRepo.js";
import { env } from "../lib/env.js";
import { broadcast } from "../ws.js";

let logger: FastifyBaseLogger | Console = console;

/** Holt neue Artikel, erkennt Duplikate und speichert sie. Gibt die Anzahl
 * tatsächlich neu gespeicherter (nicht als Duplikat erkannter) Artikel zurück. */
export async function fetchAndStoreNews(): Promise<number> {
  const feeds = loadFeeds();
  const rawItems = await fetchAllFeeds(feeds);
  const existing = repo.listRecentForDedupe();

  let newCount = 0;
  for (const raw of rawItems) {
    const match = findDuplicate(raw, existing);
    if (match) {
      // Bereits bekannt (gleiche URL oder sehr ähnlicher Titel) – als Duplikat
      // demselben Cluster zuordnen statt erneut einzufügen (Abschnitt 6).
      continue;
    }
    const id = repo.insertNewsItem(raw, null);
    existing.push({ id, url: raw.url, title: raw.title, clusterId: null });
    newCount++;
  }

  return newCount;
}

/** Bewertet unbewertete Artikel im Batch über Claude (Abschnitt 6.2). Bricht
 * sauber ab, wenn kein API-Schlüssel hinterlegt oder das Monatsbudget
 * aufgebraucht ist – das ist kein Fehler, sondern der normale Fall ohne Key. */
export async function evaluateUnscoredNews(): Promise<number> {
  if (!env.ANTHROPIC_API_KEY) return 0;
  if (isAiBudgetExceeded()) {
    logger.warn?.("KI-Monatsbudget erreicht – News-Bewertung wird übersprungen.");
    return 0;
  }

  const unscored = repo.listUnevaluated(20);
  if (unscored.length === 0) return 0;

  try {
    const { evaluations, usage } = await evaluateNewsBatch(
      unscored.map((n) => ({ id: n.id, title: n.title, source: n.source })),
    );
    logAiUsage("news_evaluation", env.ANTHROPIC_MODEL_FAST, usage.inputTokens, usage.outputTokens);

    for (const evaluation of evaluations) {
      repo.updateEvaluation(evaluation.id, {
        relevance: evaluation.relevance,
        category: evaluation.category,
        summaryDe: evaluation.summaryDe,
        assetsJson: evaluation.assets,
        directionJson: evaluation.direction,
      });

      if (evaluation.relevance >= 5) {
        broadcast({ type: "news:new", newsItemId: evaluation.id, relevance: evaluation.relevance });
      }
    }
    return evaluations.length;
  } catch (err) {
    logger.error?.({ err }, "News-Bewertung fehlgeschlagen");
    return 0;
  }
}

export async function runNewsCycle() {
  try {
    const newCount = await fetchAndStoreNews();
    logger.info?.(`News-Feed: ${newCount} neue Artikel abgerufen.`);
    const evaluated = await evaluateUnscoredNews();
    if (evaluated > 0) logger.info?.(`News-Feed: ${evaluated} Artikel bewertet.`);
  } catch (err) {
    logger.error?.({ err }, "News-Zyklus fehlgeschlagen");
  }
}

export function startNewsScheduler(appLogger: FastifyBaseLogger) {
  logger = appLogger;
  // Abschnitt 6: RSS alle 2-5 Minuten abrufen, Bewertung alle 5 Minuten im Batch.
  cron.schedule("*/5 * * * *", () => void runNewsCycle(), { timezone: env.TZ });
  void runNewsCycle();
}
