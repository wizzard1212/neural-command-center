import { describe, expect, it } from "vitest";
import {
  dailyLossLimitUsd,
  dailyLossBufferPct,
  maxLossLimitUsd,
  maxLossBufferPct,
  peakEquityFromHistory,
  trafficLight,
  profitTargetProgressPct,
  copyRiskCalculator,
  consistencyPct,
  passesConsistency,
  countTradingDays,
  countProfitableDays,
  daysUntilInactive,
  costsAndRoi,
} from "./risk.js";

describe("dailyLossLimitUsd", () => {
  it("nimmt den höheren Wert aus Balance/Equity (Beispiel aus SPEC.md: 3%)", () => {
    // Balance 200.000, Equity 198.500 (offene Verluste) -> höherer Wert ist Balance
    const limit = dailyLossLimitUsd("higher_of_balance_equity", 3, 200_000, 198_500);
    expect(limit).toBeCloseTo(6000);
  });

  it("nimmt den höheren Wert, wenn Equity über der Balance liegt", () => {
    const limit = dailyLossLimitUsd("higher_of_balance_equity", 3, 200_000, 205_000);
    expect(limit).toBeCloseTo(6150);
  });

  it("rechnet reinen Balance-Modus korrekt", () => {
    expect(dailyLossLimitUsd("balance", 5, 100_000, 90_000)).toBeCloseTo(5000);
  });

  it("rechnet reinen Equity-Modus korrekt", () => {
    expect(dailyLossLimitUsd("equity", 5, 100_000, 90_000)).toBeCloseTo(4500);
  });
});

describe("dailyLossBufferPct", () => {
  it("ist 100% ohne Verlust", () => {
    expect(dailyLossBufferPct(6000, 0)).toBe(100);
  });

  it("sinkt proportional zum Tagesverlust", () => {
    expect(dailyLossBufferPct(6000, -3000)).toBe(50);
  });

  it("geht nicht unter 0, auch bei Verlust über dem Limit hinaus", () => {
    expect(dailyLossBufferPct(6000, -9000)).toBe(0);
  });

  it("ignoriert Tagesgewinne (Puffer bleibt 100%)", () => {
    expect(dailyLossBufferPct(6000, 2000)).toBe(100);
  });
});

describe("maxLoss: statisch vs. trailing", () => {
  it("statisch: Referenz bleibt die Startbalance, auch wenn Equity gestiegen ist", () => {
    const limit = maxLossLimitUsd("static", 10, 200_000, 250_000);
    expect(limit).toBeCloseTo(20_000); // 10% von 200.000, nicht von 250.000

    const buffer = maxLossBufferPct("static", 10, 200_000, 250_000, 240_000);
    // erlaubter Drawdown 20.000 ab Referenz 200.000 -> Floor bei 180.000.
    // Aktuelle Equity 240.000 liegt über der Startbalance, also kein Drawdown verbraucht.
    expect(buffer).toBe(100);
  });

  it("statisch: Puffer sinkt, wenn Equity unter die Startbalance fällt", () => {
    const buffer = maxLossBufferPct("static", 10, 200_000, 200_000, 190_000);
    // erlaubter Drawdown 20.000, davon 10.000 verbraucht -> 50% Puffer
    expect(buffer).toBe(50);
  });

  it("trailing: Referenz folgt dem bisherigen Equity-Hoch", () => {
    const peak = peakEquityFromHistory(200_000, [205_000, 230_000, 210_000]);
    expect(peak).toBe(230_000);

    const limit = maxLossLimitUsd("trailing", 10, 200_000, peak);
    expect(limit).toBeCloseTo(23_000); // 10% von 230.000 (Peak), nicht von 200.000 (Start)

    // Equity jetzt bei 215.000: Drawdown vom Peak = 15.000 von erlaubten 23.000
    const buffer = maxLossBufferPct("trailing", 10, 200_000, peak, 215_000);
    expect(buffer).toBeCloseTo(((23_000 - 15_000) / 23_000) * 100);
  });

  it("trailing bestraft einen Rückgang vom Hoch strenger als statisch denselben Rückgang vom Start", () => {
    const peak = 230_000;
    const trailingBuffer = maxLossBufferPct("trailing", 10, 200_000, peak, 215_000);
    const staticBuffer = maxLossBufferPct("static", 10, 200_000, peak, 215_000);
    expect(trailingBuffer).toBeLessThan(staticBuffer);
  });
});

describe("trafficLight", () => {
  it("grün über 60%", () => {
    expect(trafficLight(75).color).toBe("green");
    expect(trafficLight(61).color).toBe("green");
  });

  it("gelb zwischen 30% und 60%", () => {
    expect(trafficLight(60).color).toBe("yellow");
    expect(trafficLight(30).color).toBe("yellow");
    expect(trafficLight(45).color).toBe("yellow");
  });

  it("rot unter 30%, pulsierend erst unter 15%", () => {
    const at29 = trafficLight(29.9);
    expect(at29.color).toBe("red");
    expect(at29.pulsing).toBe(false);

    const at14 = trafficLight(14.9);
    expect(at14.color).toBe("red");
    expect(at14.pulsing).toBe(true);
  });
});

