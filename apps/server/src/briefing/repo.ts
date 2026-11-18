import { desc, eq } from "drizzle-orm";
import { briefings } from "@ncc/shared";
import { db } from "../db/client.js";

export function createBriefing(input: {
  date: string;
  status: "pending" | "ok" | "partial" | "failed";
  contentJson: Record<string, unknown>;
  markdown: string;
  vaultPath: string | null;
}) {
  const result = db
    .insert(briefings)
    .values({ ...input, createdAt: new Date().toISOString() })
    .run();
  return db.select().from(briefings).where(eq(briefings.id, Number(result.lastInsertRowid))).get();
}

// Mehrere Briefings können dasselbe "date" teilen (Button "Briefing jetzt
// erstellen" mehrfach am selben Tag) – createdAt sortiert eindeutig, date
// allein tut es nicht (SQLite-Reihenfolge bei Gleichstand ist nicht
// garantiert und hätte sonst scheinbar "alte" Daten zurückgeliefert).
export function getLatestBriefing() {
  return db.select().from(briefings).orderBy(desc(briefings.date), desc(briefings.createdAt)).limit(1).get();
}

export function getBriefingByDate(date: string) {
  return db
    .select()
    .from(briefings)
    .where(eq(briefings.date, date))
    .orderBy(desc(briefings.createdAt))
    .limit(1)
    .get();
}

export function listBriefings(limit = 30) {
  return db.select().from(briefings).orderBy(desc(briefings.date), desc(briefings.createdAt)).limit(limit).all();
}
