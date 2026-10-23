import { NextRequest, NextResponse } from "next/server";
import { getNovelChapters } from "@/lib/novelfire";
import { apiError, rateLimitError, upstreamApiError, ValidationError } from "@/lib/server/api";
import { checkRateLimit, rateLimitHeaders } from "@/lib/server/rate-limit";
import { boundedInteger, slug as validSlug } from "@/lib/server/validation";
import { ProviderNotFoundError } from '@/lib/server/provider-errors';

export async function GET(req: NextRequest) {
  try {
    const rate = await checkRateLimit(req, "novel");
    const headers = rateLimitHeaders(rate);
    if (!rate.allowed) return rateLimitError(rate, "Too many chapter requests", headers);
    const slug = validSlug(req.nextUrl.searchParams.get("slug"));
    const page = boundedInteger(req.nextUrl.searchParams.get("page"), "page", 1, 1, 100);
    const data = await getNovelChapters(slug, page);
    headers.set("Cache-Control", "s-maxage=1800, stale-while-revalidate=3600");
    return NextResponse.json(data, { headers });
  } catch (error) {
    if (error instanceof ProviderNotFoundError) return apiError('NOT_FOUND', error.message, 404);
    if (error instanceof ValidationError) return apiError(error.code, error.message, 400);
    return upstreamApiError(error, "Failed to fetch chapters");
  }
}
