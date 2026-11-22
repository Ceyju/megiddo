import { NextRequest, NextResponse } from 'next/server';
import { isAtsumaruImagePath } from '@/lib/atsumaru-images';
import { fetchAtsumaruImage } from '@/lib/server/atsumaru-image';
import { apiError, rateLimitError, upstreamApiError } from '@/lib/server/api';
import { checkRateLimit, rateLimitHeaders } from '@/lib/server/rate-limit';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const paths = req.nextUrl.searchParams.getAll('path');
  if (paths.length !== 1 || !isAtsumaruImagePath(paths[0])) {
    return apiError('INVALID_REQUEST', 'Invalid Atsumaru image path', 400, { 'Cache-Control': 'no-store' });
  }
  try {
    const rate = await checkRateLimit(req, 'mangaImage');
    if (!rate.allowed) {
      const headers = rateLimitHeaders(rate);
      headers.set('Cache-Control', 'no-store');
      return rateLimitError(rate, 'Too many image requests', headers);
    }
    const image = await fetchAtsumaruImage(paths[0]);
    return new NextResponse(image.body, { headers: {
      'Content-Type': image.type,
      'Content-Length': String(image.body.byteLength),
      'Content-Disposition': 'inline',
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': image.cacheControl,
    } });
  } catch (error) {
    const response = upstreamApiError(error, 'Atsumaru image is temporarily unavailable');
    response.headers.set('Cache-Control', 'no-store');
    return response;
  }
}
