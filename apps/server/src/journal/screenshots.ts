import { mkdirSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { resolve, extname } from "node:path";
import { randomUUID } from "node:crypto";
import { ROOT_DIR } from "../lib/env.js";

// Abschnitt 2 (Sicherheit): Screenshots liegen lokal unter data/screenshots/.
export const SCREENSHOTS_DIR = resolve(ROOT_DIR, "data/screenshots");

const MIME_EXT: Record<string, string> = {
  "image/png": ".png",
  "image/jpeg": ".jpg",
  "image/webp": ".webp",
};

export function saveScreenshotFromDataUrl(dataUrl: string): string {
  const match = /^data:(image\/[a-zA-Z+]+);base64,(.+)$/.exec(dataUrl);
  if (!match) throw new Error("Ungültiges Bildformat (erwartet: data:image/...;base64,...)");

  const [, mime, base64] = match;
  const ext = MIME_EXT[mime] ?? extname(mime) ?? ".png";
  const filename = `${Date.now()}-${randomUUID()}${ext}`;

  mkdirSync(SCREENSHOTS_DIR, { recursive: true });
  writeFileSync(resolve(SCREENSHOTS_DIR, filename), Buffer.from(base64, "base64"));

  return filename;
}

export function readScreenshot(filename: string): { buffer: Buffer; mime: string } | null {
  // Nur einen reinen Dateinamen zulassen, keine Pfadanteile (Path Traversal).
  if (filename.includes("/") || filename.includes("\\") || filename.includes("..")) return null;

  const path = resolve(SCREENSHOTS_DIR, filename);
  if (!existsSync(path)) return null;

  const ext = extname(filename).toLowerCase();
  const mime = Object.entries(MIME_EXT).find(([, e]) => e === ext)?.[0] ?? "application/octet-stream";
  return { buffer: readFileSync(path), mime };
}
