import { redditSource } from "./reddit.js";
import { lunarcrushSource } from "./lunarcrush.js";
import { coingeckoTrendingSource } from "./coingeckoTrending.js";
import { googleTrendsSource } from "./googleTrends.js";
import { youtubeSource } from "./youtube.js";
import type { SocialSource } from "../socialSource.js";

export const ALL_SOCIAL_SOURCES: SocialSource[] = [
  redditSource,
  lunarcrushSource,
  coingeckoTrendingSource,
  googleTrendsSource,
  youtubeSource,
];
