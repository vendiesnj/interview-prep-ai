// app/lib/rateLimit.ts
import { Redis } from "@upstash/redis";

// Uses UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN from env
export const redis = Redis.fromEnv();

type RateLimitResult =
  | { ok: true; remaining: number; resetMs: number }
  | { ok: false; remaining: 0; resetMs: number };

/**
 * Fixed-window rate limit using Redis INCR + PEXPIRE.
 * windowMs: length of window (e.g. 60_000 for 1 minute)
 * limit: max requests per window
 */
export async function rateLimitFixedWindow(opts: {
  key: string;
  limit: number;
  windowMs: number;
}): Promise<RateLimitResult> {
  const { key, limit, windowMs } = opts;

  const count = await redis.incr(key);

  // First hit sets the TTL for the window
  if (count === 1) {
    await redis.pexpire(key, windowMs);
  }

  const ttl = await redis.pttl(key);
  const resetMs = typeof ttl === "number" && ttl > 0 ? ttl : windowMs;

  if (count > limit) {
    return { ok: false, remaining: 0, resetMs };
  }

  return { ok: true, remaining: Math.max(0, limit - count), resetMs };
}