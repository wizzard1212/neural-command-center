import { describe, expect, it } from "vitest";
import { tokenize } from "./search.js";

describe("tokenize", () => {
  it("macht alles klein und entfernt Satzzeichen", () => {
    expect(tokenize("Was steht im Prop-Firm-Plan zu Konsistenz?")).toContain("konsistenz");
  });

  it("filtert kurze Füllwörter und Stoppwörter heraus", () => {
    const tokens = tokenize("Was waren meine häufigsten Regelbrüche im November?");
    expect(tokens).not.toContain("was");
    expect(tokens).not.toContain("im");
    expect(tokens).toContain("regelbrüche");
    expect(tokens).toContain("november");
  });

  it("gibt eine leere Liste für reinen Stoppwort-Text zurück", () => {
    expect(tokenize("was ist das")).toEqual([]);
  });
});
