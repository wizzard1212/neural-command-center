import { describe, expect, it } from "vitest";
import {
  riskUnits,
  riskUsd,
  riskPct,
  rrRatio,
  weightedRR,
  expectedResultUsd,
  resultUsdFromExits,
  resultInR,
  recommendedSize,
  resolveInstrumentSpec,
  DEFAULT_INSTRUMENT_SPECS,
  GENERIC_INSTRUMENT_SPEC,
} from "./journalCalc.js";

const EURUSD = DEFAULT_INSTRUMENT_SPECS.EURUSD; // pipSize 0.0001, valuePerPip 10
const NQ = DEFAULT_INSTRUMENT_SPECS.NQ; // pipSize 1, valuePerPip 20

describe("riskUnits / riskUsd", () => {
  it("berechnet das Risiko in Pips für einen Long-Trade", () => {
    // Entry 1.1000, SL 1.0950 -> 50 Pips Risiko
    expect(riskUnits("long", 1.1, 1.095, EURUSD.pipSize)).toBeCloseTo(50);
  });

  it("berechnet das Risiko in Pips für einen Short-Trade (SL über Entry)", () => {
    expect(riskUnits("short", 1.1, 1.105, EURUSD.pipSize)).toBeCloseTo(50);
  });

  it("liefert dieselbe positive Risikogröße, auch wenn der SL versehentlich falsch herum steht", () => {
    // SL "falsch" auf der Gewinnseite gesetzt - Risiko bleibt als Betrag positiv
    expect(riskUnits("long", 1.1, 1.105, EURUSD.pipSize)).toBeCloseTo(50);
  });

  it("rechnet Pips in Dollar um (1 Standardlot EURUSD, 50 Pips)", () => {
    const risk = riskUsd("long", 1.1, 1.095, 1, EURUSD);
    expect(risk).toBeCloseTo(500); // 50 Pips * $10/Pip * 1 Lot
  });

  it("funktioniert für Futures mit Punktwerten (NQ, 20 Punkte Risiko)", () => {
    const risk = riskUsd("long", 18000, 17980, 1, NQ);
    expect(risk).toBeCloseTo(400); // 20 Punkte * $20/Punkt * 1 Kontrakt
  });
});

describe("riskPct", () => {
  it("berechnet den Risiko-Prozentsatz relativ zur Kontogröße", () => {
    expect(riskPct(500, 50_000)).toBeCloseTo(1);
  });

  it("liefert null bei Kontogröße 0", () => {
    expect(riskPct(500, 0)).toBeNull();
  });
});

describe("rrRatio", () => {
  it("berechnet R:R 1:2 für einen Long-Trade", () => {
    // Risiko 50 Pips, Ziel 100 Pips entfernt -> R:R 2
    const rr = rrRatio("long", 1.1, 1.095, 1.11, EURUSD.pipSize);
    expect(rr).toBeCloseTo(2);
  });

  it("berechnet R:R korrekt für Short-Trades", () => {
    const rr = rrRatio("short", 1.1, 1.105, 1.09, EURUSD.pipSize);
    expect(rr).toBeCloseTo(2);
  });

  it("liefert ein negatives R:R, wenn das Ziel in der falschen Richtung liegt (Tippfehler-Warnung)", () => {
    const rr = rrRatio("long", 1.1, 1.095, 1.095, EURUSD.pipSize);
    expect(rr).toBeLessThan(0);
  });

  it("liefert null ohne definiertes Risiko (SL == Entry)", () => {
    expect(rrRatio("long", 1.1, 1.1, 1.11, EURUSD.pipSize)).toBeNull();
  });
});

