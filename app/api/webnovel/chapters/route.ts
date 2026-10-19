import { NextRequest, NextResponse } from "next/server";
import { getNovelChapters } from "@/lib/novelfire";
import { apiError, ValidationError } from "@/lib/server/api";
import { checkRateLimit, rateLimitHeaders } from "@/lib/server/rate-limit";
import { boundedInteger, slug as validSlug } from "@/lib/server/validation";
import { ProviderNotFoundError } from '@/lib/server/provider-errors';

export async function GET(req: NextRequest) {
  try {
    const rate = await checkRateLimit(req, "novel");
    const headers = rateLimitHeaders(rate);
    if (!rate.allowed) return apiError("RATE_LIMITED", "Too many chapter requests", 429, headers);
    const slug = validSlug(req.nextUrl.searchParams.get("slug"));
    const page = boundedInteger(req.nextUrl.searchParams.get("page"), "page", 1, 1, 100);
    const data = await getNovelChapters(slug, page);
    headers.set("Cache-Control", "s-maxage=1800, stale-while-revalidate=3600");
    return NextResponse.json(data, { headers });
  } catch (error) {
    if (error instanceof ProviderNotFoundError) return apiError('NOT_FOUND', error.message, 404);
    if (error instanceof ValidationError) return apiError(error.code, error.message, 400);
    return apiError("UPSTREAM_FAILURE", "Failed to fetch chapters", 502);
  }
}
