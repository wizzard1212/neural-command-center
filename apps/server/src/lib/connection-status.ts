import { existsSync } from "node:fs";
import type { ConnectionStatus, SourceKey, SourceStatus } from "@ncc/shared";
import { env } from "./env.js";

function status(source: SourceKey, status: SourceStatus, message?: string): ConnectionStatus {
  return { source, status, lastCheckedAt: new Date().toISOString(), message };
}

export function computeConnectionStatuses(): ConnectionStatus[] {
  const vaultStatus = env.VAULT_PATH
    ? existsSync(env.VAULT_PATH)
      ? status("vault", "connected")
      : status("vault", "error", "Pfad nicht gefunden. VAULT_PATH in .env prüfen.")
    : status("vault", "disconnected", "VAULT_PATH nicht gesetzt.");

  const mt5Status = env.MT5_ENABLED
    ? status("mt5", "connected")
    : status("mt5", "disconnected", "Manuell/Import gewählt (Variante C) – kein Live-Feed.");

  const feedsConfigured = [
    env.FMP_API_KEY,
    env.TWELVEDATA_API_KEY,
    env.REDDIT_CLIENT_ID,
    env.LUNARCRUSH_API_KEY,
    env.YOUTUBE_API_KEY,
  ].some((v) => v.trim().length > 0);
  const feedsStatus = feedsConfigured
    ? status("feeds", "connected")
    : status("feeds", "disconnected", "Keine API-Schlüssel eingetragen. RSS-Feeds laufen trotzdem.");

  const kiStatus = env.ANTHROPIC_API_KEY
    ? status("ki", "connected")
    : status("ki", "disconnected", "ANTHROPIC_API_KEY fehlt in .env.");

  return [vaultStatus, mt5Status, feedsStatus, kiStatus];
}
