// app/lib/rateLimit.ts
import { Redis } from "@upstash/redis";

type RateLimitResult =
  | { ok: true; remaining: number; resetMs: number }
  | { ok: false; remaining: 0; resetMs: number };

// --- Safe Redis init (never crash production routes on missing env) ---
let redis: Redis | null = null;

function getRedis(): Redis | null {
  if (redis) return redis;
  try {
    // Requires UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN
    redis = Redis.fromEnv();
    return redis;
  } catch {
    // Fall back to in-memory limiter (best-effort, per instance)
    return null;
  }
}

// --- In-memory fallback (best-effort, per instance) ---
const mem = new Map<string, { count: number; resetAt: number }>();

function memFixedWindow(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  const cur = mem.get(key);

  if (!cur || now >= cur.resetAt) {
    mem.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: Math.max(0, limit - 1), resetMs: windowMs };
  }

  cur.count += 1;
  const resetMs = Math.max(0, cur.resetAt - now);

  if (cur.count > limit) return { ok: false, remaining: 0, resetMs };
  return { ok: true, remaining: Math.max(0, limit - cur.count), resetMs };
}

/**
 * Fixed-window rate limit using Redis INCR + PEXPIRE when available.
 * Falls back to in-memory limiter if Redis isn't configured.
 */
export async function rateLimitFixedWindow(opts: {
  key: string;
  limit: number;
  windowMs: number;
}): Promise<RateLimitResult> {
  const { key, limit, windowMs } = opts;

  const r = getRedis();
  if (!r) return memFixedWindow(key, limit, windowMs);

  const count = await r.incr(key);

  if (count === 1) {
    await r.pexpire(key, windowMs);
  }

  const ttl = await r.pttl(key);
  const resetMs = typeof ttl === "number" && ttl > 0 ? ttl : windowMs;

  if (count > limit) return { ok: false, remaining: 0, resetMs };
  return { ok: true, remaining: Math.max(0, limit - count), resetMs };
}