import { describe, expect, it } from "vitest";
import { computeSessionStates } from "./sessions.js";

describe("computeSessionStates", () => {
  it("markiert London als offen um 10:00 UTC", () => {
    const now = new Date("2026-01-12T10:00:00Z");
    const states = computeSessionStates(now);
    const london = states.find((s) => s.key === "london");
    expect(london?.isOpen).toBe(true);
  });

  it("markiert Asien als offen über Mitternacht (23:30 UTC gehört zum Fenster 00:00-09:00 nicht)", () => {
    const now = new Date("2026-01-12T23:30:00Z");
    const states = computeSessionStates(now);
    const asia = states.find((s) => s.key === "asia");
    expect(asia?.isOpen).toBe(false);
    expect(asia?.minutesUntilNextOpen).toBe(30);
  });

  it("berechnet minutesUntilClose korrekt für eine offene Session", () => {
    const now = new Date("2026-01-12T08:00:00Z");
    const states = computeSessionStates(now);
    const london = states.find((s) => s.key === "london");
    expect(london?.isOpen).toBe(true);
    expect(london?.minutesUntilClose).toBe(540); // 17:00 - 08:00
  });
});
