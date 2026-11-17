import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";

const timestamps = {
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
};

export const accounts = sqliteTable("accounts", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  firm: text("firm").notNull(),
  program: text("program").notNull(),
  size: real("size").notNull(),
  phase: text("phase", {
    enum: ["challenge_1", "challenge_2", "funded", "lost", "paused"],
  }).notNull(),
  platform: text("platform").notNull(),
  loginNo: text("login_no"),
  server: text("server"),
  purchasePrice: real("purchase_price"),
  purchaseDate: text("purchase_date"),
  startBalance: real("start_balance").notNull(),
  profitTargetPct: real("profit_target_pct"),
  dailyLossPct: real("daily_loss_pct").notNull(),
  dailyLossMode: text("daily_loss_mode", {
    enum: ["balance", "equity", "higher_of_balance_equity"],
  }).notNull(),
  maxLossPct: real("max_loss_pct").notNull(),
  maxLossMode: text("max_loss_mode", { enum: ["static", "trailing"] }).notNull(),
  minTradingDays: integer("min_trading_days"),
  minProfitableDays: integer("min_profitable_days"),
  consistencyPct: real("consistency_pct"),
  newsRuleMinutes: integer("news_rule_minutes"),
  weekendAllowed: integer("weekend_allowed", { mode: "boolean" }).default(false),
  inactivityDays: integer("inactivity_days"),
  profitSplitPct: real("profit_split_pct"),
  payoutCap: real("payout_cap"),
  payoutIntervalDays: integer("payout_interval_days"),
  copyGroup: text("copy_group"),
  notes: text("notes"),
  ...timestamps,
});

export const accountSnapshots = sqliteTable("account_snapshots", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  accountId: integer("account_id").notNull().references(() => accounts.id),
  ts: text("ts").notNull(),
  balance: real("balance").notNull(),
  equity: real("equity").notNull(),
  dailyPnl: real("daily_pnl").notNull(),
  source: text("source", { enum: ["mt5", "metaapi", "manual", "estimated", "import"] }).notNull(),
});

export const accountEvents = sqliteTable("account_events", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  accountId: integer("account_id").references(() => accounts.id),
  ts: text("ts").notNull(),
  type: text("type").notNull(),
  text: text("text").notNull(),
  dataJson: text("data_json", { mode: "json" }).$type<Record<string, unknown>>(),
});

export const payouts = sqliteTable("payouts", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  accountId: integer("account_id").notNull().references(() => accounts.id),
  date: text("date").notNull(),
  gross: real("gross").notNull(),
  splitPct: real("split_pct").notNull(),
  fees: real("fees").notNull().default(0),
  net: real("net").notNull(),
  note: text("note"),
});

export const goals = sqliteTable("goals", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  accountId: integer("account_id").references(() => accounts.id),
  title: text("title").notNull(),
  targetValue: real("target_value").notNull(),
  unit: text("unit", { enum: ["usd", "pct"] }).notNull(),
  deadline: text("deadline"),
  currentValue: real("current_value").notNull().default(0),
  createdAt: text("created_at").notNull(),
});

export const trades = sqliteTable("trades", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  accountId: integer("account_id").references(() => accounts.id),
  copyGroup: text("copy_group"),
  instrument: text("instrument").notNull(),
  direction: text("direction", { enum: ["long", "short"] }).notNull(),
  openedAt: text("opened_at"),
  closedAt: text("closed_at"),
  session: text("session", { enum: ["asia", "london", "new_york", "overlap"] }),
  entry: real("entry"),
  sl: real("sl"),
  tp1: real("tp1"),
  tp2: real("tp2"),
  tp3: real("tp3"),
  tpSplitJson: text("tp_split_json", { mode: "json" }).$type<number[]>(),
  size: real("size"),
  riskPct: real("risk_pct"),
  riskUsd: real("risk_usd"),
  rrPlanned: real("rr_planned"),
  exitPricesJson: text("exit_prices_json", { mode: "json" }).$type<number[]>(),
  resultR: real("result_r"),
  resultUsd: real("result_usd"),
  status: text("status", { enum: ["planned", "open", "closed", "missed"] }).notNull(),
  setupTypesJson: text("setup_types_json", { mode: "json" }).$type<string[]>(),
  timeframesJson: text("timeframes_json", { mode: "json" }).$type<{ htf?: string; entry?: string }>(),
  reasoning: text("reasoning"),
  emotionScore: integer("emotion_score"),
  emotionTagsJson: text("emotion_tags_json", { mode: "json" }).$type<string[]>(),
  ruleChecksJson: text("rule_checks_json", { mode: "json" }).$type<Record<string, boolean>>(),
  followedPlan: integer("followed_plan", { mode: "boolean" }),
  lesson: text("lesson"),
  mt5DealIdsJson: text("mt5_deal_ids_json", { mode: "json" }).$type<string[]>(),
  vaultPath: text("vault_path"),
  ...timestamps,
});

