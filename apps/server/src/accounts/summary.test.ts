import { describe, expect, it } from "vitest";
import { splitSnapshotsForToday, computeAccountSummary, type AccountRuleConfig } from "./summary.js";

const BASE_CONFIG: AccountRuleConfig = {
  startBalance: 200_000,
  dailyLossPct: 3,
  dailyLossMode: "higher_of_balance_equity",
  maxLossPct: 10,
  maxLossMode: "static",
  profitTargetPct: 10,
  consistencyPct: 50,
  minTradingDays: 3,
  minProfitableDays: null,
  inactivityDays: 30,
};

describe("splitSnapshotsForToday", () => {
  it("nutzt die Startbalance als Referenz, wenn es noch keinen Snapshot vor heute gibt", () => {
    const now = new Date("2026-03-10T18:00:00Z");
    const result = splitSnapshotsForToday(
      [{ ts: "2026-03-10T09:00:00Z", balance: 201_000, equity: 200_500, dailyPnl: 1000 }],
      200_000,
      now,
    );
    expect(result.referenceBalance).toBe(200_000);
    expect(result.referenceEquity).toBe(200_000);
    expect(result.todayPnl).toBe(1000);
    expect(result.latestBalance).toBe(201_000);
  });

  it("nutzt den letzten Snapshot vor heute als Referenz für Balance/Equity", () => {
    const now = new Date("2026-03-11T18:00:00Z");
    const result = splitSnapshotsForToday(
      [
        { ts: "2026-03-10T18:00:00Z", balance: 201_000, equity: 201_000, dailyPnl: 1000 },
        { ts: "2026-03-11T15:00:00Z", balance: 198_000, equity: 197_500, dailyPnl: -3000 },
      ],
      200_000,
      now,
    );
    expect(result.referenceBalance).toBe(201_000);
    expect(result.referenceEquity).toBe(201_000);
    expect(result.todayPnl).toBe(-3000);
    expect(result.latestEquity).toBe(197_500);
  });

  it("todayPnl ist 0, wenn heute noch kein Snapshot erfasst wurde", () => {
    const now = new Date("2026-03-12T08:00:00Z");
    const result = splitSnapshotsForToday(
      [{ ts: "2026-03-10T18:00:00Z", balance: 201_000, equity: 201_000, dailyPnl: 1000 }],
      200_000,
      now,
    );
    expect(result.todayPnl).toBe(0);
  });

  it("sortiert unsortiert übergebene Snapshots korrekt nach Zeit", () => {
    const now = new Date("2026-03-12T08:00:00Z");
    const result = splitSnapshotsForToday(
      [
        { ts: "2026-03-11T10:00:00Z", balance: 202_000, equity: 202_000, dailyPnl: 500 },
        { ts: "2026-03-10T10:00:00Z", balance: 201_000, equity: 201_000, dailyPnl: 1000 },
      ],
      200_000,
      now,
    );
    expect(result.referenceBalance).toBe(202_000); // der spätere der beiden "vor heute"-Snapshots
  });
});

describe("computeAccountSummary", () => {
  it("meldet volle Puffer und grüne Ampel ohne jede Aktivität", () => {
    const now = new Date("2026-03-10T08:00:00Z");
    const summary = computeAccountSummary(BASE_CONFIG, [], now, null);
    expect(summary.dailyLoss.bufferPct).toBe(100);
    expect(summary.maxLoss.bufferPct).toBe(100);
    expect(summary.overallLight.color).toBe("green");
    expect(summary.profitTargetProgressPct).toBe(0);
  });

  it("zieht einen heutigen Verlust korrekt vom Tagespuffer ab", () => {
    const now = new Date("2026-03-10T18:00:00Z");
    const summary = computeAccountSummary(
      BASE_CONFIG,
      [{ ts: "2026-03-10T15:00:00Z", balance: 194_000, equity: 194_000, dailyPnl: -6000 }],
      now,
      now,
    );
    // Limit = 3% von 200.000 = 6000, Verlust 6000 -> Puffer 0%, rot pulsierend
    expect(summary.dailyLoss.bufferPct).toBe(0);
    expect(summary.dailyLoss.light.color).toBe("red");
    expect(summary.dailyLoss.light.pulsing).toBe(true);
  });

  it("übernimmt die schlechtere der beiden Ampeln als Gesamt-Ampel", () => {
    const now = new Date("2026-03-10T18:00:00Z");
    const summary = computeAccountSummary(
      BASE_CONFIG,
      [{ ts: "2026-03-10T15:00:00Z", balance: 180_000, equity: 180_000, dailyPnl: -2000 }],
      now,
      now,
    );
    // Tagesverlust-Puffer ist bei kleinem Tagesminus hoch, aber Max-Verlust-Puffer
    // ist durch den niedrigen Gesamtstand (180k von 200k, 10% Max-Loss = 20k) bei 0%.
    expect(summary.maxLoss.bufferPct).toBe(0);
    expect(summary.overallLight.color).toBe("red");
  });

  it("prüft die Mindest-Handelstage gegen die Anzahl aktiver Tage", () => {
    const now = new Date("2026-03-15T08:00:00Z");
    const snapshots = [
      { ts: "2026-03-10T18:00:00Z", balance: 201_000, equity: 201_000, dailyPnl: 1000 },
      { ts: "2026-03-11T18:00:00Z", balance: 202_000, equity: 202_000, dailyPnl: 1000 },
    ];
    const summary = computeAccountSummary(BASE_CONFIG, snapshots, now, now);
    expect(summary.tradingDays.count).toBe(2);
    expect(summary.tradingDays.ok).toBe(false); // benötigt 3
  });
});
