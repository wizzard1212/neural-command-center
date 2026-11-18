import cron, { type ScheduledTask } from "node-cron";
import { eq } from "drizzle-orm";
import { settings } from "@ncc/shared";
import { db } from "../db/client.js";
import { env } from "../lib/env.js";
import { generateBriefing } from "./generate.js";

const SETTING_KEY = "briefing_cron";
let currentTask: ScheduledTask | null = null;

function readStoredCron(): string {
  const row = db.select().from(settings).where(eq(settings.key, SETTING_KEY)).get();
  return (row?.value as string | undefined) ?? env.BRIEFING_CRON;
}

function writeStoredCron(cronExpr: string) {
  db.insert(settings)
    .values({ key: SETTING_KEY, value: cronExpr })
    .onConflictDoUpdate({ target: settings.key, set: { value: cronExpr } })
    .run();
}

function schedule(cronExpr: string) {
  currentTask?.stop();
  currentTask = cron.schedule(cronExpr, () => void generateBriefing(), { timezone: env.TZ });
}

/** Abschnitt 5: "Cron (Standard Mo-Fr 07:30 Europe/Berlin, in Einstellungen
 * änderbar)". Die gespeicherte Zeit übersteuert den .env-Standard. */
export function startBriefingScheduler() {
  schedule(readStoredCron());
}

export function updateBriefingSchedule(cronExpr: string) {
  if (!cron.validate(cronExpr)) throw new Error(`Ungültiger Cron-Ausdruck: ${cronExpr}`);
  writeStoredCron(cronExpr);
  schedule(cronExpr);
}

export function getBriefingSchedule(): string {
  return readStoredCron();
}
