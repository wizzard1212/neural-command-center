import cron from "node-cron";
import type { FastifyBaseLogger } from "fastify";
import { fetchAndStoreCalendar } from "./fetchCalendar.js";
import { listUpcomingHighImpact } from "./repo.js";
import { computeNoTradeWindows, nextWindowCountdown } from "./noTradeWindow.js";
import { listAccounts } from "../accounts/repo.js";
import { sendNtfyPush } from "../lib/ntfy.js";
import { env } from "../lib/env.js";

let logger: FastifyBaseLogger | Console = console;
const pushedForWindow = new Set<string>();

export function getUpcomingNoTradeWindows(now: Date) {
  const events = listUpcomingHighImpact(now.toISOString(), 20);
  const accounts = listAccounts()
    .filter((a) => a.phase !== "lost")
    .map((a) => ({ accountId: a.id, label: `${a.firm} ${a.program}`, newsRuleMinutes: a.newsRuleMinutes }));
  return computeNoTradeWindows(events, accounts);
}

/** Abschnitt 10: "Statusleiste zeigt Countdown zum nächsten Fenster; 10 Min
 * vorher Push." Läuft minütlich, rein auf bereits gespeicherten Daten (kein
 * Netzwerkaufruf), daher günstig genug für dieses Intervall. */
function checkUpcomingPush() {
  const now = new Date();
  const windows = getUpcomingNoTradeWindows(now);
  const { minutesUntilNext, next } = nextWindowCountdown(windows, now);
  if (next && minutesUntilNext !== null && minutesUntilNext <= 10 && minutesUntilNext > 0) {
    const key = `${next.eventTs}-${next.accountId}`;
    if (!pushedForWindow.has(key)) {
      pushedForWindow.add(key);
      void sendNtfyPush(
        "Kein-Trade-Fenster gleich aktiv",
        `${next.eventTitle} (${next.country}) in ${minutesUntilNext} Min – ${next.accountLabel}.`,
      );
    }
  }
}

export function startCalendarScheduler(appLogger: FastifyBaseLogger) {
  logger = appLogger;
  // Kalenderdaten ändern sich selten (meist nur Prognose/Ist-Wert) – alle 6h reicht.
  cron.schedule("0 */6 * * *", () => void runCalendarFetch(), { timezone: env.TZ });
  cron.schedule("* * * * *", checkUpcomingPush, { timezone: env.TZ });
  void runCalendarFetch();
}

async function runCalendarFetch() {
  const result = await fetchAndStoreCalendar();
  if (result.available) logger.info?.(`Kalender: ${result.count} Termine aktualisiert.`);
  else logger.warn?.(`Kalender-Abruf übersprungen: ${result.reason}`);
}
