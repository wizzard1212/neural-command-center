import { describe, expect, it } from "vitest";
import { titleSimilarity, findDuplicate, groupByCluster, type ExistingItem, type ClusterableItem } from "./dedupe.js";

describe("titleSimilarity", () => {
  it("liefert 1 für identische Titel", () => {
    expect(titleSimilarity("Fed hebt Leitzins an", "Fed hebt Leitzins an")).toBe(1);
  });

  it("ist unempfindlich gegen Groß-/Kleinschreibung und Satzzeichen", () => {
    const sim = titleSimilarity("Fed hebt Leitzins an!", "fed hebt leitzins an");
    expect(sim).toBeCloseTo(1, 1);
  });

  it("erkennt leicht unterschiedliche Formulierungen derselben Meldung als sehr ähnlich", () => {
    const sim = titleSimilarity(
      "EZB senkt Leitzins um 0,25 Prozentpunkte",
      "EZB senkt Leitzins um 0,25 Prozentpunkte auf 3,5 %",
    );
    expect(sim).toBeGreaterThan(0.85);
  });

  it("bewertet völlig unterschiedliche Titel niedrig", () => {
    const sim = titleSimilarity("Fed hebt Leitzins an", "Bitcoin erreicht neues Allzeithoch");
    expect(sim).toBeLessThan(0.3);
  });

  it("behandelt sehr kurze Titel sicher, ohne durch 0 zu teilen", () => {
    expect(titleSimilarity("A", "B")).toBe(0);
    expect(titleSimilarity("", "")).toBe(1);
  });
});

describe("findDuplicate", () => {
  const existing: ExistingItem[] = [
    { id: 1, url: "https://example.com/a", title: "Fed hebt Leitzins um 0,25% an", clusterId: null },
    { id: 2, url: "https://example.com/b", title: "Bitcoin erreicht neues Allzeithoch", clusterId: null },
  ];

  it("erkennt ein Duplikat anhand identischer URL, auch bei anderem Titel", () => {
    const match = findDuplicate({ url: "https://example.com/a", title: "Komplett anderer Titel" }, existing);
    expect(match?.reason).toBe("url");
    expect(match?.existing.id).toBe(1);
  });

  it("erkennt ein Duplikat anhand sehr ähnlichen Titels bei anderer URL", () => {
    const match = findDuplicate(
      { url: "https://example.com/c", title: "Fed hebt Leitzins um 0,25 Prozent an" },
      existing,
    );
    expect(match?.reason).toBe("title");
    expect(match?.existing.id).toBe(1);
  });

  it("liefert null, wenn weder URL noch Titel übereinstimmen", () => {
    const match = findDuplicate({ url: "https://example.com/d", title: "Ganz neue Meldung über Rohstoffe" }, existing);
    expect(match).toBeNull();
  });
});

describe("groupByCluster", () => {
  const items: ClusterableItem[] = [
    { id: 1, clusterId: null, source: "ForexLive", relevance: null, publishedAt: "2026-11-18T08:00:00Z" },
    { id: 2, clusterId: "1", source: "FXStreet", relevance: null, publishedAt: "2026-11-18T08:05:00Z" },
    { id: 3, clusterId: "1", source: "Investing.com", relevance: 5, publishedAt: "2026-11-18T08:10:00Z" },
    { id: 4, clusterId: null, source: "Cointelegraph", relevance: 2, publishedAt: "2026-11-18T09:00:00Z" },
  ];

  it("fasst Meldungen mit derselben clusterId zu einer Gruppe zusammen", () => {
    const groups = groupByCluster(items);
    expect(groups).toHaveLength(2);
    const clustered = groups.find((g) => g.sourceCount > 1)!;
    expect(clustered.sourceCount).toBe(3);
    expect(clustered.sources).toEqual(expect.arrayContaining(["ForexLive", "FXStreet", "Investing.com"]));
  });

  it("wählt die höchste bewertete Meldung als Repräsentant der Gruppe", () => {
    const groups = groupByCluster(items);
    const clustered = groups.find((g) => g.sourceCount > 1)!;
    expect(clustered.representative.id).toBe(3); // relevance 5
  });

  it("fällt ohne Bewertung auf die zuerst veröffentlichte Meldung zurück", () => {
    const unscored: ClusterableItem[] = [
      { id: 10, clusterId: "10", source: "A", relevance: null, publishedAt: "2026-11-18T10:00:00Z" },
      { id: 11, clusterId: "10", source: "B", relevance: null, publishedAt: "2026-11-18T09:00:00Z" },
    ];
    const groups = groupByCluster(unscored);
    expect(groups[0].representative.id).toBe(11);
  });

  it("behandelt Meldungen ohne Duplikate als eigene Einzel-Gruppe", () => {
    const groups = groupByCluster(items);
    const single = groups.find((g) => g.sourceCount === 1)!;
    expect(single.representative.id).toBe(4);
    expect(single.sources).toEqual(["Cointelegraph"]);
  });
});
