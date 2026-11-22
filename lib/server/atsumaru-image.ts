import { providerFetch, UpstreamError } from './outbound';
import { ATSUMARU_IMAGE_ORIGIN, isAtsumaruImagePath } from '../atsumaru-images';

const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
const IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/avif']);

function matchesImageType(bytes: Uint8Array, type: string): boolean {
  const text = (start: number, end: number) => String.fromCharCode(...bytes.slice(start, end));
  if (type === 'image/jpeg') return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (type === 'image/png') return [137, 80, 78, 71, 13, 10, 26, 10].every((value, i) => bytes[i] === value);
  if (type === 'image/webp') return bytes.length >= 12 && text(0, 4) === 'RIFF' && text(8, 12) === 'WEBP';
  if (type === 'image/avif' && text(4, 8) === 'ftyp') {
    for (let i = 8; i + 4 <= Math.min(bytes.length, 64); i += 4) {
      if (['avif', 'avis'].includes(text(i, i + 4))) return true;
    }
  }
  return false;
}

export async function fetchAtsumaruImage(path: string) {
  if (!isAtsumaruImagePath(path)) throw new UpstreamError('Invalid image path', 400);
  const response = await providerFetch(`${ATSUMARU_IMAGE_ORIGIN}${path}`, {
    headers: {
      Accept: 'image/avif,image/webp,image/png,image/jpeg',
      'User-Agent': process.env.USER_AGENT?.trim() || 'Megiddo/0.1 (personal manga reader)',
    },
    // Never forward the caller's cookies, referrer, or fetch metadata to the CDN.
    redirect: 'error', cache: 'no-store', signal: AbortSignal.timeout(12_000),
  });
  if (!response.ok) {
    await response.body?.cancel();
    throw new UpstreamError('Atsumaru image request failed', 502, response.status);
  }
  const type = response.headers.get('content-type')?.split(';')[0].trim().toLowerCase() ?? '';
  if (!IMAGE_TYPES.has(type) || Number(response.headers.get('content-length') ?? 0) > MAX_IMAGE_BYTES) {
    await response.body?.cancel();
    throw new UpstreamError('Atsumaru returned an unsupported or oversized image');
  }
  if (!response.body) throw new UpstreamError('Atsumaru returned an empty image');
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > MAX_IMAGE_BYTES) {
      await reader.cancel();
      throw new UpstreamError('Atsumaru returned an oversized image');
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  if (!matchesImageType(bytes, type)) throw new UpstreamError('Atsumaru returned invalid image content');
  return {
    body: bytes.buffer, type,
    cacheControl: /(?:no-store|private)/i.test(response.headers.get('cache-control') ?? '')
      ? 'no-store' : 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800',
  };
}
