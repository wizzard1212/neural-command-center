import { readFileSync, statSync } from "node:fs";
import { relative, basename, extname } from "node:path";
import matter from "gray-matter";
import { resolveArea, type AreaKey } from "@ncc/shared";

export interface ParsedNote {
  path: string; // relativ zum Vault-Root, mit "/" als Trenner
  title: string;
  area: AreaKey;
  tags: string[];
  links: string[]; // rohe Wikilink-Ziele, noch nicht auf Pfade aufgelöst
  todosOpen: number;
  mtime: string;
  size: number;
}

// Tags, aus denen die Oberfläche "rot pulsierend" ableitet (Abschnitt 4.2).
export function isHighPriority(tags: string[]): boolean {
  return tags.includes("prioritaet-hoch") || tags.includes("hat-deadline");
}

const WIKILINK_RE = /\[\[([^\]|#]+)(?:#[^\]|]+)?(?:\|[^\]]+)?\]\]/g;
const INLINE_TAG_RE = /(^|\s)#([a-zA-Z][\w\-/]*)/g;
const OPEN_TODO_RE = /^\s*[-*]\s\[\s\]\s/gm;
const H1_RE = /^#\s+(.+)$/m;

function toVaultRelativePath(absolutePath: string, vaultRoot: string): string {
  return relative(vaultRoot, absolutePath).split("\\").join("/");
}

function extractTags(frontmatterTags: unknown, body: string): string[] {
  const tags = new Set<string>();

  if (Array.isArray(frontmatterTags)) {
    for (const t of frontmatterTags) tags.add(String(t).replace(/^#/, ""));
  } else if (typeof frontmatterTags === "string") {
    for (const t of frontmatterTags.split(",")) {
      const trimmed = t.trim().replace(/^#/, "");
      if (trimmed) tags.add(trimmed);
    }
  }

  for (const match of body.matchAll(INLINE_TAG_RE)) {
    tags.add(match[2]);
  }

  return [...tags];
}

function extractLinks(body: string): string[] {
  const links = new Set<string>();
  for (const match of body.matchAll(WIKILINK_RE)) {
    links.add(match[1].trim());
  }
  return [...links];
}

export function parseNoteFile(absolutePath: string, vaultRoot: string): ParsedNote {
  const raw = readFileSync(absolutePath, "utf-8");
  const stats = statSync(absolutePath);
  const { data: frontmatter, content: body } = matter(raw);

  const vaultPath = toVaultRelativePath(absolutePath, vaultRoot);
  const tags = extractTags(frontmatter.tags, body);
  const h1Match = body.match(H1_RE);

  const title =
    (typeof frontmatter.title === "string" && frontmatter.title.trim()) ||
    (h1Match ? h1Match[1].trim() : "") ||
    basename(absolutePath, extname(absolutePath));

  const links = extractLinks(body);
  const todosOpen = [...body.matchAll(OPEN_TODO_RE)].length;

  const deadline = frontmatter.deadline ?? frontmatter.due ?? frontmatter.faellig;
  if (deadline && !tags.includes("hat-deadline")) tags.push("hat-deadline");

  const area = resolveArea(vaultPath, tags);

  return {
    path: vaultPath,
    title,
    area,
    tags,
    links,
    todosOpen,
    mtime: stats.mtime.toISOString(),
    size: stats.size,
  };
}
