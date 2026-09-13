import "server-only";

const WINDOW_MS = 10 * 60_000;
const LIMIT = 30;
const hits = new Map<string, number[]>();

/** In-memory, per-instance limiter. Enough to stop casual abuse of a free tool. */
export function isRateLimited(request: Request): boolean {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0].trim() || request.headers.get("x-real-ip") || "local";
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 5_000) {
    for (const [key, times] of hits) if (now - times[times.length - 1] > WINDOW_MS) hits.delete(key);
  }
  return recent.length > LIMIT;
}
