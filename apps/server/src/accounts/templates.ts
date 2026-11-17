// Startwerte für "Vorlage wählen" beim Konto-Anlegen (Abschnitt 8.1).
// WICHTIG: Prop-Firm-Regeln ändern sich häufig. Jeder Wert bleibt im Formular
// editierbar und wird im Frontend mit dem Hinweis "bitte mit aktuellen Regeln
// der Firma prüfen" angezeigt – diese Datei ist nur ein Startpunkt, keine
// verbindliche Quelle.

export interface AccountTemplate {
  key: string;
  label: string;
  firm: string;
  program: string;
  defaults: {
    profitTargetPct: number | null;
    dailyLossPct: number;
    dailyLossMode: "balance" | "equity" | "higher_of_balance_equity";
    maxLossPct: number;
    maxLossMode: "static" | "trailing";
    minTradingDays: number | null;
    minProfitableDays: number | null;
    consistencyPct: number | null;
    newsRuleMinutes: number | null;
    weekendAllowed: boolean;
    inactivityDays: number | null;
    profitSplitPct: number | null;
    payoutIntervalDays: number | null;
  };
}

export const ACCOUNT_TEMPLATES: AccountTemplate[] = [
  {
    key: "the5ers-summer-200k-10-5",
    label: "The5ers Summer 200K (10/5)",
    firm: "The5ers",
    program: "Summer 2-Step (10/5)",
    defaults: {
      profitTargetPct: 10,
      dailyLossPct: 5,
      dailyLossMode: "higher_of_balance_equity",
      maxLossPct: 10,
      maxLossMode: "static",
      minTradingDays: 3,
      minProfitableDays: null,
      consistencyPct: 50,
      newsRuleMinutes: null,
      weekendAllowed: true,
      inactivityDays: 30,
      profitSplitPct: 80,
      payoutIntervalDays: 14,
    },
  },
  {
    key: "the5ers-high-stakes-100k",
    label: "The5ers High Stakes 100K",
    firm: "The5ers",
    program: "High Stakes",
    defaults: {
      profitTargetPct: 8,
      dailyLossPct: 5,
      dailyLossMode: "higher_of_balance_equity",
      maxLossPct: 10,
      maxLossMode: "static",
      minTradingDays: 3,
      minProfitableDays: null,
      consistencyPct: 50,
      newsRuleMinutes: null,
      weekendAllowed: true,
      inactivityDays: 30,
      profitSplitPct: 80,
      payoutIntervalDays: 14,
    },
  },
  {
    key: "ftmo-2step-200k",
    label: "FTMO 2-Step 200K",
    firm: "FTMO",
    program: "2-Step Challenge",
    defaults: {
      profitTargetPct: 10,
      dailyLossPct: 5,
      dailyLossMode: "balance",
      maxLossPct: 10,
      maxLossMode: "static",
      minTradingDays: 4,
      minProfitableDays: null,
      consistencyPct: null,
      newsRuleMinutes: 2,
      weekendAllowed: false,
      inactivityDays: 30,
      profitSplitPct: 80,
      payoutIntervalDays: 14,
    },
  },
];
