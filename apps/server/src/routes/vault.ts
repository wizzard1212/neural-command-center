import { readFileSync, existsSync } from "node:fs";
import { resolve, basename, sep } from "node:path";
import type { FastifyInstance } from "fastify";
import matter from "gray-matter";
import { env } from "../lib/env.js";
import { buildGraph, computeStats } from "../vault/repo.js";

function resolveSafeVaultPath(relPath: string): string | null {
  if (!env.VAULT_PATH) return null;
  const vaultRoot = resolve(env.VAULT_PATH);
  const target = resolve(vaultRoot, relPath);
  if (target !== vaultRoot && !target.startsWith(vaultRoot + sep)) return null;
  return target;
}

export async function vaultRoutes(app: FastifyInstance) {
  app.get("/vault/graph", async () => buildGraph());

  app.get("/vault/stats", async () => computeStats());

  app.get("/vault/meta", async () => ({
    vaultName: env.VAULT_PATH ? basename(env.VAULT_PATH) : null,
    connected: Boolean(env.VAULT_PATH) && existsSync(env.VAULT_PATH),
  }));

  app.get<{ Querystring: { path?: string } }>("/vault/note", async (req, reply) => {
    const relPath = req.query.path;
    if (!relPath) return reply.code(400).send({ error: "path fehlt" });

    const absolutePath = resolveSafeVaultPath(relPath);
    if (!absolutePath || !existsSync(absolutePath)) {
      return reply.code(404).send({ error: "not_found" });
    }

    const raw = readFileSync(absolutePath, "utf-8");
    const { content, data } = matter(raw);
    return { path: relPath, frontmatter: data, markdown: content };
  });
}
