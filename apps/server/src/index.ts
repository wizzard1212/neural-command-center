import Fastify from "fastify";
import cors from "@fastify/cors";
import websocketPlugin from "@fastify/websocket";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { env } from "./lib/env.js";
import { db } from "./db/client.js";
import { healthRoutes } from "./routes/health.js";
import { statusRoutes } from "./routes/status.js";
import { settingsRoutes } from "./routes/settings.js";
import { layoutRoutes } from "./routes/layout.js";
import { vaultRoutes } from "./routes/vault.js";
import { accountsRoutes } from "./routes/accounts.js";
import { tradesRoutes } from "./routes/trades.js";
import { newsRoutes } from "./routes/news.js";
import { briefingRoutes } from "./routes/briefing.js";
import { socialRoutes } from "./routes/social.js";
import { registerWs } from "./ws.js";
import { startVaultWatcher } from "./vault/watcher.js";
import { startNewsScheduler } from "./news/scheduler.js";
import { startBriefingScheduler } from "./briefing/scheduler.js";
import { startSocialScheduler } from "./social/scheduler.js";

// bodyLimit höher als Fastifys 1 MB-Standard, da Screenshots als Base64-JSON
// hochgeladen werden (Abschnitt 9.1: Setup-Erfassung per Strg+V).
const app = Fastify({ logger: true, bodyLimit: 15 * 1024 * 1024 });

// Letzte Absicherung gegen rohe Socket-/Promise-Fehler außerhalb jeder
// try/catch-Kette (z. B. die als "experimentell" eingestufte google-trends-api,
// die bei einem Verbindungsabbruch einen unbehandelten Socket-"error" wirft
// statt sauber abzulehnen – genau wie rss-parser in Phase 5). Das Dashboard
// läuft dauerhaft (Cron 07:30, Live-Feeds) und darf nie komplett abstürzen,
// nur weil eine einzelne Drittanbieter-Quelle sich danebenbenimmt.
process.on("uncaughtException", (err) => {
  app.log.error({ err }, "Unbehandelte Exception abgefangen – Server läuft weiter.");
});
process.on("unhandledRejection", (reason) => {
  app.log.error({ err: reason }, "Unbehandelte Promise-Rejection abgefangen – Server läuft weiter.");
});

// Migrationen bei jedem Start automatisch anwenden, damit "pnpm dev" / start.bat
// ohne manuellen Zwischenschritt funktioniert. drizzle-orm überspringt bereits
// angewendete Migrationen selbst.
migrate(db, { migrationsFolder: new URL("../drizzle", import.meta.url).pathname });

await app.register(cors, { origin: ["http://localhost:5173", "http://127.0.0.1:5173"] });
await app.register(websocketPlugin);

await app.register(healthRoutes);
await app.register(statusRoutes);
await app.register(settingsRoutes);
await app.register(layoutRoutes);
await app.register(vaultRoutes);
await app.register(accountsRoutes);
await app.register(tradesRoutes);
await app.register(newsRoutes);
await app.register(briefingRoutes);
await app.register(socialRoutes);
await app.register(registerWs);

// Server bindet bewusst nur an 127.0.0.1 (Sicherheitsvorgabe aus SPEC.md Abschnitt 2).
app.listen({ port: env.PORT, host: "127.0.0.1" }, (err, address) => {
  if (err) {
    app.log.error(err);
    process.exit(1);
  }
  app.log.info(`Neural Command Center Server läuft auf ${address}`);
  startVaultWatcher(app.log);
  startNewsScheduler(app.log);
  startBriefingScheduler();
  startSocialScheduler(app.log);
});
