import type { FastifyInstance } from "fastify";
import { computeConnectionStatuses } from "../lib/connection-status.js";
import { computeSessionStates } from "../lib/sessions.js";
import { DEFAULT_WATCHLIST } from "@ncc/shared";

export async function statusRoutes(app: FastifyInstance) {
  app.get("/status", async () => ({
    connections: computeConnectionStatuses(),
    sessions: computeSessionStates(new Date()),
    watchlist: DEFAULT_WATCHLIST,
    serverTime: new Date().toISOString(),
  }));
}
