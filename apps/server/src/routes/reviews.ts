import type { FastifyInstance } from "fastify";
import { listReviews, getReviewByWeek } from "../journal/reviewRepo.js";
import { generateWeeklyReview } from "../journal/generateWeeklyReview.js";

export async function reviewsRoutes(app: FastifyInstance) {
  app.get("/reviews", async () => listReviews());

  app.get<{ Params: { week: string } }>("/reviews/:week", async (req, reply) => {
    const review = getReviewByWeek(req.params.week);
    if (!review) return reply.code(404).send({ error: "not_found" });
    return review;
  });

  app.post("/reviews/generate", async (_req, reply) => {
    const result = await generateWeeklyReview();
    return reply.code(201).send(result);
  });
}
