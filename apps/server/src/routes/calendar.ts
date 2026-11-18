import type { FastifyInstance } from "fastify";
import { listEventsInRange } from "../calendar/repo.js";
import { fetchAndStoreCalendar } from "../calendar/fetchCalendar.js";
import { getUpcomingNoTradeWindows } from "../calendar/scheduler.js";
import { nextWindowCountdown } from "../calendar/noTradeWindow.js";

export async function calendarRoutes(app: FastifyInstance) {
  app.get<{ Querystring: { from?: string; to?: string } }>("/calendar", async (req) => {
    const from = req.query.from ?? new Date().toISOString().slice(0, 10);
    const to = req.query.to ?? new Date(Date.now() + 7 * 86_400_000).toISOString().slice(0, 10);
    return listEventsInRange(from, to);
  });

  app.get("/calendar/no-trade-windows", async () => {
    const now = new Date();
    const windows = getUpcomingNoTradeWindows(now);
    return { windows, countdown: nextWindowCountdown(windows, now) };
  });

  app.post("/calendar/refresh", async () => fetchAndStoreCalendar());
}
