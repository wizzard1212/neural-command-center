import type { FastifyInstance } from "fastify";
import * as repo from "../accounts/repo.js";
import { computeAccountSummary, type AccountRuleConfig } from "../accounts/summary.js";
import { copyRiskCalculator } from "../accounts/risk.js";
import { costsAndRoi } from "../accounts/risk.js";
import { ACCOUNT_TEMPLATES } from "../accounts/templates.js";
import { broadcast } from "../ws.js";

type AccountRow = ReturnType<typeof repo.getAccount>;

function toRuleConfig(account: NonNullable<AccountRow>): AccountRuleConfig {
  return {
    startBalance: account.startBalance,
    dailyLossPct: account.dailyLossPct,
    dailyLossMode: account.dailyLossMode as AccountRuleConfig["dailyLossMode"],
    maxLossPct: account.maxLossPct,
    maxLossMode: account.maxLossMode as AccountRuleConfig["maxLossMode"],
    profitTargetPct: account.profitTargetPct,
    consistencyPct: account.consistencyPct,
    minTradingDays: account.minTradingDays,
    minProfitableDays: account.minProfitableDays,
    inactivityDays: account.inactivityDays,
  };
}

function summarizeAccount(account: NonNullable<AccountRow>) {
  const snapshots = repo.listSnapshots(account.id);
  const lastActivityAt = snapshots.at(-1)?.ts ?? account.createdAt;
  const summary = computeAccountSummary(
    toRuleConfig(account),
    snapshots,
    new Date(),
    lastActivityAt ? new Date(lastActivityAt) : null,
  );
  return { account, summary, snapshots };
}

