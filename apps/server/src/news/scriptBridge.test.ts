import { describe, expect, it } from "vitest";
import { WEEKDAY_TOPICS } from "./scriptBridge.js";

// Abschnitt 11: "Mo Wochenausblick, Di Geopolitik, Mi Märkte, Do Politik,
// Fr KI & Konzerne, Sa Zusammenhang, So Rückblick." JS Date.getDay(): 0=So.
describe("WEEKDAY_TOPICS", () => {
  it("deckt alle 7 Wochentage ab", () => {
    expect(Object.keys(WEEKDAY_TOPICS)).toHaveLength(7);
  });

  it("ordnet jeden Wochentag exakt dem Spec-Thema zu", () => {
    expect(WEEKDAY_TOPICS[0]).toBe("Rückblick");
    expect(WEEKDAY_TOPICS[1]).toBe("Wochenausblick");
    expect(WEEKDAY_TOPICS[2]).toBe("Geopolitik");
    expect(WEEKDAY_TOPICS[3]).toBe("Märkte");
    expect(WEEKDAY_TOPICS[4]).toBe("Politik");
    expect(WEEKDAY_TOPICS[5]).toBe("KI & Konzerne");
    expect(WEEKDAY_TOPICS[6]).toBe("Zusammenhang");
  });
});
