import Fastify from "fastify";
import cors from "@fastify/cors";
import websocketPlugin from "@fastify/websocket";
import { env } from "./lib/env.js";
import { healthRoutes } from "./routes/health.js";
import { statusRoutes } from "./routes/status.js";
import { settingsRoutes } from "./routes/settings.js";
import { layoutRoutes } from "./routes/layout.js";
import { registerWs } from "./ws.js";

const app = Fastify({ logger: true });

await app.register(cors, { origin: ["http://localhost:5173", "http://127.0.0.1:5173"] });
await app.register(websocketPlugin);

await app.register(healthRoutes);
await app.register(statusRoutes);
await app.register(settingsRoutes);
await app.register(layoutRoutes);
await app.register(registerWs);

// Server bindet bewusst nur an 127.0.0.1 (Sicherheitsvorgabe aus SPEC.md Abschnitt 2).
app.listen({ port: env.PORT, host: "127.0.0.1" }, (err, address) => {
  if (err) {
    app.log.error(err);
    process.exit(1);
  }
  app.log.info(`Neural Command Center Server läuft auf ${address}`);
});
