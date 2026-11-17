import type { FastifyInstance } from "fastify";
import { eq } from "drizzle-orm";
import { settings } from "@ncc/shared";
import { db } from "../db/client.js";

export async function settingsRoutes(app: FastifyInstance) {
  app.get("/settings", async () => db.select().from(settings).all());

  app.get<{ Params: { key: string } }>("/settings/:key", async (req, reply) => {
    const row = db.select().from(settings).where(eq(settings.key, req.params.key)).get();
    if (!row) return reply.code(404).send({ error: "not_found" });
    return row;
  });

  app.put<{ Params: { key: string }; Body: { value: unknown } }>(
    "/settings/:key",
    async (req) => {
      const { key } = req.params;
      const { value } = req.body;
      db.insert(settings)
        .values({ key, value })
        .onConflictDoUpdate({ target: settings.key, set: { value } })
        .run();
      return { key, value };
    },
  );
}
