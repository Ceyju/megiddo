import { checkProviderRateLimit } from './rate-limit';

const DEFAULT_TIMEOUT_MS = 10_000;

export class UpstreamError extends Error {
  constructor(message: string, public readonly status = 502, public readonly upstreamStatus?: number, public readonly retryAfter?: number) {
    super(message);
    this.name = "UpstreamError";
  }
}

export async function providerFetch(input: string | URL | Request, init?: RequestInit): Promise<Response> {
  const url = new URL(input instanceof Request ? input.url : input);
  const rate = await checkProviderRateLimit(url.origin);
  if (!rate.allowed) {
    throw new UpstreamError(rate.statusCode === 429 ? 'Provider request budget exhausted' : 'Provider rate limiting is unavailable', 503, undefined,
      Math.max(1, Math.ceil((rate.reset - Date.now()) / 1_000)));
  }
  return fetch(input, init);
}

function checkedUrl(input: string, allowedOrigins: readonly string[]) {
  const url = new URL(input);
  const isLocalDevelopment = process.env.NODE_ENV !== "production" && ["localhost", "127.0.0.1", "::1"].includes(url.hostname);
  if (url.protocol !== "https:" && !(isLocalDevelopment && url.protocol === "http:")) {
    throw new UpstreamError("Upstream URL must use HTTPS", 500);
  }
  if (!allowedOrigins.includes(url.origin)) throw new UpstreamError("Upstream origin is not allowed", 500);
  return url;
}

async function boundedBody(response: Response, maxBytes: number) {
  const declared = Number(response.headers.get("content-length") ?? 0);
  if (declared > maxBytes) throw new UpstreamError("Upstream response is too large");
  if (!response.body) return "";
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let total = 0;
  let body = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel();
      throw new UpstreamError("Upstream response is too large");
    }
    body += decoder.decode(value, { stream: true });
  }
  return body + decoder.decode();
}

interface OutboundOptions extends RequestInit {
  allowedOrigins: readonly string[];
  timeoutMs?: number;
  maxBytes?: number;
  expectedType: "json" | "html";
}

export async function outboundFetch<T = unknown>(input: string, options: OutboundOptions): Promise<T | string> {
  const { allowedOrigins, timeoutMs = DEFAULT_TIMEOUT_MS, maxBytes, expectedType, ...init } = options;
  const url = checkedUrl(input, allowedOrigins);
  const response = await providerFetch(url, { ...init, signal: AbortSignal.timeout(Math.min(12_000, Math.max(8_000, timeoutMs))) });
  if (!response.ok) throw new UpstreamError(`Upstream returned ${response.status}`, 502, response.status);
  const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";
  const typeAllowed = expectedType === "json"
    ? contentType.includes("application/json")
    : contentType.includes("text/html") || contentType.includes("application/xhtml+xml");
  if (!typeAllowed) throw new UpstreamError("Unexpected upstream content type");
  const body = await boundedBody(response, maxBytes ?? (expectedType === "json" ? 1_048_576 : 2_097_152));
  if (expectedType === "html") return body;
  try {
    return JSON.parse(body) as T;
  } catch {
    throw new UpstreamError("Upstream returned malformed JSON");
  }
}

