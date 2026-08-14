import { createHash } from "node:crypto";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import type { NextRequest } from "next/server";

export type RateLimitProfile = "search" | "novel";

interface RateLimitResult {
  allowed: boolean;
  configured: boolean;
  limit: number;
  remaining: number;
  reset: number;
}

const limits: Record<RateLimitProfile, number> = { search: 30, novel: 20 };
let limiters: Record<RateLimitProfile, Ratelimit> | null | undefined;

function getLimiters() {
  if (limiters !== undefined) return limiters;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return (limiters = null);
  const redis = new Redis({ url, token });
  return (limiters = {
    search: new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(30, "1 m"), prefix: "megiddo:search" }),
    novel: new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(20, "1 m"), prefix: "megiddo:novel" }),
  });
}

function clientKey(req: NextRequest) {
  const forwarded = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const address = forwarded || req.headers.get("x-real-ip") || "unknown";
  const salt = process.env.RATE_LIMIT_SALT || "megiddo-local-development";
  return createHash("sha256").update(`${salt}:${address}`).digest("hex");
}

export async function checkRateLimit(req: NextRequest, profile: RateLimitProfile): Promise<RateLimitResult> {
  const configured = getLimiters();
  const limit = limits[profile];
  if (!configured) {
    return { allowed: true, configured: false, limit, remaining: limit, reset: 0 };
  }

  try {
    const result = await configured[profile].limit(clientKey(req));
    return { allowed: result.success, configured: true, limit: result.limit, remaining: result.remaining, reset: result.reset };
  } catch {
    return { allowed: true, configured: true, limit, remaining: limit, reset: 0 };
  }
}

export function rateLimitHeaders(result: RateLimitResult) {
  const headers = new Headers({
    "RateLimit-Limit": String(result.limit),
    "RateLimit-Remaining": String(Math.max(0, result.remaining)),
    "RateLimit-Reset": String(result.reset),
    "X-RateLimit-Status": result.configured ? "active" : "unconfigured",
  });
  if (!result.allowed) {
    const retryAfter = result.reset ? Math.max(1, Math.ceil((result.reset - Date.now()) / 1_000)) : 60;
    headers.set("Retry-After", String(retryAfter));
  }
  return headers;
}
