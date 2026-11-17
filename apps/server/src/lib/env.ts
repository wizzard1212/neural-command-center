import { config as loadEnv } from "dotenv";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { z } from "zod";

// Monorepo-Root ermitteln, damit eine einzige .env im Projekt-Hauptordner greift,
// unabhängig davon, aus welchem Arbeitsverzeichnis pnpm das Skript startet.
const __dirname = dirname(fileURLToPath(import.meta.url));
export const ROOT_DIR = resolve(__dirname, "../../../..");
loadEnv({ path: resolve(ROOT_DIR, ".env") });

// z.coerce.boolean() würde "false" (nicht-leerer String) fälschlich als true lesen.
const booleanFlag = z.preprocess((v) => v === "true" || v === "1", z.boolean());

const envSchema = z.object({
  VAULT_PATH: z.string().default(""),
  VAULT_WRITE_DIR: z.string().default("Dashboard"),
  TZ: z.string().default("Europe/Berlin"),

  ANTHROPIC_API_KEY: z.string().default(""),
  ANTHROPIC_MODEL: z.string().default("claude-sonnet-4-5"),
  ANTHROPIC_MODEL_FAST: z.string().default("claude-haiku-4-5"),
  AI_MONTHLY_BUDGET_USD: z.coerce.number().default(30),

  FMP_API_KEY: z.string().default(""),
  TWELVEDATA_API_KEY: z.string().default(""),
  COINGECKO_API_KEY: z.string().default(""),

  REDDIT_CLIENT_ID: z.string().default(""),
  REDDIT_CLIENT_SECRET: z.string().default(""),
  LUNARCRUSH_API_KEY: z.string().default(""),
  YOUTUBE_API_KEY: z.string().default(""),

  MT5_ENABLED: booleanFlag.default(false),
  MT5_TERMINALS: z.string().default(""),
  METAAPI_ENABLED: booleanFlag.default(false),
  METAAPI_TOKEN: z.string().default(""),

  NTFY_TOPIC: z.string().default(""),

  PORT: z.coerce.number().default(4000),
  DB_PATH: z.string().default("data/command-center.db"),
  BRIEFING_CRON: z.string().default("30 7 * * 1-5"),
});

const parsedEnv = envSchema.parse(process.env);

export const env = {
  ...parsedEnv,
  DB_PATH: resolve(ROOT_DIR, parsedEnv.DB_PATH),
};

export function isSourceConfigured(key: keyof typeof env): boolean {
  const value = env[key];
  return typeof value === "string" ? value.trim().length > 0 : Boolean(value);
}
