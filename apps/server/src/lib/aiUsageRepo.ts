import { gte } from "drizzle-orm";
import { aiUsage } from "@ncc/shared";
import { db } from "../db/client.js";
import { estimateCostUsd } from "./aiPricing.js";
import { env } from "./env.js";

export function logAiUsage(purpose: string, model: string, inputTokens: number, outputTokens: number) {
  db.insert(aiUsage)
    .values({
      ts: new Date().toISOString(),
      purpose,
      model,
      inputTokens,
      outputTokens,
      estCostUsd: estimateCostUsd(model, inputTokens, outputTokens),
    })
    .run();
}

export function getMonthToDateCostUsd(): number {
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);
  const rows = db.select().from(aiUsage).where(gte(aiUsage.ts, startOfMonth.toISOString())).all();
  return rows.reduce((sum, r) => sum + r.estCostUsd, 0);
}

/** Abschnitt 14: "...stoppt automatische Läufe bei 100%" des Monatsbudgets. */
export function isAiBudgetExceeded(): boolean {
  return getMonthToDateCostUsd() >= env.AI_MONTHLY_BUDGET_USD;
}
