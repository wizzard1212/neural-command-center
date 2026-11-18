import { env } from "../lib/env.js";

export interface WatchlistQuote {
  instrument: string;
  price: number;
  changePct: number;
}

export interface CollectResult<T> {
  available: boolean;
  data: T | null;
  reason?: string;
}

// FMP-Symbole pro Watchlist-Instrument. FMPs genaue Tickernamen für Futures
// können abweichen – ohne eigenen API-Key nicht gegenprüfbar, bei Bedarf hier
// anpassen (siehe FMP-Dokumentation).
const FMP_SYMBOLS: Record<string, string> = {
  NQ: "NQ=F",
  ES: "ES=F",
  XAUUSD: "XAUUSD",
  EURUSD: "EURUSD",
  DXY: "DX-Y.NYB",
  US10Y: "^TNX",
};

const COINGECKO_IDS: Record<string, string> = {
  BTC: "bitcoin",
  ETH: "ethereum",
};

async function fetchFmpQuotes(symbols: string[]): Promise<WatchlistQuote[]> {
  const url = `https://financialmodelingprep.com/api/v3/quote/${symbols.join(",")}?apikey=${env.FMP_API_KEY}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
  if (!res.ok) throw new Error(`FMP HTTP ${res.status}`);
  const data = (await res.json()) as { symbol: string; price: number; changesPercentage: number }[];

  const bySymbol = new Map(data.map((d) => [d.symbol, d]));
  const results: WatchlistQuote[] = [];
  for (const [instrument, fmpSymbol] of Object.entries(FMP_SYMBOLS)) {
    const quote = bySymbol.get(fmpSymbol);
    if (quote) results.push({ instrument, price: quote.price, changePct: quote.changesPercentage });
  }
  return results;
}

async function fetchCoinGeckoQuotes(): Promise<WatchlistQuote[]> {
  const ids = Object.values(COINGECKO_IDS).join(",");
  const url = `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true`;
  const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
  if (!res.ok) throw new Error(`CoinGecko HTTP ${res.status}`);
  const data = (await res.json()) as Record<string, { usd: number; usd_24h_change: number }>;

  const results: WatchlistQuote[] = [];
  for (const [instrument, geckoId] of Object.entries(COINGECKO_IDS)) {
    const quote = data[geckoId];
    if (quote) results.push({ instrument, price: quote.usd, changePct: quote.usd_24h_change });
  }
  return results;
}

/** Kurse der Watchlist (Abschnitt 5.2). FMP für klassische Instrumente (wenn
 * ein Key hinterlegt ist), CoinGecko für Krypto (funktioniert ohne Key).
 * Ein Fehler bei einer Quelle darf die andere nicht blockieren. */
export async function collectWatchlistPrices(): Promise<CollectResult<WatchlistQuote[]>> {
  const quotes: WatchlistQuote[] = [];
  const reasons: string[] = [];

  if (env.FMP_API_KEY) {
    try {
      quotes.push(...(await fetchFmpQuotes(Object.values(FMP_SYMBOLS))));
    } catch (err) {
      reasons.push(`FMP: ${(err as Error).message}`);
    }
  } else {
    reasons.push("FMP_API_KEY fehlt – klassische Instrumente nicht verfügbar.");
  }

  try {
    quotes.push(...(await fetchCoinGeckoQuotes()));
  } catch (err) {
    reasons.push(`CoinGecko: ${(err as Error).message}`);
  }

  return {
    available: quotes.length > 0,
    data: quotes.length > 0 ? quotes : null,
    reason: reasons.length > 0 ? reasons.join(" ") : undefined,
  };
}

export async function collectEconomicCalendar(from: string, to: string): Promise<CollectResult<unknown[]>> {
  if (!env.FMP_API_KEY) {
    return { available: false, data: null, reason: "FMP_API_KEY fehlt." };
  }
  try {
    const url = `https://financialmodelingprep.com/api/v3/economic_calendar?from=${from}&to=${to}&apikey=${env.FMP_API_KEY}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = (await res.json()) as unknown[];
    return { available: true, data };
  } catch (err) {
    return { available: false, data: null, reason: (err as Error).message };
  }
}

const COT_SYMBOLS = ["GC", "EUR", "NQ", "CL", "BTC"]; // Gold, Euro, Nasdaq, Öl, Bitcoin

export async function collectCotData(): Promise<CollectResult<unknown[]>> {
  if (!env.FMP_API_KEY) {
    return { available: false, data: null, reason: "FMP_API_KEY fehlt." };
  }
  try {
    const results = await Promise.all(
      COT_SYMBOLS.map(async (symbol) => {
        const url = `https://financialmodelingprep.com/api/v4/commitment_of_traders_report/${symbol}?apikey=${env.FMP_API_KEY}`;
        const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
        if (!res.ok) return null;
        const data = (await res.json()) as unknown[];
        return { symbol, latest: data?.[0] ?? null };
      }),
    );
    const filtered = results.filter((r) => r !== null);
    return { available: filtered.length > 0, data: filtered.length > 0 ? filtered : null };
  } catch (err) {
    return { available: false, data: null, reason: (err as Error).message };
  }
}
