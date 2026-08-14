import { NextRequest, NextResponse } from "next/server";
import { searchNovels } from "@/lib/novelfire";
import { apiError, ValidationError } from "@/lib/server/api";
import { checkRateLimit, rateLimitHeaders } from "@/lib/server/rate-limit";
import { searchQuery } from "@/lib/server/validation";

export async function GET(req: NextRequest) {
  try {
    const rate = await checkRateLimit(req, "novel");
    const headers = rateLimitHeaders(rate);
    if (!rate.allowed) return apiError("RATE_LIMITED", "Too many novel searches", 429, headers);
    const q = searchQuery(req.nextUrl.searchParams.get("q"));
    const results = await searchNovels(q);
    return NextResponse.json({ results }, { headers });
  } catch (error) {
    if (error instanceof ValidationError) return apiError(error.code, error.message, 400);
    return apiError("UPSTREAM_FAILURE", "Novel search is temporarily unavailable", 502);
  }
}
