// Positionsgrößen-, Risiko- und R:R-Berechnungen für das Trading-Journal
// (SPEC.md Abschnitt 9). Reine Funktionen, geteilt zwischen Server und
// Frontend, damit die Oberfläche live rechnet und der Server beim Speichern
// exakt dieselben Werte noch einmal validiert. Diese Zahlen entscheiden über
// echtes Geld.

export type TradeDirection = "long" | "short";

export interface InstrumentSpec {
  label: string;
  pipSize: number; // kleinste sinnvolle Preiseinheit (z. B. 0,0001 bei EURUSD, 1 bei NQ)
  valuePerPip: number; // $ je pipSize-Bewegung je 1 Einheit "size" (Lot/Kontrakt/Coin)
}

export const DEFAULT_INSTRUMENT_SPECS: Record<string, InstrumentSpec> = {
  NQ: { label: "NQ (E-mini Nasdaq, $20 je Punkt/Kontrakt)", pipSize: 1, valuePerPip: 20 },
  ES: { label: "ES (E-mini S&P, $50 je Punkt/Kontrakt)", pipSize: 1, valuePerPip: 50 },
  XAUUSD: { label: "XAUUSD (Gold, 100-oz-Lot)", pipSize: 0.01, valuePerPip: 1 },
  EURUSD: { label: "EURUSD (Standardlot, 100.000 Einheiten)", pipSize: 0.0001, valuePerPip: 10 },
  DXY: { label: "DXY (generisch – bitte Kontraktgröße prüfen)", pipSize: 0.01, valuePerPip: 1 },
  US10Y: { label: "US10Y (generisch – bitte Kontraktgröße prüfen)", pipSize: 0.01, valuePerPip: 1 },
  BTC: { label: "BTC (1 $ je 1 $ Bewegung je Coin)", pipSize: 1, valuePerPip: 1 },
  ETH: { label: "ETH (1 $ je 1 $ Bewegung je Coin)", pipSize: 1, valuePerPip: 1 },
};

export const GENERIC_INSTRUMENT_SPEC: InstrumentSpec = {
  label: "Generisch (bitte Wert pro Punkt prüfen)",
  pipSize: 1,
  valuePerPip: 1,
};

export function resolveInstrumentSpec(symbol: string): InstrumentSpec {
  return DEFAULT_INSTRUMENT_SPECS[symbol.toUpperCase()] ?? GENERIC_INSTRUMENT_SPEC;
}

export const SETUP_TYPES = [
  "Fibonacci-Retracement",
  "EMA-Rücklauf",
  "EMA-Cross",
  "Order Block",
  "Fair Value Gap",
  "Break of Structure",
  "Change of Character",
  "Liquidity Sweep",
  "Premium/Discount",
  "Session-Open",
  "News-Trade",
] as const;

export const EMOTION_TAGS = ["ruhig", "FOMO", "Rache", "unsicher", "überzeugt"] as const;

/**
 * Vorzeichenbehaftete Preisbewegung in Richtung des Trades: positiv = günstig
 * (Gewinnrichtung), negativ = ungünstig. Bei Short dreht sich die Richtung um.
 */
export function priceDelta(direction: TradeDirection, from: number, to: number): number {
  return direction === "long" ? to - from : from - to;
}

/** Risiko in Pips/Punkten als positive Größe (Abstand Entry -> Stop Loss). */
export function riskUnits(direction: TradeDirection, entry: number, sl: number, pipSize: number): number {
  return Math.abs(priceDelta(direction, entry, sl)) / pipSize;
}

export function riskUsd(
  direction: TradeDirection,
  entry: number,
  sl: number,
  size: number,
  spec: InstrumentSpec,
): number {
  return riskUnits(direction, entry, sl, spec.pipSize) * spec.valuePerPip * size;
}

export function riskPct(riskUsdValue: number, accountSize: number): number | null {
  if (accountSize <= 0) return null;
  return (riskUsdValue / accountSize) * 100;
}

/** Gewinn/Verlust in Pips/Punkten Richtung Ziel, vorzeichenbehaftet (negativ =
 * Ziel liegt in der falschen Richtung – nützlicher Hinweis auf einen Tippfehler). */
export function rewardUnits(direction: TradeDirection, entry: number, target: number, pipSize: number): number {
  return priceDelta(direction, entry, target) / pipSize;
}

/** R:R für ein einzelnes Ziel. null, wenn kein Risiko definiert ist (SL == Entry). */
export function rrRatio(
  direction: TradeDirection,
  entry: number,
  sl: number,
  target: number,
  pipSize: number,
): number | null {
  const risk = riskUnits(direction, entry, sl, pipSize);
  if (risk === 0) return null;
  return rewardUnits(direction, entry, target, pipSize) / risk;
}

export interface TpAllocation {
  price: number;
  sharePct: number; // Anteil der Position an diesem Ziel, 0-100
}

/** Nach Positionsanteil gewichtetes R:R über TP1-TP3. */
export function weightedRR(
  direction: TradeDirection,
  entry: number,
  sl: number,
  tps: TpAllocation[],
  pipSize: number,
): number | null {
  const valid = tps.filter((t) => Number.isFinite(t.price) && t.sharePct > 0);
  if (valid.length === 0) return null;
  const totalShare = valid.reduce((sum, t) => sum + t.sharePct, 0);
  if (totalShare <= 0) return null;

  const risk = riskUnits(direction, entry, sl, pipSize);
  if (risk === 0) return null;

  const weightedReward = valid.reduce(
    (sum, t) => sum + rewardUnits(direction, entry, t.price, pipSize) * (t.sharePct / totalShare),
    0,
  );
  return weightedReward / risk;
}

/** Erwartetes Ergebnis in $ für ein Ziel bei gegebenem Positionsanteil. */
export function expectedResultUsd(
  direction: TradeDirection,
  entry: number,
  target: number,
  size: number,
  spec: InstrumentSpec,
  sharePct = 100,
): number {
  return rewardUnits(direction, entry, target, spec.pipSize) * spec.valuePerPip * size * (sharePct / 100);
}

/** Tatsächliches Ergebnis in $ aus einem oder mehreren Exit-Preisen (Teilausstiege). */
export function resultUsdFromExits(
  direction: TradeDirection,
  entry: number,
  size: number,
  spec: InstrumentSpec,
  exits: TpAllocation[],
): number {
  return exits.reduce(
    (sum, exit) => sum + expectedResultUsd(direction, entry, exit.price, size, spec, exit.sharePct),
    0,
  );
}

/** Ergebnis in R (Vielfaches des eingegangenen Risikos). null ohne definiertes Risiko. */
export function resultInR(resultUsdValue: number, riskUsdValue: number): number | null {
  if (riskUsdValue <= 0) return null;
  return resultUsdValue / riskUsdValue;
}

/**
 * Positionsgrößen-Rechner: wie viele Lots/Kontrakte/Coins darf ich bei
 * gewünschtem Risiko-% handeln? null, wenn kein Risiko definiert ist.
 */
export function recommendedSize(
  accountSize: number,
  desiredRiskPct: number,
  direction: TradeDirection,
  entry: number,
  sl: number,
  spec: InstrumentSpec,
): number | null {
  const risk = riskUnits(direction, entry, sl, spec.pipSize);
  if (risk <= 0) return null;
  const riskBudgetUsd = accountSize * (desiredRiskPct / 100);
  return riskBudgetUsd / (risk * spec.valuePerPip);
}
