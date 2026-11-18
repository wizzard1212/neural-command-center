import { desc, eq } from "drizzle-orm";
import { reviews } from "@ncc/shared";
import { db } from "../db/client.js";

export function createReview(input: { week: string; contentJson: Record<string, unknown>; vaultPath: string | null }) {
  const result = db
    .insert(reviews)
    .values({ ...input, createdAt: new Date().toISOString() })
    .run();
  return db.select().from(reviews).where(eq(reviews.id, Number(result.lastInsertRowid))).get();
}

export function getReviewByWeek(week: string) {
  return db.select().from(reviews).where(eq(reviews.week, week)).orderBy(desc(reviews.createdAt)).limit(1).get();
}

export function listReviews(limit = 20) {
  return db.select().from(reviews).orderBy(desc(reviews.createdAt)).limit(limit).all();
}
