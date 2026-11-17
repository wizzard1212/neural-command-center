import { aiUsage } from "@ncc/shared";
import { db } from "../db/client.js";
import { estimateCostUsd } from "./aiPricing.js";

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
