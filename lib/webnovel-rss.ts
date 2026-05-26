const GB_BASE = process.env.GOOGLE_BOOKS_API_BASE ?? '';
const GB_KEY = process.env.GOOGLE_BOOKS_API_KEY ?? '';

export interface GBVolume {
  id: string;
  title: string;
  authors: string[];
  publisher: string | null;
  publishedDate: string | null;
  description: string | null;
  isbn10: string | null;
  isbn13: string | null;
  pageCount: number | null;
  categories: string[];
  averageRating: number | null;
  ratingsCount: number | null;
  language: string | null;
  coverUrl: string | null;
  coverUrlLarge: string | null;
  previewLink: string | null;
  infoLink: string | null;
  isEbook: boolean;
  saleability: string | null;
}

interface GBRawVolume {
  id: string;
  volumeInfo: {
    title?: string;
    authors?: string[];
    publisher?: string;
    publishedDate?: string;
    description?: string;
    industryIdentifiers?: Array<{ type: string; identifier: string }>;
    pageCount?: number;
    categories?: string[];
    averageRating?: number;
    ratingsCount?: number;
    language?: string;
    imageLinks?: {
      smallThumbnail?: string;
      thumbnail?: string;
      small?: string;
      medium?: string;
      large?: string;
      extraLarge?: string;
    };
    previewLink?: string;
    infoLink?: string;
    canonicalVolumeLink?: string;
  };
  saleInfo?: {
    saleability?: string;
    isEbook?: boolean;
  };
  accessInfo?: {
    epub?: { isAvailable?: boolean };
    pdf?: { isAvailable?: boolean };
  };
}

interface GBSearchResponse {
  kind: string;
  totalItems: number;
  items?: GBRawVolume[];
}

// ---------------------------------------------------------------------------
// Converter
// ---------------------------------------------------------------------------

function rawToGBVolume(raw: GBRawVolume): GBVolume {
  const info = raw.volumeInfo;
  const identifiers = info.industryIdentifiers ?? [];
  const isbn10 = identifiers.find(i => i.type === 'ISBN_10')?.identifier ?? null;
  const isbn13 = identifiers.find(i => i.type === 'ISBN_13')?.identifier ?? null;

  // Google Books thumbnail URLs contain zoom params — bump to zoom=1 for larger
  const thumbRaw = info.imageLinks?.thumbnail ?? info.imageLinks?.smallThumbnail ?? null;
  const coverUrl = thumbRaw ? thumbRaw.replace('zoom=5', 'zoom=1').replace('&edge=curl', '') : null;
  const coverUrlLarge =
    info.imageLinks?.extraLarge ??
    info.imageLinks?.large ??
    info.imageLinks?.medium ??
    coverUrl;

  return {
    id: raw.id,
    title: info.title ?? 'Unknown',
    authors: info.authors ?? [],
    publisher: info.publisher ?? null,
    publishedDate: info.publishedDate ?? null,
    description: info.description ?? null,
    isbn10,
    isbn13,
    pageCount: info.pageCount ?? null,
    categories: info.categories ?? [],
    averageRating: info.averageRating ?? null,
    ratingsCount: info.ratingsCount ?? null,
    language: info.language ?? null,
    coverUrl,
    coverUrlLarge,
    previewLink: info.previewLink ?? null,
    infoLink: info.infoLink ?? null,
    isEbook: raw.saleInfo?.isEbook ?? false,
    saleability: raw.saleInfo?.saleability ?? null,
  };
}

// ---------------------------------------------------------------------------
// Internal fetch
// ---------------------------------------------------------------------------

function buildUrl(path: string, params: Record<string, string>): string {
  const url = new URL(`${GB_BASE}${path}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  if (GB_KEY) url.searchParams.set('key', GB_KEY);
  return url.toString();
}

async function gbFetch(path: string, params: Record<string, string>): Promise<GBSearchResponse | null> {
  try {
    const res = await fetch(buildUrl(path, params), { next: { revalidate: 3600 } });
    if (!res.ok) {
      console.error(`[googlebooks] HTTP ${res.status} for ${path}`);
      return null;
    }
    return await res.json() as GBSearchResponse;
  } catch (err) {
    console.error(`[googlebooks] fetch error for ${path}:`, err);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function searchLNVolumes(
  query: string,
  limit = 20,
): Promise<{ volumes: GBVolume[]; total: number }> {
  const q = `${query} subject:"light novel"`;
  const data = await gbFetch('/volumes', {
    q,
    maxResults: String(Math.min(limit, 40)),
    printType: 'books',
    langRestrict: 'en',
    orderBy: 'relevance',
  });
  if (!data?.items) return { volumes: [], total: data?.totalItems ?? 0 };
  return {
    volumes: data.items.map(rawToGBVolume),
    total: data.totalItems,
  };
}

/**
 * Fetch all volumes of a specific LN series by exact title.
 * Sorted by newest first so latest volume appears at the top.
 */
export async function searchLNVolumesByTitle(
  title: string,
  limit = 20,
): Promise<{ volumes: GBVolume[]; total: number }> {
  const q = `intitle:"${title}"`;
  const data = await gbFetch('/volumes', {
    q,
    maxResults: String(Math.min(limit, 40)),
    printType: 'books',
    orderBy: 'newest',
  });
  if (!data?.items) return { volumes: [], total: data?.totalItems ?? 0 };
  return {
    volumes: data.items.map(rawToGBVolume),
    total: data.totalItems,
  };
}

/**
 * Fetch a specific volume by its Google Books ID.
 */
export async function getLNVolumeById(googleBooksId: string): Promise<GBVolume | null> {
  try {
    const res = await fetch(
      buildUrl(`/volumes/${googleBooksId}`, { projection: 'full' }),
      { next: { revalidate: 3600 } },
    );
    if (!res.ok) return null;
    const raw = await res.json() as GBRawVolume;
    return rawToGBVolume(raw);
  } catch (err) {
    console.error(`[googlebooks] getLNVolumeById(${googleBooksId}) failed:`, err);
    return null;
  }
}

/**
 * Fetch a volume by ISBN-13.
 * Most reliable lookup when you have a specific ISBN.
 */
export async function getLNVolumeByISBN(isbn: string): Promise<GBVolume | null> {
  const data = await gbFetch('/volumes', { q: `isbn:${isbn}` });
  const raw = data?.items?.[0];
  return raw ? rawToGBVolume(raw) : null;
}

/**
 * Search by publisher — useful for filtering to specific LN labels.
 */
export async function getLNVolumesByPublisher(
  publisher: string,
  limit = 20,
): Promise<{ volumes: GBVolume[]; total: number }> {
  const data = await gbFetch('/volumes', {
    q: `inpublisher:"${publisher}"`,
    maxResults: String(Math.min(limit, 40)),
    printType: 'books',
    orderBy: 'newest',
  });
  if (!data?.items) return { volumes: [], total: data?.totalItems ?? 0 };
  return {
    volumes: data.items.map(rawToGBVolume),
    total: data.totalItems,
  };
}

export const LN_PUBLISHERS = [
  'Yen Press',
  'Seven Seas Entertainment',
  'J-Novel Club',
  'Cross Infinite World',
  'One Peace Books',
  'Sol Press',
  'Vertical',
  'VIZ Media',
] as const;

export type LNPublisher = typeof LN_PUBLISHERS[number];

