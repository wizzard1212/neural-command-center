import { describe, expect, it } from "vitest";
import { winRatePct, profitFactor, averageR, maxDrawdownR, longestStreak, groupStats } from "./journalStats.js";

const trades = [
  { resultR: 2, resultUsd: 400, closedAt: "2026-01-01" },
  { resultR: -1, resultUsd: -200, closedAt: "2026-01-02" },
  { resultR: 1.5, resultUsd: 300, closedAt: "2026-01-03" },
  { resultR: -1, resultUsd: -200, closedAt: "2026-01-04" },
  { resultR: -1, resultUsd: -200, closedAt: "2026-01-05" },
  { resultR: 3, resultUsd: 600, closedAt: "2026-01-06" },
];

describe("winRatePct", () => {
  it("berechnet den Anteil der Gewinn-Trades", () => {
    expect(winRatePct(trades)).toBeCloseTo((3 / 6) * 100);
  });

  it("ignoriert noch offene Trades ohne Ergebnis", () => {
    const withOpen = [...trades, { resultR: null, resultUsd: null, closedAt: null }];
    expect(winRatePct(withOpen)).toBeCloseTo((3 / 6) * 100);
  });

  it("liefert null ohne geschlossene Trades", () => {
    expect(winRatePct([])).toBeNull();
  });
});

describe("profitFactor", () => {
  it("berechnet Bruttogewinn / Bruttoverlust", () => {
    // Gewinne: 400+300+600=1300, Verluste: 200+200+200=600
    expect(profitFactor(trades)).toBeCloseTo(1300 / 600);
  });

  it("liefert Infinity ohne Verluste", () => {
    const onlyWins = trades.filter((t) => t.resultR! > 0);
    expect(profitFactor(onlyWins)).toBe(Infinity);
  });

  it("liefert null ohne Trades", () => {
    expect(profitFactor([])).toBeNull();
  });
});

describe("averageR", () => {
  it("berechnet den Durchschnitt des R-Ergebnisses (Erwartungswert)", () => {
    const sum = 2 - 1 + 1.5 - 1 - 1 + 3;
    expect(averageR(trades)).toBeCloseTo(sum / 6);
  });
});

describe("maxDrawdownR", () => {
  it("findet den größten Rückgang der kumulierten R-Kurve", () => {
    // Kumuliert: 2, 1, 2.5, 1.5, 0.5, 3.5 -> höchster Peak vor dem Tief ist
    // 2.5 (nach Trade 3), Tiefpunkt danach 0.5 (nach Trade 5) -> Drawdown 2
    expect(maxDrawdownR(trades)).toBeCloseTo(2);
  });

  it("liefert 0 bei durchgehend steigender Kurve", () => {
    const winningStreak = [
      { resultR: 1, resultUsd: 100, closedAt: "2026-01-01" },
      { resultR: 2, resultUsd: 200, closedAt: "2026-01-02" },
    ];
    expect(maxDrawdownR(winningStreak)).toBe(0);
  });
});

describe("longestStreak", () => {
  it("findet die längste Verlustserie", () => {
    // Reihenfolge der Ergebnisse: W, L, W, L, L, W -> längste Verlustserie = 2 (Trade 4+5)
    expect(longestStreak(trades, "loss")).toBe(2);
  });

  it("findet die längste Gewinnserie", () => {
    // Keine zwei aufeinanderfolgenden Gewinn-Trades in den Testdaten -> längste Serie = 1
    expect(longestStreak(trades, "win")).toBe(1);
  });

  it("erkennt eine längere Gewinnserie in anderen Daten", () => {
    const series = [
      { resultR: 1, resultUsd: 100, closedAt: "2026-01-01" },
      { resultR: 1, resultUsd: 100, closedAt: "2026-01-02" },
      { resultR: 1, resultUsd: 100, closedAt: "2026-01-03" },
      { resultR: -1, resultUsd: -100, closedAt: "2026-01-04" },
    ];
    expect(longestStreak(series, "win")).toBe(3);
  });
});

describe("groupStats", () => {
  it("gruppiert Trades nach einem beliebigen Schlüssel und berechnet Kennzahlen je Gruppe", () => {
    const tagged = [
      { resultR: 2, resultUsd: 400, closedAt: "2026-01-01", setups: ["A"] },
      { resultR: -1, resultUsd: -200, closedAt: "2026-01-02", setups: ["A"] },
      { resultR: 3, resultUsd: 600, closedAt: "2026-01-03", setups: ["B"] },
    ];
    const stats = groupStats(tagged, (t) => t.setups);
    const a = stats.find((s) => s.key === "A")!;
    const b = stats.find((s) => s.key === "B")!;
    expect(a.count).toBe(2);
    expect(a.winRatePct).toBeCloseTo(50);
    expect(b.count).toBe(1);
    expect(b.winRatePct).toBeCloseTo(100);
  });
});