describe("weightedRR", () => {
  it("gewichtet mehrere Teilziele nach Positionsanteil", () => {
    // Risiko 50 Pips. TP1 +50 Pips (R:R 1) zu 50%, TP2 +150 Pips (R:R 3) zu 50%
    // -> gewichtet (1*0.5 + 3*0.5) = 2
    const rr = weightedRR(
      "long",
      1.1,
      1.095,
      [
        { price: 1.105, sharePct: 50 },
        { price: 1.115, sharePct: 50 },
      ],
      EURUSD.pipSize,
    );
    expect(rr).toBeCloseTo(2);
  });

  it("normalisiert Anteile, die nicht exakt 100% ergeben", () => {
    const rr = weightedRR(
      "long",
      1.1,
      1.095,
      [
        { price: 1.105, sharePct: 50 }, // R:R 1
        { price: 1.115, sharePct: 50 }, // R:R 3
      ],
      EURUSD.pipSize,
    );
    const rrScaled = weightedRR(
      "long",
      1.1,
      1.095,
      [
        { price: 1.105, sharePct: 25 }, // gleiche Verhältnisse, halbe Summe
        { price: 1.115, sharePct: 25 },
      ],
      EURUSD.pipSize,
    );
    expect(rrScaled).toBeCloseTo(rr!);
  });

  it("ignoriert Ziele mit 0% Anteil", () => {
    const rr = weightedRR(
      "long",
      1.1,
      1.095,
      [
        { price: 1.105, sharePct: 100 },
        { price: 1.2, sharePct: 0 },
      ],
      EURUSD.pipSize,
    );
    expect(rr).toBeCloseTo(1);
  });

  it("liefert null ohne gültige Ziele", () => {
    expect(weightedRR("long", 1.1, 1.095, [], EURUSD.pipSize)).toBeNull();
  });
});

describe("expectedResultUsd / resultUsdFromExits", () => {
  it("berechnet das erwartete Ergebnis für ein volles Ziel", () => {
    const result = expectedResultUsd("long", 1.1, 1.11, 1, EURUSD);
    expect(result).toBeCloseTo(1000); // 100 Pips * $10 * 1 Lot
  });

  it("skaliert mit dem Positionsanteil", () => {
    const result = expectedResultUsd("long", 1.1, 1.11, 1, EURUSD, 50);
    expect(result).toBeCloseTo(500);
  });

  it("summiert mehrere Teilausstiege zum Gesamtergebnis", () => {
    const result = resultUsdFromExits("long", 1.1, 1, EURUSD, [
      { price: 1.105, sharePct: 50 }, // +50 Pips auf 50% -> $250
      { price: 1.095, sharePct: 50 }, // -50 Pips auf 50% -> -$250
    ]);
    expect(result).toBeCloseTo(0);
  });

  it("rechnet Short-Trades korrekt (Gewinn bei fallendem Preis)", () => {
    const result = expectedResultUsd("short", 1.1, 1.09, 1, EURUSD);
    expect(result).toBeCloseTo(1000);
  });
});

describe("resultInR", () => {
  it("drückt das Ergebnis als Vielfaches des Risikos aus", () => {
    expect(resultInR(1000, 500)).toBeCloseTo(2);
    expect(resultInR(-250, 500)).toBeCloseTo(-0.5);
  });

  it("liefert null ohne definiertes Risiko", () => {
    expect(resultInR(1000, 0)).toBeNull();
  });
});

describe("recommendedSize", () => {
  it("empfiehlt die Positionsgröße für ein gewünschtes Risiko-%", () => {
    // 1% von 50.000 = 500$ Risiko-Budget, 50 Pips * $10/Pip = $500/Lot -> 1 Lot
    const size = recommendedSize(50_000, 1, "long", 1.1, 1.095, EURUSD);
    expect(size).toBeCloseTo(1);
  });

  it("liefert null ohne definiertes Risiko", () => {
    expect(recommendedSize(50_000, 1, "long", 1.1, 1.1, EURUSD)).toBeNull();
  });

  it("skaliert linear mit dem gewünschten Risiko-%", () => {
    const size1 = recommendedSize(50_000, 1, "long", 1.1, 1.095, EURUSD)!;
    const size2 = recommendedSize(50_000, 2, "long", 1.1, 1.095, EURUSD)!;
    expect(size2).toBeCloseTo(size1 * 2);
  });
});

describe("resolveInstrumentSpec", () => {
  it("findet bekannte Instrumente unabhängig von Groß-/Kleinschreibung", () => {
    expect(resolveInstrumentSpec("eurusd")).toEqual(DEFAULT_INSTRUMENT_SPECS.EURUSD);
    expect(resolveInstrumentSpec("NQ")).toEqual(DEFAULT_INSTRUMENT_SPECS.NQ);
  });

  it("fällt bei unbekannten Instrumenten auf die generische Spezifikation zurück", () => {
    expect(resolveInstrumentSpec("GBPJPY")).toEqual(GENERIC_INSTRUMENT_SPEC);
  });
});
