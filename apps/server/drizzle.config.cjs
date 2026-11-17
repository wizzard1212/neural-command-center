const { config: loadEnv } = require("dotenv");
const path = require("node:path");

const rootDir = path.resolve(__dirname, "../.."); // apps/server -> Projekt-Root
loadEnv({ path: path.resolve(rootDir, ".env") });

const dbPath = path.resolve(rootDir, process.env.DB_PATH ?? "data/command-center.db");

/** @type {import('drizzle-kit').Config} */
module.exports = {
  schema: "../../packages/shared/src/schema.ts",
  out: "./drizzle",
  dialect: "sqlite",
  dbCredentials: {
    url: dbPath,
  },
};
