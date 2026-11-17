import { API_BASE } from "./api";

export interface GraphNodeDto {
  path: string;
  title: string;
  area: string;
  tags: string[];
  todosOpen: number;
  mtime: string;
  highPriority: boolean;
}

export interface GraphEdgeDto {
  source: string;
  target: string;
}

export interface VaultGraphResponse {
  nodes: GraphNodeDto[];
  edges: GraphEdgeDto[];
}

export interface VaultStatsResponse {
  noteCount: number;
  linkCount: number;
  changesToday: number;
  mostActiveRegion: string | null;
}

export interface VaultMetaResponse {
  vaultName: string | null;
  connected: boolean;
}

export interface VaultNoteDetail {
  path: string;
  frontmatter: Record<string, unknown>;
  markdown: string;
}

async function request<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`);
  if (!res.ok) throw new Error(`API-Fehler ${res.status} bei ${path}`);
  return res.json() as Promise<T>;
}

export const fetchVaultGraph = () => request<VaultGraphResponse>("/vault/graph");
export const fetchVaultStats = () => request<VaultStatsResponse>("/vault/stats");
export const fetchVaultMeta = () => request<VaultMetaResponse>("/vault/meta");
export const fetchVaultNote = (path: string) =>
  request<VaultNoteDetail>(`/vault/note?path=${encodeURIComponent(path)}`);

export function obsidianDeepLink(vaultName: string, notePath: string): string {
  return `obsidian://open?vault=${encodeURIComponent(vaultName)}&file=${encodeURIComponent(
    notePath.replace(/\.md$/, ""),
  )}`;
}
