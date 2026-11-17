import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { parseNoteFile, isHighPriority } from "./parse.js";

describe("parseNoteFile", () => {
  let vaultRoot: string;

  beforeEach(() => {
    vaultRoot = mkdtempSync(join(tmpdir(), "ncc-vault-"));
  });

  afterEach(() => {
    rmSync(vaultRoot, { recursive: true, force: true });
  });

  it("liest Frontmatter-Tags, Wikilinks und offene To-dos", () => {
    const dir = join(vaultRoot, "01 Trading");
    mkdirSync(dir, { recursive: true });
    const file = join(dir, "Setup.md");
    writeFileSync(
      file,
      `---\ntags: [setup, review]\n---\n# Mein Setup\n\nSiehe [[Trading - Prop-Firm-Plan]] und [[Andere Notiz|Alias]].\n\n- [ ] Stop Loss prüfen\n- [x] Entry geplant\n- [ ] Risiko berechnen\n`,
    );

    const note = parseNoteFile(file, vaultRoot);

    expect(note.path).toBe("01 Trading/Setup.md");
    expect(note.title).toBe("Mein Setup");
    expect(note.area).toBe("trading");
    expect(note.tags).toContain("setup");
    expect(note.tags).toContain("review");
    expect(note.links).toEqual(expect.arrayContaining(["Trading - Prop-Firm-Plan", "Andere Notiz"]));
    expect(note.todosOpen).toBe(2);
  });

  it("erkennt inline #hashtags im Fließtext", () => {
    const file = join(vaultRoot, "Idee.md");
    writeFileSync(file, "Eine Idee zu #clipping und #content-plan.\n");
    const note = parseNoteFile(file, vaultRoot);
    expect(note.tags).toEqual(expect.arrayContaining(["clipping", "content-plan"]));
  });

  it("markiert Notizen mit Deadline-Frontmatter für hohe Priorität", () => {
    const file = join(vaultRoot, "Deadline.md");
    writeFileSync(file, "---\ndeadline: 2026-12-01\n---\nInhalt\n");
    const note = parseNoteFile(file, vaultRoot);
    expect(note.tags).toContain("hat-deadline");
    expect(isHighPriority(note.tags)).toBe(true);
  });

  it("fällt auf den Dateinamen zurück, wenn kein Titel vorhanden ist", () => {
    const file = join(vaultRoot, "Namenlos.md");
    writeFileSync(file, "Einfacher Text ohne Überschrift.\n");
    const note = parseNoteFile(file, vaultRoot);
    expect(note.title).toBe("Namenlos");
  });
});
