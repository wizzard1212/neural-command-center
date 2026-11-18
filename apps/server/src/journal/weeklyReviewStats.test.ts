import { describe, expect, it } from "vitest";
import { computeWeekStats, isoWeek, weekLabel, weekRange, type WeekTradeLike } from "./weeklyReviewStats.js";

function trade(overrides: Partial<WeekTradeLike>): WeekTradeLike {
  return {
    resultR: 1,
    resultUsd: 100,
    closedAt: "2026-01-05T10:00:00.000Z",
    followedPlan: true,
    instrument: "EURUSD",
    setupTypesJson: null,
    lesson: null,
    ...overrides,
  };
}

describe("computeWeekStats", () => {
  it("zählt nur geschlossene Trades (resultR gesetzt)", () => {
    const stats = computeWeekStats([trade({ resultR: 1 }), trade({ resultR: null })]);
    expect(stats.tradeCount).toBe(1);
  });

  it("zählt Regelbrüche und sammelt deren Lektionen", () => {
    const stats = computeWeekStats([
      trade({ followedPlan: false, lesson: "FOMO-Einstieg ohne Setup" }),
      trade({ followedPlan: true }),
      trade({ followedPlan: false, lesson: null }),
    ]);
    expect(stats.ruleBreaches).toBe(2);
    expect(stats.ruleBreachLessons).toEqual(["FOMO-Einstieg ohne Setup"]);
  });

  it("summiert R und USD über alle geschlossenen Trades", () => {
    const stats = computeWeekStats([trade({ resultR: 2, resultUsd: 200 }), trade({ resultR: -1, resultUsd: -100 })]);
    expect(stats.totalResultR).toBe(1);
    expect(stats.totalResultUsd).toBe(100);
  });

  it("gibt 0 Trades korrekt ohne Fehler zurück", () => {
    const stats = computeWeekStats([]);
    expect(stats.tradeCount).toBe(0);
    expect(stats.winRatePct).toBeNull();
  });
});

describe("isoWeek/weekLabel", () => {
  it("berechnet die korrekte ISO-Kalenderwoche", () => {
    // 1. Januar 2026 ist ein Donnerstag -> KW01
    expect(isoWeek(new Date("2026-01-01T12:00:00Z"))).toEqual({ year: 2026, week: 1 });
  });

  it("formatiert das Label als YYYY-KWNN", () => {
    expect(weekLabel(new Date("2026-01-01T12:00:00Z"))).toBe("2026-KW01");
  });

  it("behandelt Jahreswechsel korrekt (Ende Dezember kann zu KW1 des Folgejahres gehören)", () => {
    // 2025-12-29 (Montag) gehört zu 2026-KW01
    const result = isoWeek(new Date("2025-12-29T12:00:00Z"));
    expect(result).toEqual({ year: 2026, week: 1 });
  });
});

describe("weekRange", () => {
  it("liefert Montag 00:00 bis Sonntag 23:59:59 derselben Woche", () => {
    // 2026-01-07 ist ein Mittwoch
    const { from, to } = weekRange(new Date("2026-01-07T15:30:00"));
    expect(new Date(from).getDay()).toBe(1); // Montag
    expect(new Date(to).getDay()).toBe(0); // Sonntag
    expect(new Date(from) < new Date("2026-01-07T15:30:00")).toBe(true);
    expect(new Date(to) > new Date("2026-01-07T15:30:00")).toBe(true);
  });
});
