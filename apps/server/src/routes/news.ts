import type { FastifyInstance } from "fastify";
import Anthropic from "@anthropic-ai/sdk";
import { groupByCluster } from "../news/dedupe.js";
import * as repo from "../news/repo.js";
import { loadFeeds, setFeedEnabled } from "../news/feedsConfig.js";
import { getFeedStatuses } from "../news/rssFetcher.js";
import { runNewsCycle } from "../news/scheduler.js";
import { writeContentIdeaMarkdown } from "../news/vaultExportContentIdea.js";
import { logAiUsage, isAiBudgetExceeded } from "../lib/aiUsageRepo.js";
import { env } from "../lib/env.js";

export async function newsRoutes(app: FastifyInstance) {
  app.get<{
    Querystring: { asset?: string; category?: string; minRelevance?: string; source?: string; from?: string };
  }>("/news", async (req) => {
    const { asset, category, minRelevance, source, from } = req.query;
    const items = repo.listNewsItems({ from });

    const filtered = items.filter((item) => {
      if (asset && !(item.assetsJson as string[] | null)?.includes(asset)) return false;
      if (category && item.category !== category) return false;
      if (minRelevance && (item.relevance ?? 0) < Number(minRelevance)) return false;
      if (source && item.source !== source) return false;
      return true;
    });

    return groupByCluster(filtered);
  });

  app.get<{ Params: { id: string } }>("/news/:id", async (req, reply) => {
    const item = repo.getNewsItem(Number(req.params.id));
    if (!item) return reply.code(404).send({ error: "not_found" });
    return item;
  });

  app.post("/news/refresh", async () => {
    await runNewsCycle();
    return { ok: true };
  });

  app.get("/news/sources", async () => {
    const feeds = loadFeeds();
    const statuses = getFeedStatuses();
    return feeds.map((f) => ({ ...f, status: statuses[f.id] ?? null }));
  });

  app.put<{ Params: { id: string }; Body: { enabled: boolean } }>("/news/sources/:id", async (req) => {
    return setFeedEnabled(req.params.id, req.body.enabled);
  });

  app.post<{ Params: { id: string }; Body: { hookDe?: string; hookEn?: string } }>(
    "/news/:id/content-idea",
    async (req, reply) => {
      const item = repo.getNewsItem(Number(req.params.id));
      if (!item) return reply.code(404).send({ error: "not_found" });

      const idea = repo.createContentIdea({
        sourceType: "news",
        sourceId: String(item.id),
        idea: item.summaryDe ?? item.title,
        hookDe: req.body.hookDe,
        hookEn: req.body.hookEn,
      });

      const vaultPath = writeContentIdeaMarkdown({
        idea: item.summaryDe ?? item.title,
        hookDe: req.body.hookDe,
        hookEn: req.body.hookEn,
        sourceUrl: item.url,
      });

      return reply.code(201).send({ ...idea, vaultPath });
    },
  );

  app.get("/content-ideas", async () => repo.listContentIdeas());

  app.post<{ Params: { id: string } }>("/news/:id/explain", async (req, reply) => {
    const item = repo.getNewsItem(Number(req.params.id));
    if (!item) return reply.code(404).send({ error: "not_found" });
    if (!env.ANTHROPIC_API_KEY) {
      return reply.code(400).send({ error: "no_api_key", message: "ANTHROPIC_API_KEY fehlt in .env." });
    }
    if (isAiBudgetExceeded()) {
      return reply.code(402).send({ error: "budget_exceeded", message: "KI-Monatsbudget erreicht." });
    }

    try {
      const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
      const response = await client.messages.create({
        model: env.ANTHROPIC_MODEL_FAST,
        max_tokens: 400,
        messages: [
          {
            role: "user",
            content:
              `Erkläre auf Deutsch in 2-3 Sätzen, warum diese Nachricht für einen Trader relevant sein könnte ` +
              `und welche Zusammenhänge zu anderen Anlageklassen bestehen. Keine Kauf-/Verkaufsempfehlung, nur Kontext. ` +
              `Nachricht: "${item.title}" (Quelle: ${item.source}).`,
          },
        ],
      });
      logAiUsage("news_explain", env.ANTHROPIC_MODEL_FAST, response.usage.input_tokens, response.usage.output_tokens);

      const text = response.content.find((b) => b.type === "text");
      return { explanation: text && text.type === "text" ? text.text : "" };
    } catch (err) {
      app.log.error({ err }, "Zusammenhang-Erklärung fehlgeschlagen");
      return reply.code(502).send({ error: "failed", message: (err as Error).message });
    }
  });
}
