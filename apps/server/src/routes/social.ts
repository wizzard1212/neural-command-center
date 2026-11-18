import type { FastifyInstance } from "fastify";
import { DEFAULT_WATCHLIST } from "@ncc/shared";
import * as repo from "../social/repo.js";
import { getSocialSourceStatuses, runSocialCycle } from "../social/scheduler.js";
import { computeSentimentBarometer } from "../social/sentiment.js";
import { generateHookIdea } from "../social/viralAnalyze.js";
import { createContentIdea } from "../news/repo.js";
import { writeContentIdeaMarkdown } from "../news/vaultExportContentIdea.js";
import { logAiUsage, isAiBudgetExceeded } from "../lib/aiUsageRepo.js";
import { env } from "../lib/env.js";

export async function socialRoutes(app: FastifyInstance) {
  app.get("/social/hype-radar", async () => {
    return repo.listLatestTrendTopics(5).map((t) => ({
      topic: t.topic,
      platform: t.platform,
      mentions24h: t.mentions24h,
      mentionsAvg7d: t.mentionsAvg7d,
      zscore: t.zscore,
      sparkline: repo.getTopicSparkline(t.topic, 7),
    }));
  });

  app.get<{ Querystring: { platform?: string } }>("/social/feed", async (req) => {
    return repo.listSocialItems({ platform: req.query.platform, limit: 20 });
  });

  app.get("/social/sentiment", async () => {
    const recent = repo.listRecentSocialItems(24);
    return computeSentimentBarometer(recent, DEFAULT_WATCHLIST);
  });

  app.get("/social/sources", async () => Object.values(getSocialSourceStatuses()));

  app.post("/social/refresh", async () => {
    const newCount = await runSocialCycle();
    return { ok: true, newCount };
  });

  app.post<{ Params: { id: string }; Body: { hookDe?: string; hookEn?: string } }>(
    "/social/:id/content-idea",
    async (req, reply) => {
      const item = repo.getSocialItem(Number(req.params.id));
      if (!item) return reply.code(404).send({ error: "not_found" });

      const idea = createContentIdea({
        sourceType: "social",
        sourceId: String(item.id),
        idea: item.title ?? item.topic ?? "Social-Trend",
        hookDe: req.body.hookDe,
        hookEn: req.body.hookEn,
      });

      const vaultPath = writeContentIdeaMarkdown({
        idea: item.title ?? item.topic ?? "Social-Trend",
        hookDe: req.body.hookDe,
        hookEn: req.body.hookEn,
        sourceUrl: item.url ?? undefined,
      });

      return reply.code(201).send({ ...idea, vaultPath });
    },
  );

  app.post<{ Params: { id: string } }>("/social/:id/hook-idea", async (req, reply) => {
    const item = repo.getSocialItem(Number(req.params.id));
    if (!item) return reply.code(404).send({ error: "not_found" });
    if (!env.ANTHROPIC_API_KEY) {
      return reply.code(400).send({ error: "no_api_key", message: "ANTHROPIC_API_KEY fehlt in .env." });
    }
    if (isAiBudgetExceeded()) {
      return reply.code(402).send({ error: "budget_exceeded", message: "KI-Monatsbudget erreicht." });
    }

    try {
      const result = await generateHookIdea({
        title: item.title ?? item.topic ?? "Social-Trend",
        platform: item.platform,
        metricType: item.metricType,
        metricValue: item.metricValue,
      });
      logAiUsage("social_hook_idea", env.ANTHROPIC_MODEL_FAST, result.usage.inputTokens, result.usage.outputTokens);
      return { hookDe: result.hookDe, hookEn: result.hookEn };
    } catch (err) {
      app.log.error({ err }, "Hook-Idee fehlgeschlagen");
      return reply.code(502).send({ error: "failed", message: (err as Error).message });
    }
  });
}
