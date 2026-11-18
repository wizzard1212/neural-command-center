import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { ROOT_DIR } from "../lib/env.js";

export interface FeedConfig {
  id: string;
  name: string;
  url: string;
  enabled: boolean;
}

const FEEDS_PATH = resolve(ROOT_DIR, "config/feeds.json");

export function loadFeeds(): FeedConfig[] {
  if (!existsSync(FEEDS_PATH)) return [];
  return JSON.parse(readFileSync(FEEDS_PATH, "utf-8")) as FeedConfig[];
}

function saveFeeds(feeds: FeedConfig[]) {
  writeFileSync(FEEDS_PATH, JSON.stringify(feeds, null, 2) + "\n", "utf-8");
}

export function setFeedEnabled(id: string, enabled: boolean): FeedConfig[] {
  const feeds = loadFeeds();
  const feed = feeds.find((f) => f.id === id);
  if (feed) feed.enabled = enabled;
  saveFeeds(feeds);
  return feeds;
}

export function addFeed(feed: Omit<FeedConfig, "enabled"> & { enabled?: boolean }): FeedConfig[] {
  const feeds = loadFeeds();
  if (feeds.some((f) => f.id === feed.id)) throw new Error(`Feed "${feed.id}" existiert bereits.`);
  feeds.push({ ...feed, enabled: feed.enabled ?? true });
  saveFeeds(feeds);
  return feeds;
}

export function removeFeed(id: string): FeedConfig[] {
  const feeds = loadFeeds().filter((f) => f.id !== id);
  saveFeeds(feeds);
  return feeds;
}
