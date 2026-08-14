import { NextRequest, NextResponse } from "next/server";
import { parseChapterContent } from "@/lib/novelfire";
import { apiError, ValidationError } from "@/lib/server/api";
import { checkRateLimit, rateLimitHeaders } from "@/lib/server/rate-limit";
import { chapterSlug, slug as validSlug } from "@/lib/server/validation";

export async function GET(req: NextRequest) {
  try {
    const rate = await checkRateLimit(req, "novel");
    const headers = rateLimitHeaders(rate);
    if (!rate.allowed) return apiError("RATE_LIMITED", "Too many chapter requests", 429, headers);
    const slug = validSlug(req.nextUrl.searchParams.get("slug"));
    const chapter = chapterSlug(req.nextUrl.searchParams.get("ch"));
    const data = await parseChapterContent(slug, chapter);
    if (!data) return apiError("NOT_FOUND", "Chapter not found", 404, headers);
    headers.set("Cache-Control", "s-maxage=3600, stale-while-revalidate=7200");
    return NextResponse.json(data, { headers });
  } catch (error) {
    if (error instanceof ValidationError) return apiError(error.code, error.message, 400);
    return apiError("UPSTREAM_FAILURE", "Failed to fetch chapter", 502);
  }
}
