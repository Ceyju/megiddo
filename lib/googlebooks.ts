import { outboundFetch, UpstreamError } from './server/outbound';
import { serverBaseUrl } from './server/env';

async function gbFetch(path: string, parameters: Record<string, string> = {}) {
  const base = serverBaseUrl('GOOGLE_BOOKS_API_BASE') ?? 'https://www.googleapis.com/books/v1';
  const url = new URL(`${base}${path}`);
  for (const [name, value] of Object.entries(parameters)) url.searchParams.set(name, value);
  const key = process.env.GOOGLE_BOOKS_API_KEY?.trim();
  if (key) url.searchParams.set('key', key);
  try {
    return await outboundFetch(url.toString(), {
      allowedOrigins: [new URL(base).origin], expectedType: 'json', next: { revalidate: 3600 },
    });
  } catch (error) {
    if (error instanceof UpstreamError && error.upstreamStatus === 404) return null;
    const status = error instanceof UpstreamError ? error.upstreamStatus : undefined;
    console.error('[Google Books] provider request failed', { status: status ?? 'network-or-response-error' });
    throw new UpstreamError(status === 429 ? 'Google Books quota is temporarily exhausted' : status === 400 || status === 403 ? 'Google Books configuration was rejected' : 'Google Books is temporarily unavailable', 502, status);
  }
}

export interface GBVolumeDetail {
  id: string;
  title: string;
  authors: string[];
  publisher: string | null;
  publishedDate: string | null;
  description: string | null;
  pageCount: number | null;
  coverUrl: string | null;
  isbn13: string | null;
  isbn10: string | null;
  averageRating: number | null;
  previewLink: string | null;
}

export async function getGBVolumeById(
  volumeId: string,
): Promise<GBVolumeDetail | null> {
  try {
    const j = await gbFetch(`/volumes/${encodeURIComponent(volumeId)}`) as {
      id: string;
      volumeInfo?: {
        title?: string;
        authors?: string[];
        publisher?: string;
        publishedDate?: string;
        description?: string;
        pageCount?: number;
        imageLinks?: { thumbnail?: string; smallThumbnail?: string };
        industryIdentifiers?: Array<{ type: string; identifier: string }>;
        averageRating?: number;
        previewLink?: string;
      };
    };

    if (!j) return null;
    if (!j.id) throw new UpstreamError('Google Books returned malformed metadata');
    const v = j.volumeInfo ?? {};
    const isbns = v.industryIdentifiers ?? [];

    return {
      id: j.id,
      title: v.title ?? 'Unknown Title',
      authors: v.authors ?? [],
      publisher: v.publisher ?? null,
      publishedDate: v.publishedDate ?? null,
      description: v.description ?? null,
      pageCount: v.pageCount ?? null,
      coverUrl: (v.imageLinks?.thumbnail ?? v.imageLinks?.smallThumbnail ?? null)
        ?.replace('http://', 'https://') ?? null,
      isbn13: isbns.find(i => i.type === 'ISBN_13')?.identifier ?? null,
      isbn10: isbns.find(i => i.type === 'ISBN_10')?.identifier ?? null,
      averageRating: v.averageRating ?? null,
      previewLink: v.previewLink ?? null,
    };
  } catch (error) {
    if (error instanceof UpstreamError) throw error;
    throw new UpstreamError('Google Books is temporarily unavailable');
  }
}

export type GBViewability = 'ALL_PAGES' | 'PARTIAL' | 'NO_PAGES' | 'UNKNOWN';

export interface GBPreviewInfo {
  volumeId: string;
  viewability: GBViewability;
  isEmbeddable: boolean;
  previewLink: string | null;
  viewerIdentifier: string;
}

export async function checkGBPreview(
  volumeId: string,
): Promise<GBPreviewInfo | null> {
  try {
    const json = await gbFetch(`/volumes/${encodeURIComponent(volumeId)}`, { projection: 'lite' }) as {
      id: string;
      volumeInfo?: { previewLink?: string };
      accessInfo?: {
        viewability?: GBViewability;
        embeddable?: boolean;
      };
    };

    if (!json) return null;
    if (!json.id) throw new UpstreamError('Google Books returned malformed preview data');
    const viewability = json.accessInfo?.viewability ?? 'UNKNOWN';
    const isEmbeddable =
      json.accessInfo?.embeddable === true &&
      (viewability === 'ALL_PAGES' || viewability === 'PARTIAL');

    return {
      volumeId: json.id,
      viewability,
      isEmbeddable,
      previewLink: json.volumeInfo?.previewLink ?? null,
      viewerIdentifier: json.id, // Google Books volume ID is the most reliable identifier
    };
  } catch (error) {
    if (error instanceof UpstreamError) throw error;
    throw new UpstreamError('Google Books is temporarily unavailable');
  }
}

/**
 * Check preview availability by ISBN.
 * Use this when you have an ISBN from AniList or Open Library but no volume ID yet.
 */
export async function checkGBPreviewByISBN(
  isbn: string,
): Promise<GBPreviewInfo | null> {
  try {
    const json = await gbFetch('/volumes', { q: `isbn:${isbn}`, maxResults: '1', projection: 'lite' }) as { items?: Array<{ id: string }> } | null;
    if (!json) return null;
    const volumeId = json.items?.[0]?.id;
    if (!volumeId) return null;

    return checkGBPreview(volumeId);
  } catch (error) {
    if (error instanceof UpstreamError) throw error;
    throw new UpstreamError('Google Books is temporarily unavailable');
  }
}
