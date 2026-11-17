CREATE TABLE `account_events` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`account_id` integer,
	`ts` text NOT NULL,
	`type` text NOT NULL,
	`text` text NOT NULL,
	`data_json` text,
	FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `account_snapshots` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`account_id` integer NOT NULL,
	`ts` text NOT NULL,
	`balance` real NOT NULL,
	`equity` real NOT NULL,
	`daily_pnl` real NOT NULL,
	`source` text NOT NULL,
	FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `accounts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`firm` text NOT NULL,
	`program` text NOT NULL,
	`size` real NOT NULL,
	`phase` text NOT NULL,
	`platform` text NOT NULL,
	`login_no` text,
	`server` text,
	`purchase_price` real,
	`purchase_date` text,
	`start_balance` real NOT NULL,
	`profit_target_pct` real,
	`daily_loss_pct` real NOT NULL,
	`daily_loss_mode` text NOT NULL,
	`max_loss_pct` real NOT NULL,
	`max_loss_mode` text NOT NULL,
	`min_trading_days` integer,
	`min_profitable_days` integer,
	`consistency_pct` real,
	`news_rule_minutes` integer,
	`weekend_allowed` integer DEFAULT false,
	`inactivity_days` integer,
	`profit_split_pct` real,
	`payout_cap` real,
	`payout_interval_days` integer,
	`copy_group` text,
	`notes` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `ai_usage` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`ts` text NOT NULL,
	`purpose` text NOT NULL,
	`model` text NOT NULL,
	`input_tokens` integer NOT NULL,
	`output_tokens` integer NOT NULL,
	`est_cost_usd` real NOT NULL
);
--> statement-breakpoint
CREATE TABLE `briefings` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`date` text NOT NULL,
	`status` text NOT NULL,
	`content_json` text,
	`markdown` text,
	`vault_path` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `calendar_events` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`ts` text NOT NULL,
	`country` text NOT NULL,
	`title` text NOT NULL,
	`impact` text NOT NULL,
	`forecast` text,
	`previous` text,
	`actual` text
);
--> statement-breakpoint
CREATE TABLE `content_ideas` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`source_type` text NOT NULL,
	`source_id` text,
	`idea` text NOT NULL,
	`hook_de` text,
	`hook_en` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `goals` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`account_id` integer,
	`title` text NOT NULL,
	`target_value` real NOT NULL,
	`unit` text NOT NULL,
	`deadline` text,
	`current_value` real DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `layout` (
	`page` text PRIMARY KEY NOT NULL,
	`json` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `news_items` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`source` text NOT NULL,
	`url` text NOT NULL,
	`title` text NOT NULL,
	`published_at` text NOT NULL,
	`summary_de` text,
	`relevance` integer,
	`category` text,
	`assets_json` text,
	`direction_json` text,
	`cluster_id` text,
	`raw_json` text
);
--> statement-breakpoint
CREATE TABLE `payouts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`account_id` integer NOT NULL,
	`date` text NOT NULL,
	`gross` real NOT NULL,
	`split_pct` real NOT NULL,
	`fees` real DEFAULT 0 NOT NULL,
	`net` real NOT NULL,
	`note` text,
	FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `predictions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`created_at` text NOT NULL,
	`text` text NOT NULL,
	`asset` text,
	`horizon` text,
	`outcome` text DEFAULT 'open' NOT NULL,
	`resolved_at` text
);
--> statement-breakpoint
CREATE TABLE `reviews` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`week` text NOT NULL,
	`content_json` text,
	`vault_path` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value_json` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `social_items` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`platform` text NOT NULL,
	`external_id` text NOT NULL,
	`title` text,
	`url` text,
	`metric_value` real,
	`metric_type` text,
	`ts` text NOT NULL,
	`topic` text,
	`sentiment` text
);
--> statement-breakpoint
CREATE TABLE `trade_images` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`trade_id` integer NOT NULL,
	`path` text NOT NULL,
	`kind` text NOT NULL,
	`ai_extract_json` text,
	FOREIGN KEY (`trade_id`) REFERENCES `trades`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `trades` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`account_id` integer,
	`copy_group` text,
	`instrument` text NOT NULL,
	`direction` text NOT NULL,
	`opened_at` text,
	`closed_at` text,
	`session` text,
	`entry` real,
	`sl` real,
	`tp1` real,
	`tp2` real,
	`tp3` real,
	`tp_split_json` text,
	`size` real,
	`risk_pct` real,
	`risk_usd` real,
	`rr_planned` real,
	`exit_prices_json` text,
	`result_r` real,
	`result_usd` real,
	`status` text NOT NULL,
	`setup_types_json` text,
	`timeframes_json` text,
	`reasoning` text,
	`emotion_score` integer,
	`emotion_tags_json` text,
	`rule_checks_json` text,
	`followed_plan` integer,
	`lesson` text,
	`mt5_deal_ids_json` text,
	`vault_path` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `trend_topics` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`topic` text NOT NULL,
	`platform` text NOT NULL,
	`mentions_24h` integer NOT NULL,
	`mentions_avg_7d` real NOT NULL,
	`zscore` real NOT NULL,
	`ts` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `vault_notes` (
	`path` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`area` text,
	`tags_json` text,
	`links_json` text,
	`todos_open` integer DEFAULT 0 NOT NULL,
	`mtime` text NOT NULL,
	`size` integer NOT NULL
);
