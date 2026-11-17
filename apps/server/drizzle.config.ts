import type { Config } from "drizzle-kit";
import { config as loadEnv } from "dotenv";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, "../.."); // apps/server -> Projekt-Root
loadEnv({ path: resolve(rootDir, ".env") });

const dbPath = resolve(rootDir, process.env.DB_PATH ?? "data/command-center.db");

export default {
  schema: "../../packages/shared/src/schema.ts",
  out: "./drizzle",
  dialect: "sqlite",
  dbCredentials: {
    url: dbPath,
  },
} satisfies Config;
