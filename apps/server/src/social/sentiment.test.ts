import { describe, expect, it } from "vitest";
import { computeSentimentBarometer } from "./sentiment.js";

describe("computeSentimentBarometer", () => {
  it("gibt sampleSize 0 ohne Daten für ein Asset", () => {
    const result = computeSentimentBarometer([], ["BTC"]);
    expect(result).toEqual([{ asset: "BTC", bullishPct: 0, bearishPct: 0, neutralPct: 0, sampleSize: 0, extreme: null }]);
  });

  it("ignoriert Items ohne Sentiment-Wert", () => {
    const result = computeSentimentBarometer([{ topic: "BTC", sentiment: null }], ["BTC"]);
    expect(result[0].sampleSize).toBe(0);
  });

  it("berechnet Prozentanteile korrekt", () => {
    const items = [
      { topic: "BTC", sentiment: "bullish" as const },
      { topic: "BTC", sentiment: "bullish" as const },
      { topic: "BTC", sentiment: "bearish" as const },
      { topic: "BTC", sentiment: "neutral" as const },
    ];
    const [result] = computeSentimentBarometer(items, ["BTC"]);
    expect(result.bullishPct).toBe(50);
    expect(result.bearishPct).toBe(25);
    expect(result.neutralPct).toBe(25);
    expect(result.sampleSize).toBe(4);
  });

  it("markiert extreme Euphorie erst ab Mindest-Stichprobengröße", () => {
    // 2/2 bullisch = 100%, aber unter MIN_SAMPLE_SIZE -> kein Extremwert-Flag
    const items = [
      { topic: "BTC", sentiment: "bullish" as const },
      { topic: "BTC", sentiment: "bullish" as const },
    ];
    const [result] = computeSentimentBarometer(items, ["BTC"]);
    expect(result.extreme).toBeNull();
  });

  it("markiert extreme Euphorie bei ausreichend Stichprobe und >=80% bullisch", () => {
    const items = Array.from({ length: 5 }, () => ({ topic: "BTC", sentiment: "bullish" as const }));
    const [result] = computeSentimentBarometer(items, ["BTC"]);
    expect(result.extreme).toBe("bullish");
  });

  it("markiert extreme Angst bei ausreichend Stichprobe und >=80% bärisch", () => {
    const items = Array.from({ length: 5 }, () => ({ topic: "BTC", sentiment: "bearish" as const }));
    const [result] = computeSentimentBarometer(items, ["BTC"]);
    expect(result.extreme).toBe("bearish");
  });

  it("trennt mehrere Assets sauber voneinander", () => {
    const items = [
      { topic: "BTC", sentiment: "bullish" as const },
      { topic: "ETH", sentiment: "bearish" as const },
    ];
    const result = computeSentimentBarometer(items, ["BTC", "ETH"]);
    expect(result.find((r) => r.asset === "BTC")?.bullishPct).toBe(100);
    expect(result.find((r) => r.asset === "ETH")?.bearishPct).toBe(100);
  });
});
