import { desc, eq } from "drizzle-orm";
import { predictions } from "@ncc/shared";
import { db } from "../db/client.js";

export function createPrediction(input: { text: string; asset: string | null; horizon: string | null }) {
  const result = db
    .insert(predictions)
    .values({ ...input, createdAt: new Date().toISOString(), outcome: "open" })
    .run();
  return db.select().from(predictions).where(eq(predictions.id, Number(result.lastInsertRowid))).get();
}

export function listPredictions() {
  return db.select().from(predictions).orderBy(desc(predictions.createdAt)).all();
}

export function getPrediction(id: number) {
  return db.select().from(predictions).where(eq(predictions.id, id)).get();
}

export function resolvePrediction(id: number, outcome: "hit" | "miss" | "open") {
  db.update(predictions)
    .set({ outcome, resolvedAt: outcome === "open" ? null : new Date().toISOString() })
    .where(eq(predictions.id, id))
    .run();
  return getPrediction(id);
}

export function deletePrediction(id: number) {
  db.delete(predictions).where(eq(predictions.id, id)).run();
}

/** Abschnitt 11: "Trefferquote anzeigen" – nur abgeschlossene Prognosen
 * (hit/miss) zählen, offene gehen nicht in die Quote ein. */
export function computeHitRate(): { hitRatePct: number | null; resolvedCount: number; openCount: number } {
  const all = db.select().from(predictions).all();
  const resolved = all.filter((p) => p.outcome !== "open");
  const hits = all.filter((p) => p.outcome === "hit");
  const open = all.filter((p) => p.outcome === "open");

  return {
    hitRatePct: resolved.length > 0 ? (hits.length / resolved.length) * 100 : null,
    resolvedCount: resolved.length,
    openCount: open.length,
  };
}