describe("profitTargetProgressPct", () => {
  it("berechnet Fortschritt zum Phasenziel", () => {
    // Ziel 10% von 200.000 = 20.000; aktuell 10.000 Gewinn -> 50%
    expect(profitTargetProgressPct(200_000, 10, 210_000)).toBeCloseTo(50);
  });

  it("liefert null ohne gesetztes Ziel", () => {
    expect(profitTargetProgressPct(200_000, null, 210_000)).toBeNull();
    expect(profitTargetProgressPct(200_000, 0, 210_000)).toBeNull();
  });

  it("deckelt bei 100%, auch wenn das Ziel übertroffen wurde", () => {
    expect(profitTargetProgressPct(200_000, 10, 500_000)).toBe(100);
  });

  it("geht nicht unter 0% bei Verlust", () => {
    expect(profitTargetProgressPct(200_000, 10, 150_000)).toBe(0);
  });
});

describe("copyRiskCalculator", () => {
  it("skaliert das Risiko proportional zur Kontogröße", () => {
    const result = copyRiskCalculator(1, [
      { id: 1, size: 200_000, dailyLossLimitUsd: 6000 }, // Summer 10/5, 3%
      { id: 2, size: 100_000, dailyLossLimitUsd: 4000 }, // High Stakes, 4%
    ]);
    expect(result.perAccount).toEqual([
      { id: 1, riskUsd: 2000 },
      { id: 2, riskUsd: 1000 },
    ]);
    expect(result.totalRiskUsd).toBe(3000);
  });

  it("erkennt das strengste Konto am kleinsten Tagesverlust-Limit in $", () => {
    const result = copyRiskCalculator(1, [
      { id: 1, size: 200_000, dailyLossLimitUsd: 6000 },
      { id: 2, size: 100_000, dailyLossLimitUsd: 2000 },
    ]);
    expect(result.strictestAccountId).toBe(2);
    expect(result.strictestLimitUsd).toBe(2000);
  });

  it("warnt, wenn das kopierte Risiko das strengste Tageslimit überschreiten würde", () => {
    const result = copyRiskCalculator(3, [
      { id: 1, size: 200_000, dailyLossLimitUsd: 6000 },
      { id: 2, size: 100_000, dailyLossLimitUsd: 2000 }, // 3% von 100k = 3000 > 2000 Limit
    ]);
    expect(result.exceedsStrictest).toBe(true);
  });

  it("warnt nicht, wenn alle Konten innerhalb ihres Limits bleiben", () => {
    const result = copyRiskCalculator(1, [
      { id: 1, size: 200_000, dailyLossLimitUsd: 6000 },
      { id: 2, size: 100_000, dailyLossLimitUsd: 2000 },
    ]);
    expect(result.exceedsStrictest).toBe(false);
  });

  it("verhält sich bei leerer Copy-Gruppe sauber", () => {
    const result = copyRiskCalculator(1, []);
    expect(result.totalRiskUsd).toBe(0);
    expect(result.strictestAccountId).toBeNull();
    expect(result.exceedsStrictest).toBe(false);
  });
});

describe("Konsistenzregel", () => {
  it("berechnet den Anteil des größten Tages am Gesamtgewinn", () => {
    // Tage: +1000, +4000, +500, -500 -> Gesamt 5000, größter Tag 4000 -> 80%
    const pct = consistencyPct([1000, 4000, 500, -500]);
    expect(pct).toBeCloseTo(80);
  });

  it("liefert null ohne Gesamtgewinn", () => {
    expect(consistencyPct([-100, -200])).toBeNull();
    expect(consistencyPct([])).toBeNull();
  });

  it("passesConsistency vergleicht gegen die erlaubte Obergrenze", () => {
    expect(passesConsistency(45, 50)).toBe(true);
    expect(passesConsistency(55, 50)).toBe(false);
    expect(passesConsistency(null, 50)).toBeNull();
  });
});

describe("Handelstage", () => {
  it("zählt nur Tage mit tatsächlicher Aktivität", () => {
    expect(countTradingDays([100, 0, -50, 0, 200])).toBe(3);
  });

  it("zählt profitable Tage ab der Mindestschwelle (z. B. 0,5%)", () => {
    // Startbalance 200.000, Schwelle 0,5% = 1000
    expect(countProfitableDays([1500, 900, -200, 1000, 0], 200_000, 0.5)).toBe(2);
  });
});

describe("daysUntilInactive", () => {
  it("zählt die verbleibenden Tage bis zur Inaktivitätsfrist herunter", () => {
    const lastActivity = new Date("2026-01-01T00:00:00Z");
    const now = new Date("2026-01-20T00:00:00Z");
    expect(daysUntilInactive(lastActivity, 60, now)).toBe(41);
  });

  it("geht nicht unter 0", () => {
    const lastActivity = new Date("2026-01-01T00:00:00Z");
    const now = new Date("2026-05-01T00:00:00Z");
    expect(daysUntilInactive(lastActivity, 60, now)).toBe(0);
  });
});

describe("costsAndRoi", () => {
  it("berechnet Netto-Gewinn und ROI relativ zu den Kosten", () => {
    const result = costsAndRoi(249, [{ net: 2400 }, { net: 1200 }]);
    expect(result.netProfit).toBeCloseTo(3351);
    expect(result.roiPct).toBeCloseTo((3351 / 249) * 100);
  });

  it("liefert roiPct=null ohne Kosten, um Division durch 0 zu vermeiden", () => {
    const result = costsAndRoi(0, [{ net: 100 }]);
    expect(result.roiPct).toBeNull();
    expect(result.netProfit).toBe(100);
  });
});
