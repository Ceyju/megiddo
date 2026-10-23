import { NextRequest, NextResponse } from "next/server";
import { searchAnime } from "@/lib/anilist";
import { apiError, rateLimitError, upstreamApiError, ValidationError } from "@/lib/server/api";
import { checkRateLimit, rateLimitHeaders } from "@/lib/server/rate-limit";
import { boundedInteger, genreList, searchQuery } from "@/lib/server/validation";

export async function GET(req: NextRequest) {
  try {
    const rate = await checkRateLimit(req, "search");
    const headers = rateLimitHeaders(rate);
    if (!rate.allowed) return rateLimitError(rate, "Too many search requests", headers);
    const q = searchQuery(req.nextUrl.searchParams.get("q"), { allowEmpty: true });
    const page = boundedInteger(req.nextUrl.searchParams.get("page"), "page", 1, 1, 100);
    const perPage = boundedInteger(req.nextUrl.searchParams.get("perPage"), "perPage", 24, 1, 24);
    const genres = genreList(req.nextUrl.searchParams.get("genres"));
    const data = await searchAnime(q || " ", page, perPage, genres);
    return NextResponse.json(data, { headers });
  } catch (error) {
    if (error instanceof ValidationError) return apiError(error.code, error.message, 400);
    console.error("Anime search failed", error instanceof Error ? error.name : "unknown");
    return upstreamApiError(error, "Search is temporarily unavailable");
  }
}
