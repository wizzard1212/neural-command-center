// Abschnitt 8.4, "Variante C (immer verfügbar): manuell / Import ... oder
// MT5-Kontoauszug (HTML/CSV-Export) importieren." Statt einer Live-Verbindung
// (Variante A/B, aus Sicherheitsgründen bewusst nicht gebaut) liest Merlin den
// Kontoauszug einmalig aus MT5 (Rechtsklick auf "Konto-Historie" -> "Bericht"
// bzw. "Export to CSV") und lädt die Datei hoch.
//
// MT5-Exporte können je nach Terminal-Sprache unterschiedliche Spalten-
// überschriften haben (z. B. Englisch "Profit"/"Balance" oder Deutsch
// "Gewinn"/"Saldo") – die Spalten werden deshalb über die Kopfzeile erkannt,
// nicht über feste Positionen. Ohne reale Beispieldatei von Merlin ist das
// Format nicht hundertprozentig absicherbar; bei unbekanntem Aufbau wird ein
// klarer Fehler zurückgegeben statt stillschweigend falsche Daten zu erzeugen.

export interface ImportedDay {
  date: string; // YYYY-MM-DD
  balance: number; // Saldo am Ende des Tages (letzter bekannter Running-Balance-Wert)
  dailyPnl: number; // Summe aus Profit+Commission+Swap der Trades dieses Tages (ohne Ein-/Auszahlungen)
}

export type ImportResult = { ok: true; days: ImportedDay[] } | { ok: false, reason: string };

const COLUMN_ALIASES: Record<string, string[]> = {
  time: ["time", "zeit"],
  type: ["type", "typ"],
  profit: ["profit", "gewinn"],
  commission: ["commission", "kommission", "provision"],
  swap: ["swap"],
  balance: ["balance", "saldo"],
};

function normalizeHeader(cell: string): string {
  return cell.trim().toLowerCase();
}

function findColumnIndex(headerCells: string[], aliases: string[]): number {
  return headerCells.findIndex((c) => aliases.includes(normalizeHeader(c)));
}

/** Deutsche und englische MT5-Exporte nutzen Komma oder Punkt als Dezimal-
 * trennzeichen, teils mit Tausendertrennzeichen/NBSP. */
function parseNumber(raw: string): number {
  let s = raw.replace(/ /g, " ").trim().replace(/\s/g, "");
  if (s === "" || s === "-") return 0;
  if (s.includes(",") && s.includes(".")) {
    // Das zuletzt auftretende Zeichen ist das Dezimaltrennzeichen.
    if (s.lastIndexOf(",") > s.lastIndexOf(".")) s = s.replace(/\./g, "").replace(",", ".");
    else s = s.replace(/,/g, "");
  } else if (s.includes(",")) {
    s = s.replace(",", ".");
  }
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
}

const DATE_PREFIX = /^(\d{4})[.\-](\d{2})[.\-](\d{2})/;

function extractDate(raw: string): string | null {
  const match = DATE_PREFIX.exec(raw.trim());
  if (!match) return null;
  return `${match[1]}-${match[2]}-${match[3]}`;
}

/** Fasst Deal-Zeilen zu Tages-Salden zusammen. Ein-/Auszahlungen (Type
 * "balance"/"saldo" o.ä., keine echte Dealrichtung) fließen in den
 * Running-Balance ein, aber nicht in den Trading-Tages-P&L. */
