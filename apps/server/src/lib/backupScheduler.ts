import cron from "node-cron";
import type { FastifyBaseLogger } from "fastify";
import { runBackup } from "./backup.js";
import { env } from "./env.js";

/** Abschnitt 11: "Backup: täglich". 03:00 Uhr Europe/Berlin, außerhalb von
 * Merlins üblichen Handelszeiten und vor dem 07:30-Briefing. */
export function startBackupScheduler(logger: FastifyBaseLogger) {
  cron.schedule(
    "0 3 * * *",
    () =>
      void runBackup()
        .then((info) => logger.info?.(`Backup erstellt: ${info.fileName}`))
        .catch((err) => logger.error?.({ err }, "Backup fehlgeschlagen")),
    { timezone: env.TZ },
  );
}
