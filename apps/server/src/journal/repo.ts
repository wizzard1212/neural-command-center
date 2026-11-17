import { eq, desc } from "drizzle-orm";
import { trades, tradeImages } from "@ncc/shared";
import { db } from "../db/client.js";

type NewTrade = typeof trades.$inferInsert;
type TradePatch = Partial<Omit<NewTrade, "id" | "createdAt">>;

export function listTrades() {
  return db.select().from(trades).orderBy(desc(trades.openedAt)).all();
}

export function getTrade(id: number) {
  return db.select().from(trades).where(eq(trades.id, id)).get();
}

export function createTrade(input: Omit<NewTrade, "id" | "createdAt" | "updatedAt">) {
  const now = new Date().toISOString();
  const result = db
    .insert(trades)
    .values({ ...input, createdAt: now, updatedAt: now })
    .run();
  return getTrade(Number(result.lastInsertRowid));
}

export function updateTrade(id: number, patch: TradePatch) {
  db.update(trades)
    .set({ ...patch, updatedAt: new Date().toISOString() })
    .where(eq(trades.id, id))
    .run();
  return getTrade(id);
}

export function deleteTrade(id: number) {
  db.delete(tradeImages).where(eq(tradeImages.tradeId, id)).run();
  db.delete(trades).where(eq(trades.id, id)).run();
}

export function addTradeImage(input: {
  tradeId: number;
  path: string;
  kind: "before" | "after" | "htf" | "ltf";
  aiExtractJson?: Record<string, unknown>;
}) {
  const result = db.insert(tradeImages).values(input).run();
  return db.select().from(tradeImages).where(eq(tradeImages.id, Number(result.lastInsertRowid))).get();
}

export function listTradeImages(tradeId: number) {
  return db.select().from(tradeImages).where(eq(tradeImages.tradeId, tradeId)).all();
}

export function deleteTradeImage(id: number) {
  db.delete(tradeImages).where(eq(tradeImages.id, id)).run();
}
