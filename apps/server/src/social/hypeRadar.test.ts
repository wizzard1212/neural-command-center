import { describe, expect, it } from "vitest";
import { computeZScore } from "./hypeRadar.js";

describe("computeZScore", () => {
  it("gibt 0 bei leerer Historie und 0 Erwähnungen", () => {
    expect(computeZScore(0, [])).toEqual({ zscore: 0, avg7d: 0 });
  });

  it("gibt 1 bei leerer Historie und Erwähnungen > 0", () => {
    expect(computeZScore(5, [])).toEqual({ zscore: 1, avg7d: 0 });
  });

  it("nutzt eine relative Wachstumsrate bei nur einem Historienwert", () => {
    const { zscore, avg7d } = computeZScore(20, [10]);
    expect(avg7d).toBe(10);
    expect(zscore).toBeCloseTo(1); // (20-10)/10 = 1
  });

  it("berechnet einen echten Z-Score bei ausreichend Historie", () => {
    // Historie konstant bei 10 -> stddev 0 -> heutiger Wert deutlich höher -> zscore 1 (Fallback)
    const { zscore } = computeZScore(50, [10, 10, 10, 10, 10, 10, 10]);
    expect(zscore).toBe(1);
  });

  it("berechnet einen positiven Z-Score bei echtem Ausreißer nach oben", () => {
    const { zscore, avg7d } = computeZScore(100, [10, 12, 8, 11, 9, 10, 11]);
    expect(avg7d).toBeCloseTo(10.14, 1);
    expect(zscore).toBeGreaterThan(5);
  });

  it("berechnet einen negativen Z-Score bei Rückgang unter den Schnitt", () => {
    const { zscore } = computeZScore(2, [10, 12, 8, 11, 9, 10, 11]);
    expect(zscore).toBeLessThan(0);
  });

  it("bricht nicht bei stddev 0 und Wert gleich dem Schnitt", () => {
    const { zscore } = computeZScore(10, [10, 10, 10]);
    expect(zscore).toBe(0);
  });
});
