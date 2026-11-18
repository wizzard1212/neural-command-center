import type { FastifyInstance } from "fastify";
import { listBackups, runBackup } from "../lib/backup.js";

export async function backupsRoutes(app: FastifyInstance) {
  app.get("/backups", async () => listBackups());

  app.post("/backups/run", async (_req, reply) => {
    try {
      const info = await runBackup();
      return reply.code(201).send(info);
    } catch (err) {
      app.log.error({ err }, "Manuelles Backup fehlgeschlagen");
      return reply.code(502).send({ error: "failed", message: (err as Error).message });
    }
  });
}
