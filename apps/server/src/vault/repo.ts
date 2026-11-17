import { eq } from "drizzle-orm";
import { vaultNotes } from "@ncc/shared";
import { db } from "../db/client.js";
import type { ParsedNote } from "./parse.js";
import { isHighPriority } from "./parse.js";

export function upsertNote(note: ParsedNote) {
  db.insert(vaultNotes)
    .values({
      path: note.path,
      title: note.title,
      area: note.area,
      tagsJson: note.tags,
      linksJson: note.links,
      todosOpen: note.todosOpen,
      mtime: note.mtime,
      size: note.size,
    })
    .onConflictDoUpdate({
      target: vaultNotes.path,
      set: {
        title: note.title,
        area: note.area,
        tagsJson: note.tags,
        linksJson: note.links,
        todosOpen: note.todosOpen,
        mtime: note.mtime,
        size: note.size,
      },
    })
    .run();
}

export function deleteNote(path: string) {
  db.delete(vaultNotes).where(eq(vaultNotes.path, path)).run();
}

export function listNotes() {
  return db.select().from(vaultNotes).all();
}

function basenameNoExt(path: string): string {
  const file = path.split("/").pop() ?? path;
  return file.replace(/\.[^/.]+$/, "").toLowerCase();
}

export interface GraphNode {
  path: string;
  title: string;
  area: string;
  tags: string[];
  todosOpen: number;
  mtime: string;
  highPriority: boolean;
}

export interface GraphEdge {
  source: string;
  target: string;
}

export function buildGraph(): { nodes: GraphNode[]; edges: GraphEdge[] } {
  const rows = listNotes();
  const byBasename = new Map<string, string>();
  for (const row of rows) {
    byBasename.set(basenameNoExt(row.path), row.path);
  }

  const nodes: GraphNode[] = rows.map((row) => {
    const tags = (row.tagsJson as string[] | null) ?? [];
    return {
      path: row.path,
      title: row.title,
      area: row.area ?? "ideen_start",
      tags,
      todosOpen: row.todosOpen,
      mtime: row.mtime,
      highPriority: isHighPriority(tags),
    };
  });

  const seenEdges = new Set<string>();
  const edges: GraphEdge[] = [];
  for (const row of rows) {
    const links = (row.linksJson as string[] | null) ?? [];
    for (const target of links) {
      const resolved = byBasename.get(target.toLowerCase());
      if (!resolved || resolved === row.path) continue;
      const key = [row.path, resolved].sort().join("::");
      if (seenEdges.has(key)) continue;
      seenEdges.add(key);
      edges.push({ source: row.path, target: resolved });
    }
  }

  return { nodes, edges };
}

export interface VaultStats {
  noteCount: number;
  linkCount: number;
  changesToday: number;
  mostActiveRegion: string | null;
}

export function computeStats(): VaultStats {
  const rows = listNotes();
  const { edges } = buildGraph();

  const todayStr = new Date().toISOString().slice(0, 10);
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

  const changesToday = rows.filter((r) => r.mtime.slice(0, 10) === todayStr).length;

  const regionCounts = new Map<string, number>();
  for (const row of rows) {
    if (new Date(row.mtime).getTime() >= sevenDaysAgo) {
      const area = row.area ?? "ideen_start";
      regionCounts.set(area, (regionCounts.get(area) ?? 0) + 1);
    }
  }

  let mostActiveRegion: string | null = null;
  let max = 0;
  for (const [area, count] of regionCounts) {
    if (count > max) {
      max = count;
      mostActiveRegion = area;
    }
  }

  return {
    noteCount: rows.length,
    linkCount: edges.length,
    changesToday,
    mostActiveRegion,
  };
}