export async function accountsRoutes(app: FastifyInstance) {
  app.get("/accounts/templates", async () => ACCOUNT_TEMPLATES);

  app.get("/accounts", async () => {
    return repo.listAccounts().map((account) => {
      const { summary } = summarizeAccount(account);
      return { account, summary };
    });
  });

  app.get("/accounts/overview", async () => {
    const all = repo.listAccounts();
    const active = all.filter((a) => a.phase !== "lost");
    const managedCapitalUsd = active.reduce((sum, a) => sum + a.size, 0);

    let totalEquity = 0;
    let totalDailyPnl = 0;
    let worstLight: "green" | "yellow" | "red" = "green";
    const severity = { green: 0, yellow: 1, red: 2 } as const;

    for (const account of all) {
      const { summary } = summarizeAccount(account);
      totalEquity += summary.latestEquity;
      totalDailyPnl += summary.todayPnl;
      if (severity[summary.overallLight.color] > severity[worstLight]) {
        worstLight = summary.overallLight.color;
      }
    }

    const allPayouts = repo.listAllPayouts();
    const totalCost = all.reduce((sum, a) => sum + (a.purchasePrice ?? 0), 0);
    const roi = costsAndRoi(totalCost, allPayouts);

    return {
      accountCount: all.length,
      managedCapitalUsd,
      totalEquity,
      totalDailyPnl,
      worstLight,
      totalCost,
      ...roi,
    };
  });

  app.get<{ Querystring: { copyGroup?: string; riskPct?: string } }>("/accounts/copy-risk", async (req, reply) => {
    const { copyGroup, riskPct } = req.query;
    if (!copyGroup || !riskPct) return reply.code(400).send({ error: "copyGroup und riskPct erforderlich" });

    const groupAccounts = repo.listAccounts().filter((a) => a.copyGroup === copyGroup);
    const withLimits = groupAccounts.map((a) => {
      const { summary } = summarizeAccount(a);
      return { id: a.id, size: a.size, dailyLossLimitUsd: summary.dailyLoss.limitUsd };
    });

    return copyRiskCalculator(Number(riskPct), withLimits);
  });

  app.get("/account-feed", async () => repo.listEvents(100));

  app.post<{ Body: { accountId?: number | null; text: string } }>("/account-feed", async (req) => {
    return repo.addEvent({ accountId: req.body.accountId ?? null, type: "manual", text: req.body.text });
  });

  app.get<{ Params: { id: string } }>("/accounts/:id", async (req, reply) => {
    const account = repo.getAccount(Number(req.params.id));
    if (!account) return reply.code(404).send({ error: "not_found" });
    const { summary, snapshots } = summarizeAccount(account);
    const payouts = repo.listPayouts(account.id);
    return { account, summary, snapshots, payouts };
  });

  app.post<{ Body: Record<string, unknown> }>("/accounts", async (req, reply) => {
    const account = repo.createAccount(req.body as Parameters<typeof repo.createAccount>[0]);
    if (account) repo.addEvent({ accountId: account.id, type: "account_created", text: `Konto "${account.firm} ${account.program}" angelegt.` });
    return reply.code(201).send(account);
  });

  app.put<{ Params: { id: string }; Body: Record<string, unknown> }>("/accounts/:id", async (req, reply) => {
    const id = Number(req.params.id);
    if (!repo.getAccount(id)) return reply.code(404).send({ error: "not_found" });
    return repo.updateAccount(id, req.body as Parameters<typeof repo.updateAccount>[1]);
  });

  app.delete<{ Params: { id: string } }>("/accounts/:id", async (req, reply) => {
    const id = Number(req.params.id);
    if (!repo.getAccount(id)) return reply.code(404).send({ error: "not_found" });
    repo.deleteAccount(id);
    return reply.code(204).send();
  });

  app.post<{ Params: { id: string }; Body: { balance: number; equity: number; dailyPnl: number; ts?: string } }>(
    "/accounts/:id/snapshots",
    async (req, reply) => {
      const id = Number(req.params.id);
      const account = repo.getAccount(id);
      if (!account) return reply.code(404).send({ error: "not_found" });
      const snapshot = repo.addSnapshot(id, req.body);

      const { summary } = summarizeAccount(account);
      if (summary.overallLight.pulsing) {
        broadcast({ type: "account:rule_violation", accountId: id, message: `${account.firm} ${account.program}: Puffer unter 15%!` });
      }
      repo.addEvent({
        accountId: id,
        type: "snapshot",
        text: `Neuer Stand erfasst: Equity ${req.body.equity.toLocaleString("de-DE")} $, Tages-P&L ${req.body.dailyPnl.toLocaleString("de-DE")} $.`,
      });

      return reply.code(201).send(snapshot);
    },
  );

  app.get<{ Params: { id: string } }>("/accounts/:id/snapshots", async (req) => repo.listSnapshots(Number(req.params.id)));

  app.post<{
    Params: { id: string };
    Body: { date: string; gross: number; splitPct: number; fees?: number; note?: string };
  }>("/accounts/:id/payouts", async (req, reply) => {
    const id = Number(req.params.id);
    const account = repo.getAccount(id);
    if (!account) return reply.code(404).send({ error: "not_found" });
    const payout = repo.addPayout(id, req.body);
    repo.addEvent({
      accountId: id,
      type: "payout",
      text: `Auszahlung ${payout!.net.toLocaleString("de-DE")} $ netto.`,
    });
    return reply.code(201).send(payout);
  });

  app.get<{ Params: { id: string } }>("/accounts/:id/payouts", async (req) => repo.listPayouts(Number(req.params.id)));

  app.get<{ Querystring: { year?: string } }>("/accounts/export/payouts.csv", async (req, reply) => {
    const year = req.query.year;
    const accountsById = new Map(repo.listAccounts().map((a) => [a.id, a]));
    const rows = repo
      .listAllPayouts()
      .filter((p) => !year || p.date.startsWith(year))
      .sort((a, b) => a.date.localeCompare(b.date));

    const header = "Datum;Firma;Programm;Brutto;Split %;Gebühren;Netto;Notiz";
    const lines = rows.map((p) => {
      const account = accountsById.get(p.accountId);
      return [
        p.date,
        account?.firm ?? "",
        account?.program ?? "",
        p.gross.toFixed(2),
        p.splitPct.toString(),
        p.fees.toFixed(2),
        p.net.toFixed(2),
        (p.note ?? "").replace(/;/g, ","),
      ].join(";");
    });

    reply
      .header("Content-Type", "text/csv; charset=utf-8")
      .header("Content-Disposition", `attachment; filename="auszahlungen${year ? "-" + year : ""}.csv"`)
      .send([header, ...lines].join("\n"));
  });

  app.get<{ Querystring: { accountId?: string } }>("/goals", async (req) => {
    const { accountId } = req.query;
    if (accountId === undefined) return repo.listGoals();
    if (accountId === "global") return repo.listGoals(null);
    return repo.listGoals(Number(accountId));
  });

  app.post<{ Body: { accountId?: number | null; title: string; targetValue: number; unit: "usd" | "pct"; deadline?: string } }>(
    "/goals",
    async (req, reply) => reply.code(201).send(repo.addGoal(req.body)),
  );

  app.put<{ Params: { id: string }; Body: Partial<{ currentValue: number; title: string; targetValue: number; deadline: string }> }>(
    "/goals/:id",
    async (req) => repo.updateGoal(Number(req.params.id), req.body),
  );

  app.delete<{ Params: { id: string } }>("/goals/:id", async (req, reply) => {
    repo.deleteGoal(Number(req.params.id));
    return reply.code(204).send();
  });
}
