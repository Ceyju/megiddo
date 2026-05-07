const BASE = 'https://mangahook-api.vercel.app';

export interface MHManga {
  id: string;
  title: string;
  image: string;
  chapter: string;
  view: string;
  description: string;
}

export interface MHChapterEntry {
  id: string;
  path: string;
  name: string;
  view: string;
  createdAt: string;
}

export interface MHMangaDetail {
  id: string;
  imageUrl: string;
  name: string;
  author: string;
  status: string;
  updated: string;
  view: string;
  genres: string[];
  description: string;
  chapterList: MHChapterEntry[];
}

export interface MHChapterDetail {
  title: string;
  currentChapter: string;
  chapterListIds: { id: string; name: string }[];
  images: { title: string; image: string }[];
}

export function isMHId(id: string): boolean {
  return !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

export async function getMHMangaList(type = 'topview', page = 1): Promise<MHManga[]> {
  try {
    const res = await fetch(`${BASE}/api/mangaList?type=${type}&page=${page}`, {
      next: { revalidate: 600 },
    });
    if (!res.ok) return [];
    const json = await res.json();
    return (json.mangaList ?? []) as MHManga[];
  } catch {
    return [];
  }
}

export async function searchMHManga(query: string, page = 1): Promise<{ list: MHManga[]; totalPages: number }> {
  try {
    const res = await fetch(
      `${BASE}/api/search/${encodeURIComponent(query)}?page=${page}`,
      { next: { revalidate: 300 } }
    );
    if (!res.ok) return { list: [], totalPages: 0 };
    const json = await res.json();
    return { list: json.mangaList ?? [], totalPages: json.metaData?.totalPages ?? 0 };
  } catch {
    return { list: [], totalPages: 0 };
  }
}

export async function getMHMangaDetail(id: string): Promise<MHMangaDetail | null> {
  try {
    const res = await fetch(`${BASE}/api/manga/${id}`, { next: { revalidate: 3600 } });
    if (!res.ok) return null;
    const json = await res.json();
    return { ...json, id } as MHMangaDetail;
  } catch {
    return null;
  }
}

export async function getMHChapterDetail(mangaId: string, chapterId: string): Promise<MHChapterDetail | null> {
  try {
    const res = await fetch(`${BASE}/api/manga/${mangaId}/${chapterId}`, {
      cache: 'no-store',
    });
    if (!res.ok) return null;
    return await res.json() as MHChapterDetail;
  } catch {
    return null;
  }
}