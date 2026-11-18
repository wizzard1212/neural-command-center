import type { FastifyInstance } from "fastify";
import * as repo from "../predictions/repo.js";

export async function predictionsRoutes(app: FastifyInstance) {
  app.get("/predictions", async () => ({
    items: repo.listPredictions(),
    hitRate: repo.computeHitRate(),
  }));

  app.post<{ Body: { text: string; asset?: string | null; horizon?: string | null } }>("/predictions", async (req, reply) => {
    const prediction = repo.createPrediction({ text: req.body.text, asset: req.body.asset ?? null, horizon: req.body.horizon ?? null });
    return reply.code(201).send(prediction);
  });

  app.put<{ Params: { id: string }; Body: { outcome: "hit" | "miss" | "open" } }>("/predictions/:id/resolve", async (req, reply) => {
    const id = Number(req.params.id);
    if (!repo.getPrediction(id)) return reply.code(404).send({ error: "not_found" });
    return repo.resolvePrediction(id, req.body.outcome);
  });

  app.delete<{ Params: { id: string } }>("/predictions/:id", async (req, reply) => {
    const id = Number(req.params.id);
    if (!repo.getPrediction(id)) return reply.code(404).send({ error: "not_found" });
    repo.deletePrediction(id);
    return reply.code(204).send();
  });
}
