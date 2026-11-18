import { env } from "./env.js";

/** Abschnitt 5/11: Push-Benachrichtigung übers kostenlose ntfy.sh (Topic in
 * .env). Ein Fehler hier ist ein Komfort-Feature-Ausfall und darf den
 * aufrufenden Vorgang (Briefing, Kein-Trade-Fenster, Wochen-Review) nie
 * scheitern lassen. */
export async function sendNtfyPush(title: string, message: string) {
  if (!env.NTFY_TOPIC) return;
  try {
    await fetch(`https://ntfy.sh/${env.NTFY_TOPIC}`, {
      method: "POST",
      headers: { Title: title },
      body: message,
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    // Push ist ein Komfort-Feature – ein Fehler hier darf den Aufrufer nicht scheitern lassen.
  }
}
