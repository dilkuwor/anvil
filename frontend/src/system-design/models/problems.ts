export type SimulatorProblem = {
  slug: string;
  title: string;
  difficulty: "EASY" | "MEDIUM" | "HARD";
  summary: string;
  prompt: string;
  seed?: Partial<{ dau: number; requestsPerUserDay: number; readRatio: number; peakMultiplier: number }>;
};

export const SIMULATOR_PROBLEMS: SimulatorProblem[] = [
  {
    slug: "url-shortener",
    title: "URL Shortener",
    difficulty: "MEDIUM",
    summary: "High-read redirects with a thin write path.",
    prompt: "Shorten URLs and redirect at ~10:1 read/write. Keep p95 under 200ms.",
    seed: { dau: 20_000_000, requestsPerUserDay: 8, readRatio: 0.92, peakMultiplier: 5 },
  },
  {
    slug: "news-feed",
    title: "News Feed",
    difficulty: "HARD",
    summary: "Read-heavy fan-out with a cacheable home timeline.",
    prompt: "Serve a home feed. Reads dwarf writes. A celebrity post should not melt the store.",
    seed: { dau: 80_000_000, requestsPerUserDay: 30, readRatio: 0.95, peakMultiplier: 4 },
  },
  {
    slug: "chat",
    title: "Chat System",
    difficulty: "HARD",
    summary: "Realtime messaging with durable history.",
    prompt: "One-to-one and small group chat. Messages must not disappear if a client reconnects.",
    seed: { dau: 40_000_000, requestsPerUserDay: 50, readRatio: 0.7, peakMultiplier: 3 },
  },
  {
    slug: "video",
    title: "Video Streaming",
    difficulty: "HARD",
    summary: "Upload once, watch many times through a CDN.",
    prompt: "Uploads are async. Playback should start near the viewer.",
    seed: { dau: 50_000_000, requestsPerUserDay: 6, readRatio: 0.97, peakMultiplier: 4 },
  },
];
