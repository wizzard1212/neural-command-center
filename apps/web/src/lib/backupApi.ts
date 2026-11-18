import { API_BASE } from "./api";

export interface BackupInfo {
  fileName: string;
  createdAt: string;
  sizeBytes: number;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    // Nur mit Content-Type: application/json senden, wenn tatsächlich ein Body
    // existiert – sonst lehnt Fastifys Body-Parser leere POST/DELETE-Requests ab.
    headers: init?.body ? { "Content-Type": "application/json" } : undefined,
    ...init,
  });
  if (!res.ok) throw new Error(`API-Fehler ${res.status} bei ${path}`);
  return res.json() as Promise<T>;
}

export function fetchBackups() {
  return request<BackupInfo[]>("/backups");
}

export function runBackupNow() {
  return request<BackupInfo>("/backups/run", { method: "POST" });
}
