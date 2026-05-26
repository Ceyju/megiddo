const GB_BASE = process.env.GOOGLE_BOOKS_API_BASE ?? '';
const GB_KEY = process.env.GOOGLE_BOOKS_API_KEY ?? '';

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
    const url = new URL(`${GB_BASE}/volumes/${volumeId}`);
    if (GB_KEY) url.searchParams.set('key', GB_KEY);
    const res = await fetch(url.toString(), { next: { revalidate: 3600 } });
    if (!res.ok) return null;

    const j = await res.json() as {
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
  } catch {
    return null;
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
    const url = new URL(`${GB_BASE}/volumes/${volumeId}`);
    url.searchParams.set('projection', 'lite');
    if (GB_KEY) url.searchParams.set('key', GB_KEY);

    const res = await fetch(url.toString(), { next: { revalidate: 3600 } });
    if (!res.ok) return null;

    const json = await res.json() as {
      id: string;
      volumeInfo?: { previewLink?: string };
      accessInfo?: {
        viewability?: GBViewability;
        embeddable?: boolean;
      };
    };

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
  } catch {
    return null;
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
    const url = new URL(`${GB_BASE}/volumes`);
    url.searchParams.set('q', `isbn:${isbn}`);
    url.searchParams.set('maxResults', '1');
    url.searchParams.set('projection', 'lite');
    if (GB_KEY) url.searchParams.set('key', GB_KEY);

    const res = await fetch(url.toString(), { next: { revalidate: 3600 } });
    if (!res.ok) return null;

    const json = await res.json() as { items?: Array<{ id: string }> };
    const volumeId = json.items?.[0]?.id;
    if (!volumeId) return null;

    return checkGBPreview(volumeId);
  } catch {
    return null;
  }
}