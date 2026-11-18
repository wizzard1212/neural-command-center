import { describe, expect, it } from "vitest";
import { computeNoTradeWindows, nextWindowCountdown } from "./noTradeWindow.js";

const EVENT = { ts: "2026-01-02T14:30:00.000Z", title: "US NFP", country: "US" };

describe("computeNoTradeWindows", () => {
  it("berechnet ein Fenster pro Konto mit gesetzter News-Regel", () => {
    const windows = computeNoTradeWindows(
      [EVENT],
      [
        { accountId: 1, label: "The5ers", newsRuleMinutes: 2 },
        { accountId: 2, label: "FTMO", newsRuleMinutes: 5 },
      ],
    );
    expect(windows).toHaveLength(2);
    // Sortiert nach Startzeit: FTMO (±5 Min) beginnt früher als The5ers (±2 Min).
    expect(windows[0]).toMatchObject({
      accountId: 2,
      startsAt: "2026-01-02T14:25:00.000Z",
      endsAt: "2026-01-02T14:35:00.000Z",
    });
    expect(windows[1]).toMatchObject({
      accountId: 1,
      startsAt: "2026-01-02T14:28:00.000Z",
      endsAt: "2026-01-02T14:32:00.000Z",
    });
  });

  it("lässt Konten ohne News-Regel (null oder 0) aus", () => {
    const windows = computeNoTradeWindows(
      [EVENT],
      [
        { accountId: 1, label: "Ohne Regel", newsRuleMinutes: null },
        { accountId: 2, label: "Null Minuten", newsRuleMinutes: 0 },
      ],
    );
    expect(windows).toHaveLength(0);
  });

  it("sortiert mehrere Fenster nach Startzeit", () => {
    const later = { ts: "2026-01-02T20:00:00.000Z", title: "FOMC", country: "US" };
    const windows = computeNoTradeWindows([later, EVENT], [{ accountId: 1, label: "X", newsRuleMinutes: 2 }]);
    expect(windows[0].eventTitle).toBe("US NFP");
    expect(windows[1].eventTitle).toBe("FOMC");
  });
});

describe("nextWindowCountdown", () => {
  const windows = computeNoTradeWindows([EVENT], [{ accountId: 1, label: "X", newsRuleMinutes: 2 }]);

  it("erkennt ein aktuell aktives Fenster", () => {
    const result = nextWindowCountdown(windows, new Date("2026-01-02T14:29:00.000Z"));
    expect(result.activeNow).toBe(true);
    expect(result.minutesUntilNext).toBe(0);
  });

  it("zählt Minuten bis zum nächsten Fenster herunter", () => {
    const result = nextWindowCountdown(windows, new Date("2026-01-02T14:00:00.000Z"));
    expect(result.activeNow).toBe(false);
    expect(result.minutesUntilNext).toBe(28);
    expect(result.next?.eventTitle).toBe("US NFP");
  });

  it("gibt null zurück, wenn kein weiteres Fenster folgt", () => {
    const result = nextWindowCountdown(windows, new Date("2026-01-02T15:00:00.000Z"));
    expect(result.activeNow).toBe(false);
    expect(result.minutesUntilNext).toBeNull();
    expect(result.next).toBeNull();
  });
});
