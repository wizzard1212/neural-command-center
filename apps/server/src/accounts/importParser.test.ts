import { describe, expect, it } from "vitest";
import { parseCsvStatement, parseHtmlStatement } from "./importParser.js";

describe("parseCsvStatement", () => {
  it("parst einen englischen MT5-CSV-Export und fasst Tage zusammen", () => {
    const csv = [
      "Time,Deal,Symbol,Type,Direction,Volume,Price,Order,Commission,Fee,Swap,Profit,Balance,Comment",
      "2026-01-02 09:00:00,1,EURUSD,buy,in,0.10,1.0950,1,0,0,0,0,10000.00,",
      "2026-01-02 11:30:00,2,EURUSD,sell,out,0.10,1.0980,2,-0.5,0,0,30.00,10029.50,",
      "2026-01-03 10:00:00,3,XAUUSD,sell,in,0.05,2050.0,3,0,0,0,0,10029.50,",
      "2026-01-03 15:00:00,4,XAUUSD,buy,out,0.05,2040.0,4,-0.3,0,-0.1,50.00,10079.10,",
    ].join("\n");

    const result = parseCsvStatement(csv);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.days).toEqual([
      { date: "2026-01-02", balance: 10029.5, dailyPnl: 29.5 },
      { date: "2026-01-03", balance: 10079.1, dailyPnl: 49.6 },
    ]);
  });

  it("schließt Ein-/Auszahlungen (Type 'balance') vom Trading-P&L aus, aber nicht vom Saldo", () => {
    const csv = [
      "Time,Type,Profit,Commission,Swap,Balance",
      "2026-01-05 08:00:00,balance,500.00,0,0,10500.00",
      "2026-01-05 12:00:00,sell,20.00,0,0,10520.00",
    ].join("\n");

    const result = parseCsvStatement(csv);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.days).toEqual([{ date: "2026-01-05", balance: 10520, dailyPnl: 20 }]);
  });

  it("erkennt Semikolon als Trennzeichen und deutsches Dezimalkomma", () => {
    const csv = ["Zeit;Typ;Gewinn;Provision;Swap;Saldo", "2026-02-01 09:00:00;sell;30,50;-0,50;0;10030,00"].join("\n");

    const result = parseCsvStatement(csv);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.days).toEqual([{ date: "2026-02-01", balance: 10030, dailyPnl: 30 }]);
  });

  it("gibt einen Fehler bei unbekannter Kopfzeile zurück statt falsche Daten zu erzeugen", () => {
    const result = parseCsvStatement("Foo,Bar\n1,2");
    expect(result.ok).toBe(false);
  });

  it("gibt einen Fehler bei leerer Datei zurück", () => {
    const result = parseCsvStatement("");
    expect(result.ok).toBe(false);
  });
});

describe("parseHtmlStatement", () => {
  function buildStatement(headerRow: string, dataRows: string, sectionLabel = "Deals"): string {
    return `
      <table>
        <tr><td>Account:</td><td>1234567</td></tr>
        <tr><td colspan="8">${sectionLabel}</td></tr>
        <tr>${headerRow}</tr>
        ${dataRows}
        <tr><td colspan="8">Results</td></tr>
      </table>
    `;
  }

  it("parst einen englischen MT5-HTML-Bericht", () => {
    const header = "<th>Time</th><th>Deal</th><th>Symbol</th><th>Type</th><th>Volume</th><th>Price</th><th>Commission</th><th>Swap</th><th>Profit</th><th>Balance</th>";
    const rows = `
      <tr><td>2026.01.02 09:00:00</td><td>1</td><td>EURUSD</td><td>in</td><td>0.10</td><td>1.0950</td><td>0.00</td><td>0.00</td><td>0.00</td><td>10000.00</td></tr>
      <tr><td>2026.01.02 11:30:00</td><td>2</td><td>EURUSD</td><td>out</td><td>0.10</td><td>1.0980</td><td>-0.50</td><td>0.00</td><td>30.00</td><td>10029.50</td></tr>
    `;
    const result = parseHtmlStatement(buildStatement(header, rows));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.days).toEqual([{ date: "2026-01-02", balance: 10029.5, dailyPnl: 29.5 }]);
  });

  it("parst einen deutschen MT5-HTML-Bericht (Abschnitt 'Geschäfte')", () => {
    const header = "<th>Zeit</th><th>Typ</th><th>Gewinn</th><th>Saldo</th>";
    const rows = `<tr><td>2026.03.01 10:00:00</td><td>sell</td><td>45,00</td><td>10045,00</td></tr>`;
    const result = parseHtmlStatement(buildStatement(header, rows, "Geschäfte"));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.days).toEqual([{ date: "2026-03-01", balance: 10045, dailyPnl: 45 }]);
  });

  it("stoppt am nächsten Abschnitt ohne dessen Zeilen mit einzulesen", () => {
    const header = "<th>Time</th><th>Type</th><th>Profit</th><th>Balance</th>";
    const rows = `<tr><td>2026.01.02 09:00:00</td><td>sell</td><td>10.00</td><td>10010.00</td></tr>`;
    const html = buildStatement(header, rows) + `<tr><td>2026.01.03 09:00:00</td><td>sell</td><td>999.00</td><td>99999.00</td></tr>`;
    const result = parseHtmlStatement(html);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.days).toHaveLength(1);
    expect(result.days[0].balance).toBe(10010);
  });

  it("gibt einen Fehler zurück, wenn kein Deals-Abschnitt existiert", () => {
    const result = parseHtmlStatement("<table><tr><td>Account:</td><td>123</td></tr></table>");
    expect(result.ok).toBe(false);
  });
});
