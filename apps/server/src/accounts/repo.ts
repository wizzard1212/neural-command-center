import { eq, desc, isNull } from "drizzle-orm";
import { accounts, accountSnapshots, accountEvents, payouts, goals } from "@ncc/shared";
import { db, sqlite } from "../db/client.js";

type NewAccount = typeof accounts.$inferInsert;
type AccountPatch = Partial<Omit<NewAccount, "id" | "createdAt">>;

export function listAccounts() {
  return db.select().from(accounts).all();
}

export function getAccount(id: number) {
  return db.select().from(accounts).where(eq(accounts.id, id)).get();
}

export function createAccount(input: Omit<NewAccount, "id" | "createdAt" | "updatedAt">) {
  const now = new Date().toISOString();
  const result = db
    .insert(accounts)
    .values({ ...input, createdAt: now, updatedAt: now })
    .run();
  return getAccount(Number(result.lastInsertRowid));
}

export function updateAccount(id: number, patch: AccountPatch) {
  db.update(accounts)
    .set({ ...patch, updatedAt: new Date().toISOString() })
    .where(eq(accounts.id, id))
    .run();
  return getAccount(id);
}

export function deleteAccount(id: number) {
  const tx = sqlite.transaction(() => {
    db.delete(accountSnapshots).where(eq(accountSnapshots.accountId, id)).run();
    db.delete(accountEvents).where(eq(accountEvents.accountId, id)).run();
    db.delete(payouts).where(eq(payouts.accountId, id)).run();
    db.delete(goals).where(eq(goals.accountId, id)).run();
    db.delete(accounts).where(eq(accounts.id, id)).run();
  });
  tx();
}

export function addSnapshot(
  accountId: number,
  input: { ts?: string; balance: number; equity: number; dailyPnl: number; source?: string },
) {
  const result = db
    .insert(accountSnapshots)
    .values({
      accountId,
      ts: input.ts ?? new Date().toISOString(),
      balance: input.balance,
      equity: input.equity,
      dailyPnl: input.dailyPnl,
      source: (input.source as "manual") ?? "manual",
    })
    .run();
  return db.select().from(accountSnapshots).where(eq(accountSnapshots.id, Number(result.lastInsertRowid))).get();
}

export function listSnapshots(accountId: number) {
  return db
    .select()
    .from(accountSnapshots)
    .where(eq(accountSnapshots.accountId, accountId))
    .orderBy(accountSnapshots.ts)
    .all();
}

export function addPayout(
  accountId: number,
  input: { date: string; gross: number; splitPct: number; fees?: number; net?: number; note?: string },
) {
  const fees = input.fees ?? 0;
  const net = input.net ?? input.gross * (input.splitPct / 100) - fees;
  const result = db
    .insert(payouts)
    .values({
      accountId,
      date: input.date,
      gross: input.gross,
      splitPct: input.splitPct,
      fees,
      net,
      note: input.note,
    })
    .run();
  return db.select().from(payouts).where(eq(payouts.id, Number(result.lastInsertRowid))).get();
}

export function listPayouts(accountId: number) {
  return db.select().from(payouts).where(eq(payouts.accountId, accountId)).orderBy(payouts.date).all();
}

export function listAllPayouts() {
  return db.select().from(payouts).all();
}

export function addEvent(input: {
  accountId?: number | null;
  type: string;
  text: string;
  dataJson?: Record<string, unknown>;
}) {
  const result = db
    .insert(accountEvents)
    .values({
      accountId: input.accountId ?? null,
      ts: new Date().toISOString(),
      type: input.type,
      text: input.text,
      dataJson: input.dataJson,
    })
    .run();
  return db.select().from(accountEvents).where(eq(accountEvents.id, Number(result.lastInsertRowid))).get();
}

export function listEvents(limit = 100) {
  return db.select().from(accountEvents).orderBy(desc(accountEvents.ts)).limit(limit).all();
}

export function addGoal(input: {
  accountId?: number | null;
  title: string;
  targetValue: number;
  unit: "usd" | "pct";
  deadline?: string;
  currentValue?: number;
}) {
  const result = db
    .insert(goals)
    .values({
      accountId: input.accountId ?? null,
      title: input.title,
      targetValue: input.targetValue,
      unit: input.unit,
      deadline: input.deadline,
      currentValue: input.currentValue ?? 0,
      createdAt: new Date().toISOString(),
    })
    .run();
  return db.select().from(goals).where(eq(goals.id, Number(result.lastInsertRowid))).get();
}

export function listGoals(accountId?: number | null) {
  if (accountId === undefined) return db.select().from(goals).all();
  if (accountId === null) return db.select().from(goals).where(isNull(goals.accountId)).all();
  return db.select().from(goals).where(eq(goals.accountId, accountId)).all();
}

export function updateGoal(id: number, patch: Partial<{ currentValue: number; title: string; targetValue: number; deadline: string }>) {
  db.update(goals).set(patch).where(eq(goals.id, id)).run();
  return db.select().from(goals).where(eq(goals.id, id)).get();
}

export function deleteGoal(id: number) {
  db.delete(goals).where(eq(goals.id, id)).run();
}
