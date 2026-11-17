import type { FastifyInstance } from "fastify";
import { eq } from "drizzle-orm";
import { layout } from "@ncc/shared";
import { db } from "../db/client.js";

export async function layoutRoutes(app: FastifyInstance) {
  app.get<{ Params: { page: string } }>("/layout/:page", async (req, reply) => {
    const row = db.select().from(layout).where(eq(layout.page, req.params.page)).get();
    if (!row) return reply.code(404).send({ error: "not_found" });
    return row;
  });

  app.put<{ Params: { page: string }; Body: { json: unknown } }>(
    "/layout/:page",
    async (req) => {
      const { page } = req.params;
      const { json } = req.body;
      db.insert(layout)
        .values({ page, json })
        .onConflictDoUpdate({ target: layout.page, set: { json } })
        .run();
      return { page, json };
    },
  );
}
