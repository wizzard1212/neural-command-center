import type { FastifyInstance } from "fastify";
import { askBrain } from "../brain/ask.js";
import { logAiUsage, isAiBudgetExceeded } from "../lib/aiUsageRepo.js";
import { env } from "../lib/env.js";

export async function brainRoutes(app: FastifyInstance) {
  app.post<{ Body: { question: string } }>("/brain/ask", async (req, reply) => {
    const { question } = req.body;
    if (!question || question.trim().length === 0) {
      return reply.code(400).send({ error: "question_required" });
    }
    if (!env.ANTHROPIC_API_KEY) {
      return reply.code(400).send({ error: "no_api_key", message: "ANTHROPIC_API_KEY fehlt in .env." });
    }
    if (isAiBudgetExceeded()) {
      return reply.code(402).send({ error: "budget_exceeded", message: "KI-Monatsbudget erreicht." });
    }

    try {
      const result = await askBrain(question);
      logAiUsage("brain_ask", env.ANTHROPIC_MODEL, result.usage.inputTokens, result.usage.outputTokens);
      return { answer: result.answer, sources: result.sources };
    } catch (err) {
      app.log.error({ err }, "Frag-dein-Gehirn fehlgeschlagen");
      return reply.code(502).send({ error: "failed", message: (err as Error).message });
    }
  });
}
