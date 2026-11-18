import { mkdirSync, readdirSync, unlinkSync, statSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { sqlite } from "../db/client.js";
import { env, ROOT_DIR } from "./env.js";

const BACKUP_DIR = resolve(ROOT_DIR, "data/backups");
const KEEP_COUNT = 14;
const FILE_PREFIX = "command-center-";

export interface BackupInfo {
  fileName: string;
  createdAt: string;
  sizeBytes: number;
}

export function listBackups(): BackupInfo[] {
  if (!existsBackupDir()) return [];
  return readdirSync(BACKUP_DIR)
    .filter((f) => f.startsWith(FILE_PREFIX) && f.endsWith(".db"))
    .map((fileName) => {
      const stats = statSync(resolve(BACKUP_DIR, fileName));
      return { fileName, createdAt: stats.mtime.toISOString(), sizeBytes: stats.size };
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

function existsBackupDir(): boolean {
  try {
    statSync(BACKUP_DIR);
    return true;
  } catch {
    return false;
  }
}

/** Abschnitt 11: "Backup: täglich command-center.db nach data/backups/
 * (letzte 14 behalten)." Nutzt better-sqlite3s eingebaute Online-Backup-API
 * statt eines rohen Datei-Kopiervorgangs, damit ein Schreibzugriff während
 * des Backups (WAL-Modus) nie eine beschädigte Kopie erzeugt. */
export async function runBackup(): Promise<BackupInfo> {
  mkdirSync(BACKUP_DIR, { recursive: true });
  mkdirSync(dirname(env.DB_PATH), { recursive: true });

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const fileName = `${FILE_PREFIX}${timestamp}.db`;
  await sqlite.backup(resolve(BACKUP_DIR, fileName));

  pruneOldBackups();

  const stats = statSync(resolve(BACKUP_DIR, fileName));
  return { fileName, createdAt: stats.mtime.toISOString(), sizeBytes: stats.size };
}

function pruneOldBackups() {
  const backups = listBackups();
  for (const old of backups.slice(KEEP_COUNT)) {
    unlinkSync(resolve(BACKUP_DIR, old.fileName));
  }
}
