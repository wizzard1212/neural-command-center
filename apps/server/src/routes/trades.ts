import type { FastifyInstance } from "fastify";
import {
  resolveInstrumentSpec,
  riskUsd as calcRiskUsd,
  riskPct as calcRiskPct,
  weightedRR,
  resultUsdFromExits,
  resultInR,
  type TradeDirection,
  type TpAllocation,
} from "@ncc/shared";
import * as repo from "../journal/repo.js";
import { getAccount } from "../accounts/repo.js";
import { saveScreenshotFromDataUrl, readScreenshot } from "../journal/screenshots.js";
import { writeTradeMarkdown } from "../journal/vaultExport.js";
import { analyzeChartScreenshot } from "../journal/visionAnalyze.js";
import { logAiUsage } from "../lib/aiUsageRepo.js";
import { env } from "../lib/env.js";
import { broadcast } from "../ws.js";

type TradeRow = NonNullable<ReturnType<typeof repo.getTrade>>;

function tpAllocations(trade: Pick<TradeRow, "tp1" | "tp2" | "tp3" | "tpSplitJson">): TpAllocation[] {
  const shares = (trade.tpSplitJson as number[] | null) ?? [100, 0, 0];
  const prices = [trade.tp1, trade.tp2, trade.tp3];
  const result: TpAllocation[] = [];
  prices.forEach((price, i) => {
    if (price !== null && price !== undefined && shares[i] > 0) {
      result.push({ price, sharePct: shares[i] });
    }
  });
  return result;
}

/** Berechnet riskUsd/riskPct/rrPlanned serverseitig neu, statt Client-Werten zu
 * vertrauen – diese Zahlen entscheiden über echtes Geld. */
function computeCalcFields(input: {
  accountId: number | null;
  instrument: string;
  direction: TradeDirection;
  entry: number | null;
  sl: number | null;
  size: number | null;
  tp1: number | null;
  tp2: number | null;
  tp3: number | null;
  tpSplitJson: number[] | null;
}) {
  const spec = resolveInstrumentSpec(input.instrument);
  let riskUsdValue: number | null = null;
  let riskPctValue: number | null = null;
  let rrPlanned: number | null = null;

  if (input.entry !== null && input.sl !== null && input.size !== null) {
    riskUsdValue = calcRiskUsd(input.direction, input.entry, input.sl, input.size, spec);

    const account = input.accountId ? getAccount(input.accountId) : null;
    if (account) riskPctValue = calcRiskPct(riskUsdValue, account.startBalance);

    rrPlanned = weightedRR(
      input.direction,
      input.entry,
      input.sl,
      tpAllocations({ tp1: input.tp1, tp2: input.tp2, tp3: input.tp3, tpSplitJson: input.tpSplitJson }),
      spec.pipSize,
    );
  }

  return { riskUsd: riskUsdValue, riskPct: riskPctValue, rrPlanned };
}

function exportToVault(tradeId: number) {
  const trade = repo.getTrade(tradeId);
  if (!trade) return;
  const images = repo.listTradeImages(tradeId);
  try {
    const vaultPath = writeTradeMarkdown(trade, images);
    if (vaultPath && vaultPath !== trade.vaultPath) {
      repo.updateTrade(tradeId, { vaultPath });
    }
  } catch {
    // Vault-Export ist ein Komfort-Feature – ein Fehler hier darf den Trade nicht verlieren.
  }
}

