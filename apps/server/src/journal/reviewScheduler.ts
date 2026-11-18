import cron from "node-cron";
import { generateWeeklyReview } from "./generateWeeklyReview.js";
import { env } from "../lib/env.js";

/** Abschnitt 9.3: "Wochen-Review automatisch (Sonntag 18:00)". */
export function startReviewScheduler() {
  cron.schedule("0 18 * * 0", () => void generateWeeklyReview(), { timezone: env.TZ });
}