export const tradeImages = sqliteTable("trade_images", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  tradeId: integer("trade_id").notNull().references(() => trades.id),
  path: text("path").notNull(),
  kind: text("kind", { enum: ["before", "after", "htf", "ltf"] }).notNull(),
  aiExtractJson: text("ai_extract_json", { mode: "json" }).$type<Record<string, unknown>>(),
});

export const newsItems = sqliteTable("news_items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  source: text("source").notNull(),
  url: text("url").notNull(),
  title: text("title").notNull(),
  publishedAt: text("published_at").notNull(),
  summaryDe: text("summary_de"),
  relevance: integer("relevance"),
  category: text("category"),
  assetsJson: text("assets_json", { mode: "json" }).$type<string[]>(),
  directionJson: text("direction_json", { mode: "json" }).$type<Record<string, string>>(),
  clusterId: text("cluster_id"),
  rawJson: text("raw_json", { mode: "json" }).$type<Record<string, unknown>>(),
});

export const socialItems = sqliteTable("social_items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  platform: text("platform").notNull(),
  externalId: text("external_id").notNull(),
  title: text("title"),
  url: text("url"),
  metricValue: real("metric_value"),
  metricType: text("metric_type"),
  ts: text("ts").notNull(),
  topic: text("topic"),
  sentiment: text("sentiment", { enum: ["bullish", "bearish", "neutral"] }),
});

export const trendTopics = sqliteTable("trend_topics", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  topic: text("topic").notNull(),
  platform: text("platform").notNull(),
  mentions24h: integer("mentions_24h").notNull(),
  mentionsAvg7d: real("mentions_avg_7d").notNull(),
  zscore: real("zscore").notNull(),
  ts: text("ts").notNull(),
});

export const calendarEvents = sqliteTable("calendar_events", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  ts: text("ts").notNull(),
  country: text("country").notNull(),
  title: text("title").notNull(),
  impact: text("impact", { enum: ["low", "medium", "high"] }).notNull(),
  forecast: text("forecast"),
  previous: text("previous"),
  actual: text("actual"),
});

export const briefings = sqliteTable("briefings", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  date: text("date").notNull(),
  status: text("status", { enum: ["pending", "ok", "partial", "failed"] }).notNull(),
  contentJson: text("content_json", { mode: "json" }).$type<Record<string, unknown>>(),
  markdown: text("markdown"),
  vaultPath: text("vault_path"),
  createdAt: text("created_at").notNull(),
});

export const reviews = sqliteTable("reviews", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  week: text("week").notNull(),
  contentJson: text("content_json", { mode: "json" }).$type<Record<string, unknown>>(),
  vaultPath: text("vault_path"),
  createdAt: text("created_at").notNull(),
});

export const vaultNotes = sqliteTable("vault_notes", {
  path: text("path").primaryKey(),
  title: text("title").notNull(),
  area: text("area"),
  tagsJson: text("tags_json", { mode: "json" }).$type<string[]>(),
  linksJson: text("links_json", { mode: "json" }).$type<string[]>(),
  todosOpen: integer("todos_open").notNull().default(0),
  mtime: text("mtime").notNull(),
  size: integer("size").notNull(),
});

export const contentIdeas = sqliteTable("content_ideas", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  sourceType: text("source_type", { enum: ["news", "social", "manual"] }).notNull(),
  sourceId: text("source_id"),
  idea: text("idea").notNull(),
  hookDe: text("hook_de"),
  hookEn: text("hook_en"),
  createdAt: text("created_at").notNull(),
});

export const predictions = sqliteTable("predictions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  createdAt: text("created_at").notNull(),
  text: text("text").notNull(),
  asset: text("asset"),
  horizon: text("horizon"),
  outcome: text("outcome", { enum: ["open", "hit", "miss"] }).notNull().default("open"),
  resolvedAt: text("resolved_at"),
});

export const aiUsage = sqliteTable("ai_usage", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  ts: text("ts").notNull(),
  purpose: text("purpose").notNull(),
  model: text("model").notNull(),
  inputTokens: integer("input_tokens").notNull(),
  outputTokens: integer("output_tokens").notNull(),
  estCostUsd: real("est_cost_usd").notNull(),
});

export const settings = sqliteTable("settings", {
  key: text("key").primaryKey(),
  value: text("value_json", { mode: "json" }).$type<unknown>().notNull(),
});

export const layout = sqliteTable("layout", {
  page: text("page").primaryKey(),
  json: text("json", { mode: "json" }).$type<unknown>().notNull(),
});
