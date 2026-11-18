import { DEFAULT_WATCHLIST } from "@ncc/shared";

// Gängige Alias-Schreibweisen in Social-Posts, die auf Merlins Watchlist-Symbole
// gemappt werden. Rein additiv zur Watchlist selbst (Abschnitt 7.1: "Erwähnungs-
// häufigkeit von Tickern").
const ALIASES: Record<string, (typeof DEFAULT_WATCHLIST)[number]> = {
  GOLD: "XAUUSD",
  XAU: "XAUUSD",
  NASDAQ: "NQ",
  NAS100: "NQ",
  "US100": "NQ",
  SPX: "ES",
  "S&P500": "ES",
  "US500": "ES",
  BITCOIN: "BTC",
  ETHEREUM: "ETH",
  DOLLAR: "DXY",
  DXY: "DXY",
};

const SYMBOL_PATTERN = new RegExp(
  `\\b(${[...DEFAULT_WATCHLIST, ...Object.keys(ALIASES)].map((s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})\\b`,
  "gi",
);

/** Findet alle Watchlist-Symbole (inkl. Aliasen), die in einem Text erwähnt
 * werden, z. B. für Reddit-Posttitel oder YouTube-Videotitel. */
export function findMentionedSymbols(text: string): string[] {
  const matches = text.toUpperCase().match(SYMBOL_PATTERN) ?? [];
  const resolved = matches.map((m) => ALIASES[m] ?? (m as (typeof DEFAULT_WATCHLIST)[number]));
  return [...new Set(resolved)];
}
