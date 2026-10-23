import { NextRequest, NextResponse } from "next/server";
import { searchNovels } from "@/lib/novelfire";
import { apiError, rateLimitError, upstreamApiError, ValidationError } from "@/lib/server/api";
import { checkRateLimit, rateLimitHeaders } from "@/lib/server/rate-limit";
import { searchQuery } from "@/lib/server/validation";

export async function GET(req: NextRequest) {
  try {
    const rate = await checkRateLimit(req, "novel");
    const headers = rateLimitHeaders(rate);
    if (!rate.allowed) return rateLimitError(rate, "Too many novel searches", headers);
    const q = searchQuery(req.nextUrl.searchParams.get("q"));
    const results = await searchNovels(q);
    return NextResponse.json({ results }, { headers });
  } catch (error) {
    if (error instanceof ValidationError) return apiError(error.code, error.message, 400);
    return upstreamApiError(error, "Novel search is temporarily unavailable");
  }
}
