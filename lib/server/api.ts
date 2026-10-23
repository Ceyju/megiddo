import { NextResponse } from "next/server";
import type { RateLimitResult } from './rate-limit';
import { UpstreamError } from './outbound';

export interface ApiError {
  error: {
    code: string;
    message: string;
  };
}

export function apiError(code: string, message: string, status: number, headers?: HeadersInit) {
  return NextResponse.json<ApiError>({ error: { code, message } }, { status, headers });
}

export function rateLimitError(rate: RateLimitResult, message: string, headers: HeadersInit) {
  return apiError(rate.statusCode === 503 ? 'RATE_LIMIT_UNAVAILABLE' : 'RATE_LIMITED',
    rate.statusCode === 503 ? 'Rate limiting is temporarily unavailable' : message, rate.statusCode, headers);
}

export function upstreamApiError(error: unknown, message: string) {
  if (error instanceof UpstreamError && error.status === 503) {
    return apiError('PROVIDER_BUSY', 'Provider requests are temporarily unavailable. Please retry later.', 503,
      { 'Retry-After': String(error.retryAfter ?? 60) });
  }
  return apiError('UPSTREAM_FAILURE', message, 502);
}

export class ValidationError extends Error {
  constructor(message: string, public readonly code = "INVALID_REQUEST") {
    super(message);
    this.name = "ValidationError";
  }
}