function aggregateDays(
  rows: { date: string; type: string; profit: number; commission: number; swap: number; balance: number | null }[],
): ImportedDay[] {
  const byDate = new Map<string, { lastBalance: number | null; pnl: number }>();
  for (const row of rows) {
    const entry = byDate.get(row.date) ?? { lastBalance: null, pnl: 0 };
    if (row.balance !== null) entry.lastBalance = row.balance;
    const isTradingResult = !["balance", "saldo", "credit"].includes(row.type.toLowerCase());
    if (isTradingResult) entry.pnl += row.profit + row.commission + row.swap;
    byDate.set(row.date, entry);
  }

  return [...byDate.entries()]
    .filter(([, v]) => v.lastBalance !== null)
    .map(([date, v]) => ({ date, balance: v.lastBalance!, dailyPnl: v.pnl }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

/** MT5 "Export to CSV" (Konto-Historie, rechte Maustaste). Trennzeichen wird
 * aus der ersten Zeile erkannt (Tab, Semikolon oder Komma). */
export function parseCsvStatement(text: string): ImportResult {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) return { ok: false, reason: "Datei enthält keine verwertbaren Zeilen." };

  const delimiter = lines[0].includes("\t") ? "\t" : lines[0].includes(";") ? ";" : ",";
  const header = lines[0].split(delimiter).map((c) => c.replace(/"/g, ""));

  const idx = {
    time: findColumnIndex(header, COLUMN_ALIASES.time),
    type: findColumnIndex(header, COLUMN_ALIASES.type),
    profit: findColumnIndex(header, COLUMN_ALIASES.profit),
    commission: findColumnIndex(header, COLUMN_ALIASES.commission),
    swap: findColumnIndex(header, COLUMN_ALIASES.swap),
    balance: findColumnIndex(header, COLUMN_ALIASES.balance),
  };
  if (idx.time === -1 || idx.profit === -1) {
    return { ok: false, reason: 'CSV-Kopfzeile unbekannt – erwarte u. a. Spalten "Time"/"Zeit" und "Profit"/"Gewinn".' };
  }

  const rows = [];
  for (const line of lines.slice(1)) {
    const cells = line.split(delimiter).map((c) => c.replace(/"/g, ""));
    const date = extractDate(cells[idx.time] ?? "");
    if (!date) continue;
    rows.push({
      date,
      type: cells[idx.type] ?? "",
      profit: parseNumber(cells[idx.profit] ?? "0"),
      commission: idx.commission >= 0 ? parseNumber(cells[idx.commission] ?? "0") : 0,
      swap: idx.swap >= 0 ? parseNumber(cells[idx.swap] ?? "0") : 0,
      balance: idx.balance >= 0 ? parseNumber(cells[idx.balance] ?? "") : null,
    });
  }

  if (rows.length === 0) return { ok: false, reason: "Keine Deal-Zeilen mit erkennbarem Datum gefunden." };
  return { ok: true, days: aggregateDays(rows) };
}

function stripTags(html: string): string {
  return html
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .trim();
}

/** MT5 "Bericht speichern unter" (Konto-Historie) exportiert eine einzelne
 * HTML-Tabelle mit Abschnitten ("Positions", "Orders", "Deals", "Results").
 * Es wird gezielt der "Deals"-Abschnitt gesucht: die Zeile mit dem alleinigen
 * Zellinhalt "Deals"/"Geschäfte", danach die Kopfzeile, danach Datenzeilen bis
 * eine Zeile ohne erkennbares Datum in der Zeit-Spalte kommt (nächster
 * Abschnitt oder Zusammenfassung). */
export function parseHtmlStatement(html: string): ImportResult {
  const rowMatches = [...html.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)];
  if (rowMatches.length === 0) return { ok: false, reason: "Keine Tabellenzeilen im HTML gefunden." };

  const rows = rowMatches.map((m) => [...m[1].matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)].map((c) => stripTags(c[1])));

  const dealsSectionIndex = rows.findIndex((cells) => {
    const nonEmpty = cells.filter((c) => c.length > 0);
    return nonEmpty.length === 1 && /^deals$|^gesch[aä]fte$/i.test(nonEmpty[0]);
  });
  if (dealsSectionIndex === -1 || dealsSectionIndex + 1 >= rows.length) {
    return { ok: false, reason: 'Abschnitt "Deals" im Bericht nicht gefunden.' };
  }

  const header = rows[dealsSectionIndex + 1];
  const idx = {
    time: findColumnIndex(header, COLUMN_ALIASES.time),
    type: findColumnIndex(header, COLUMN_ALIASES.type),
    profit: findColumnIndex(header, COLUMN_ALIASES.profit),
    commission: findColumnIndex(header, COLUMN_ALIASES.commission),
    swap: findColumnIndex(header, COLUMN_ALIASES.swap),
    balance: findColumnIndex(header, COLUMN_ALIASES.balance),
  };
  if (idx.time === -1 || idx.profit === -1) {
    return { ok: false, reason: 'Spalten im "Deals"-Abschnitt nicht erkannt (erwarte u. a. "Time"/"Zeit", "Profit"/"Gewinn").' };
  }

  const dataRows: typeof rows = [];
  for (let i = dealsSectionIndex + 2; i < rows.length; i++) {
    const date = extractDate(rows[i][idx.time] ?? "");
    if (!date) break; // nächster Abschnitt oder Ende der Tabelle erreicht
    dataRows.push(rows[i]);
  }

  if (dataRows.length === 0) return { ok: false, reason: "Keine Deal-Zeilen im Bericht gefunden." };

  const parsedRows = dataRows.map((cells) => ({
    date: extractDate(cells[idx.time])!,
    type: cells[idx.type] ?? "",
    profit: parseNumber(cells[idx.profit] ?? "0"),
    commission: idx.commission >= 0 ? parseNumber(cells[idx.commission] ?? "0") : 0,
    swap: idx.swap >= 0 ? parseNumber(cells[idx.swap] ?? "0") : 0,
    balance: idx.balance >= 0 ? parseNumber(cells[idx.balance] ?? "") : null,
  }));

  return { ok: true, days: aggregateDays(parsedRows) };
}
