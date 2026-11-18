import cron from "node-cron";
import type { FastifyBaseLogger } from "fastify";
import { ALL_SOCIAL_SOURCES } from "./sources/index.js";
import * as repo from "./repo.js";
import { computeZScore } from "./hypeRadar.js";
import { env } from "../lib/env.js";

export interface SourceStatus {
  status: "connected" | "error" | "disconnected";
  lastCheckedAt: string;
  itemsFound?: number;
  message?: string;
  experimental?: boolean;
}

const sourceStatuses = new Map<string, SourceStatus>();

export function getSocialSourceStatuses(): Record<string, SourceStatus & { id: string; label: string }> {
  const out: Record<string, SourceStatus & { id: string; label: string }> = {};
  for (const source of ALL_SOCIAL_SOURCES) {
    const status = sourceStatuses.get(source.id);
    out[source.id] = status
      ? { ...status, id: source.id, label: source.label }
      : {
          id: source.id,
          label: source.label,
          status: "disconnected",
          lastCheckedAt: new Date(0).toISOString(),
          message: source.configured() ? "Noch nicht abgerufen." : "Nicht konfiguriert.",
        };
  }
  return out;
}

let logger: FastifyBaseLogger | Console = console;

/** Ruft alle Social-Quellen ab und speichert neue Items. Jede Quelle einzeln
 * fehlertolerant (Abschnitt 7: eine kaputte Quelle darf die anderen nie
 * blockieren), danach werden die Hype-Radar-Snapshots neu berechnet. */
export async function runSocialCycle(): Promise<number> {
  let totalNew = 0;

  for (const source of ALL_SOCIAL_SOURCES) {
    const checkedAt = new Date().toISOString();
    try {
      const result = await source.fetch();
      let newCount = 0;
      for (const item of result.items) {
        if (repo.upsertSocialItem(item)) newCount++;
      }
      totalNew += newCount;
      sourceStatuses.set(source.id, {
        status: result.available ? "connected" : "disconnected",
        lastCheckedAt: checkedAt,
        itemsFound: newCount,
        message: result.reason,
        experimental: result.experimental,
      });
    } catch (err) {
      sourceStatuses.set(source.id, {
        status: "error",
        lastCheckedAt: checkedAt,
        message: (err as Error).message,
      });
      logger.error?.({ err, source: source.id }, "Social-Quelle fehlgeschlagen");
    }
  }

  recomputeHypeRadar();
  return totalNew;
}

/** Zählt Erwähnungen je Topic der letzten 24h, vergleicht mit dem 7-Tage-
 * Schnitt (Z-Score) und schreibt einen neuen Snapshot pro Topic. */
function recomputeHypeRadar() {
  const mentionsByTopic = repo.countMentionsByTopic(24);
  for (const [topic, mentions24h] of mentionsByTopic) {
    const history = repo.getTopicHistory(topic, 7);
    const { zscore, avg7d } = computeZScore(mentions24h, history);
    repo.insertTrendTopicSnapshot({
      topic,
      platform: "aggregate",
      mentions24h,
      mentionsAvg7d: avg7d,
      zscore,
    });
  }
}

export function startSocialScheduler(appLogger: FastifyBaseLogger) {
  logger = appLogger;
  // Kein fester Vorgabewert in SPEC.md für Social – 15 Minuten balanciert
  // Aktualität gegen Rate-Limits von Reddit/YouTube/Google Trends.
  cron.schedule("*/15 * * * *", () => void runSocialCycle(), { timezone: env.TZ });
  void runSocialCycle();
}
