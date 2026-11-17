import { existsSync } from "node:fs";
import chokidar, { type FSWatcher } from "chokidar";
import type { FastifyBaseLogger } from "fastify";
import { env } from "../lib/env.js";
import { broadcast } from "../ws.js";
import { parseNoteFile } from "./parse.js";
import { deleteNote, upsertNote } from "./repo.js";

let watcher: FSWatcher | null = null;

export function startVaultWatcher(logger: FastifyBaseLogger): FSWatcher | null {
  if (!env.VAULT_PATH) {
    logger.warn("VAULT_PATH nicht gesetzt – Vault-Watcher wird nicht gestartet.");
    return null;
  }
  if (!existsSync(env.VAULT_PATH)) {
    logger.warn(`VAULT_PATH "${env.VAULT_PATH}" existiert nicht – Vault-Watcher wird nicht gestartet.`);
    return null;
  }

  let ready = false;

  // chokidar 4 unterstützt keine Glob-Muster mehr (Breaking Change ggü. v3) –
  // daher wird das ganze Verzeichnis beobachtet und hier selbst gefiltert.
  watcher = chokidar.watch(".", {
    cwd: env.VAULT_PATH,
    ignored: (path: string, stats?: { isFile(): boolean }) => {
      const segments = path.split(/[\\/]/);
      if (segments.some((part) => part.startsWith("."))) return true;
      // chokidar ruft diese Funktion zuerst ohne stats auf (reine Pfadprüfung).
      // Nur eindeutig erkannte Nicht-Markdown-Dateien ausschließen, niemals
      // Verzeichnisse oder noch unbekannte Einträge – sonst wird der komplette
      // Vault-Baum beim allerersten Aufruf fälschlich übersprungen.
      if (stats?.isFile() && !path.toLowerCase().endsWith(".md")) return true;
      return false;
    },
    ignoreInitial: false,
    awaitWriteFinish: { stabilityThreshold: 200, pollInterval: 50 },
  });

  const handleUpsert = (relPath: string, kind: "created" | "modified") => {
    try {
      const absolutePath = `${env.VAULT_PATH}/${relPath}`;
      const parsed = parseNoteFile(absolutePath, env.VAULT_PATH);
      upsertNote(parsed);
      if (ready) broadcast({ type: "vault:changed", path: parsed.path, kind });
    } catch (err) {
      logger.error({ err, relPath }, "Fehler beim Parsen einer Vault-Notiz");
    }
  };

  watcher.on("add", (relPath) => handleUpsert(relPath, "created"));
  watcher.on("change", (relPath) => handleUpsert(relPath, "modified"));
  watcher.on("unlink", (relPath) => {
    const normalized = relPath.split("\\").join("/");
    deleteNote(normalized);
    if (ready) broadcast({ type: "vault:changed", path: normalized, kind: "deleted" });
  });
  watcher.on("error", (err) => logger.error({ err }, "Vault-Watcher-Fehler"));
  watcher.on("ready", () => {
    ready = true;
    logger.info("Vault-Watcher bereit, initialer Scan abgeschlossen.");
  });

  return watcher;
}

export function stopVaultWatcher() {
  void watcher?.close();
}
