import { NextResponse } from "next/server";

export interface ApiError {
  error: {
    code: string;
    message: string;
  };
}

export function apiError(code: string, message: string, status: number, headers?: HeadersInit) {
  return NextResponse.json<ApiError>({ error: { code, message } }, { status, headers });
}

export class ValidationError extends Error {
  constructor(message: string, public readonly code = "INVALID_REQUEST") {
    super(message);
    this.name = "ValidationError";
  }
}

