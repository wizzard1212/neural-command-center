import type { FastifyInstance } from "fastify";
import { getLatestBriefing, getBriefingByDate, listBriefings } from "../briefing/repo.js";
import { generateBriefing } from "../briefing/generate.js";
import { getBriefingSchedule, updateBriefingSchedule } from "../briefing/scheduler.js";

export async function briefingRoutes(app: FastifyInstance) {
  app.get("/briefing/latest", async (_req, reply) => {
    const briefing = getLatestBriefing();
    if (!briefing) return reply.code(404).send({ error: "not_found" });
    return briefing;
  });

  app.get<{ Params: { date: string } }>("/briefing/:date", async (req, reply) => {
    const briefing = getBriefingByDate(req.params.date);
    if (!briefing) return reply.code(404).send({ error: "not_found" });
    return briefing;
  });

  app.get("/briefing", async () => listBriefings());

  app.post("/briefing/generate", async (_req, reply) => {
    const result = await generateBriefing();
    return reply.code(result.status === "failed" ? 502 : 201).send(result);
  });

  app.get("/briefing/schedule", async () => ({ cron: getBriefingSchedule() }));

  app.put<{ Body: { cron: string } }>("/briefing/schedule", async (req, reply) => {
    try {
      updateBriefingSchedule(req.body.cron);
      return { cron: req.body.cron };
    } catch (err) {
      return reply.code(400).send({ error: (err as Error).message });
    }
  });
}
