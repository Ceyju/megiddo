import { createHash } from "node:crypto";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import type { NextRequest } from "next/server";
import { unstable_rethrow } from 'next/navigation';

export type RateLimitProfile = "search" | "novel";

export interface RateLimitResult {
  allowed: boolean;
  status: "active" | "local" | "unconfigured" | "unavailable";
  statusCode: 200 | 429 | 503;
  limit: number;
  remaining: number;
  reset: number;
}

const limits = { search: 30, novel: 20 };
const limiters = new Map<string, Ratelimit>();
const localWindows = new Map<string, { count: number; reset: number }>();
let redis: Redis | undefined;

function unavailable(status: "unconfigured" | "unavailable", limit: number): RateLimitResult {
  return { allowed: false, status, statusCode: 503, limit, remaining: 0, reset: Date.now() + 60_000 };
}

function localLimit(bucket: string, key: string, limit: number): RateLimitResult {
  const now = Date.now();
  for (const [id, window] of localWindows) if (window.reset <= now) localWindows.delete(id);
  const id = `${bucket}:${key}`;
  let window = localWindows.get(id);
  // Refuse new keys at capacity rather than evicting counters and allowing bypasses.
  if (!window && localWindows.size >= 10_000) return unavailable("unavailable", limit);
  if (!window) { window = { count: 0, reset: now + 60_000 }; localWindows.set(id, window); }
  const allowed = window.count < limit;
  if (allowed) window.count++;
  return { allowed, status: "local", statusCode: allowed ? 200 : 429, limit, remaining: Math.max(0, limit - window.count), reset: window.reset };
}

async function checkBucket(bucket: string, key: string, limit: number): Promise<RateLimitResult> {
  const url = process.env.UPSTASH_REDIS_REST_URL?.trim();
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();
  if (!url || !token) {
    // A partial configuration is a mistake, even in development.
    if (url || token || process.env.NODE_ENV === "production") return unavailable("unconfigured", limit);
    return localLimit(bucket, key, limit);
  }
  try {
    redis ??= new Redis({ url, token, retry: false, signal: () => AbortSignal.timeout(1_500) });
    const id = `${bucket}:${limit}`;
    let limiter = limiters.get(id);
    if (!limiter) {
      limiter = new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(limit, "1 m"), prefix: `megiddo:${bucket}:${limit}`, timeout: 1_000 });
      limiters.set(id, limiter);
    }
    const result = await limiter.limit(key);
    // Upstash's timeout is fail-open unless its reason is checked explicitly.
    if (result.reason === "timeout") {
      console.error('[rate-limit]', { bucket, reason: 'timeout' });
      return unavailable("unavailable", limit);
    }
    return { allowed: result.success, status: "active", statusCode: result.success ? 200 : 429, limit: result.limit, remaining: result.remaining, reset: result.reset };
  } catch (error) {
    unstable_rethrow(error);
    // SDK error messages can contain credentials or command data; log only a category.
    const message = error instanceof Error ? error.message : '';
    const reason = /WRONGPASS|unauthorized|invalid.*token|invalid.*password|authentication/i.test(message) ? 'authentication'
      : /NOPERM|permission|read.?only/i.test(message) ? 'permissions'
      : /quota|(?:monthly|daily|request|command).*limit.*exceed/i.test(message) ? 'quota'
      : /timeout|abort/i.test(error instanceof Error ? error.name : '') ? 'timeout' : 'connection';
    console.error('[rate-limit]', { bucket, reason });
    return unavailable("unavailable", limit);
  }
}

export async function checkRateLimit(req: NextRequest, profile: RateLimitProfile): Promise<RateLimitResult> {
  const salt = process.env.RATE_LIMIT_SALT?.trim();
  if (!salt && process.env.NODE_ENV === "production") return unavailable("unconfigured", limits[profile]);
  const forwarded = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const address = forwarded || req.headers.get("x-real-ip") || "unknown";
  const key = createHash("sha256").update(`${salt || "megiddo-local-development"}:${address}`).digest("hex");
  return checkBucket(profile, key, limits[profile]);
}

export async function checkProviderRateLimit(origin: string): Promise<RateLimitResult> {
  const raw = process.env.OUTBOUND_REQUESTS_PER_MINUTE?.trim() || "60";
  const limit = Number(raw);
  if (!/^\d+$/.test(raw) || !Number.isSafeInteger(limit) || limit < 1 || limit > 1_000) return unavailable("unconfigured", 60);
  // No user/IP/path in this key: all instances and callers share each origin's budget.
  return checkBucket("outbound", createHash("sha256").update(new URL(origin).origin).digest("hex"), limit);
}

export function rateLimitHeaders(result: RateLimitResult) {
  const headers = new Headers({
    "RateLimit-Limit": String(result.limit),
    "RateLimit-Remaining": String(Math.max(0, result.remaining)),
    "RateLimit-Reset": String(result.reset),
    "X-RateLimit-Status": result.status,
  });
  if (!result.allowed) {
    const retryAfter = result.reset ? Math.max(1, Math.ceil((result.reset - Date.now()) / 1_000)) : 60;
    headers.set("Retry-After", String(retryAfter));
  }
  return headers;
}