export async function tradesRoutes(app: FastifyInstance) {
  app.get("/trades", async () => {
    return repo.listTrades().map((trade) => ({ trade, images: repo.listTradeImages(trade.id) }));
  });

  app.get<{ Params: { id: string } }>("/trades/:id", async (req, reply) => {
    const trade = repo.getTrade(Number(req.params.id));
    if (!trade) return reply.code(404).send({ error: "not_found" });
    return { trade, images: repo.listTradeImages(trade.id) };
  });

  app.post<{ Body: Record<string, unknown> }>("/trades", async (req, reply) => {
    const body = req.body as Parameters<typeof repo.createTrade>[0];
    const calc = computeCalcFields({
      accountId: body.accountId ?? null,
      instrument: body.instrument,
      direction: body.direction as TradeDirection,
      entry: body.entry ?? null,
      sl: body.sl ?? null,
      size: body.size ?? null,
      tp1: body.tp1 ?? null,
      tp2: body.tp2 ?? null,
      tp3: body.tp3 ?? null,
      tpSplitJson: (body.tpSplitJson as number[]) ?? null,
    });

    const trade = repo.createTrade({ ...body, ...calc });
    if (trade) {
      exportToVault(trade.id);
      broadcast({ type: "trade:new", tradeId: trade.id });
    }
    return reply.code(201).send(repo.getTrade(trade!.id));
  });

  app.put<{ Params: { id: string }; Body: Record<string, unknown> }>("/trades/:id", async (req, reply) => {
    const id = Number(req.params.id);
    const existing = repo.getTrade(id);
    if (!existing) return reply.code(404).send({ error: "not_found" });

    const body = req.body as Record<string, unknown>;
    const merged = { ...existing, ...body };
    const calc = computeCalcFields({
      accountId: (merged.accountId as number | null) ?? null,
      instrument: merged.instrument as string,
      direction: merged.direction as TradeDirection,
      entry: merged.entry as number | null,
      sl: merged.sl as number | null,
      size: merged.size as number | null,
      tp1: merged.tp1 as number | null,
      tp2: merged.tp2 as number | null,
      tp3: merged.tp3 as number | null,
      tpSplitJson: merged.tpSplitJson as number[] | null,
    });

    // Ergebnis in R neu berechnen, wenn ein Exit-Ergebnis in $ vorliegt oder sich das Risiko geändert hat.
    let resultR = merged.resultR as number | null;
    if (merged.resultUsd !== null && merged.resultUsd !== undefined && calc.riskUsd) {
      resultR = resultInR(merged.resultUsd as number, calc.riskUsd);
    }

    const updated = repo.updateTrade(id, {
      ...(body as Parameters<typeof repo.updateTrade>[1]),
      ...calc,
      resultR,
    });
    exportToVault(id);
    return { trade: updated, images: repo.listTradeImages(id) };
  });

  app.delete<{ Params: { id: string } }>("/trades/:id", async (req, reply) => {
    const id = Number(req.params.id);
    if (!repo.getTrade(id)) return reply.code(404).send({ error: "not_found" });
    repo.deleteTrade(id);
    return reply.code(204).send();
  });

  app.post<{ Params: { id: string }; Body: { dataUrl: string; kind: "before" | "after" | "htf" | "ltf" } }>(
    "/trades/:id/images",
    async (req, reply) => {
      const tradeId = Number(req.params.id);
      if (!repo.getTrade(tradeId)) return reply.code(404).send({ error: "not_found" });

      const filename = saveScreenshotFromDataUrl(req.body.dataUrl);
      const image = repo.addTradeImage({ tradeId, path: filename, kind: req.body.kind });
      exportToVault(tradeId);
      return reply.code(201).send(image);
    },
  );

  app.delete<{ Params: { id: string } }>("/trades/images/:id", async (req, reply) => {
    repo.deleteTradeImage(Number(req.params.id));
    return reply.code(204).send();
  });

  app.get<{ Params: { filename: string } }>("/trades/images/raw/:filename", async (req, reply) => {
    const result = readScreenshot(req.params.filename);
    if (!result) return reply.code(404).send({ error: "not_found" });
    reply.header("Content-Type", result.mime).send(result.buffer);
  });

  app.post<{ Body: { dataUrl: string } }>("/trades/analyze-screenshot", async (req, reply) => {
    if (!env.ANTHROPIC_API_KEY) {
      return reply.code(400).send({ error: "no_api_key", message: "ANTHROPIC_API_KEY fehlt in .env." });
    }
    try {
      const { extraction, usage } = await analyzeChartScreenshot(req.body.dataUrl);
      logAiUsage("journal_vision", env.ANTHROPIC_MODEL, usage.inputTokens, usage.outputTokens);
      return extraction;
    } catch (err) {
      app.log.error({ err }, "Screenshot-Analyse fehlgeschlagen");
      return reply.code(502).send({ error: "analysis_failed", message: (err as Error).message });
    }
  });
}
