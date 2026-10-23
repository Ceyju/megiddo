import { ValidationError } from "./api";
import { isNovelSlug } from '../novel-slug';

const GENRES = new Set([
  "Action", "Adventure", "Comedy", "Drama", "Ecchi", "Fantasy", "Horror",
  "Mahou Shoujo", "Mecha", "Music", "Mystery", "Psychological", "Romance",
  "Sci-Fi", "Slice of Life", "Sports", "Supernatural", "Thriller",
]);

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const PROVIDER_ID_RE = /^[a-zA-Z0-9][a-zA-Z0-9:_-]{0,119}$/;

export function boundedInteger(value: string | null, name: string, fallback: number, min = 1, max = 9_999) {
  if (value === null || value === "") return fallback;
  if (!/^\d+$/.test(value)) throw new ValidationError(`${name} must be an integer`);
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < min || parsed > max) {
    throw new ValidationError(`${name} must be between ${min} and ${max}`);
  }
  return parsed;
}

export function searchQuery(value: string | null, { allowEmpty = false } = {}) {
  const query = value?.trim() ?? "";
  if (!query && !allowEmpty) throw new ValidationError("Search query is required");
  if (query.length > 100) throw new ValidationError("Search query must be 100 characters or fewer");
  return query;
}

export function genreList(value: string | null) {
  if (!value) return undefined;
  const genres = [...new Set(value.split(",").map((genre) => genre.trim()).filter(Boolean))];
  if (genres.length > 6) throw new ValidationError("Choose at most six genres");
  if (genres.some((genre) => !GENRES.has(genre))) throw new ValidationError("Unknown genre");
  return genres;
}

export function imdbId(value: string | null) {
  if (!value || !/^tt\d{7,10}$/.test(value)) throw new ValidationError("Invalid IMDb identifier");
  return value;
}

export function slug(value: string | null, name = "slug") {
  if (!isNovelSlug(value)) throw new ValidationError(`Invalid ${name}`);
  return value;
}

export function chapterSlug(value: string | null) {
  if (!value || !/^chapter-\d{1,4}(?:\.\d{1,3})?$/.test(value)) {
    throw new ValidationError("Invalid chapter identifier");
  }
  return value;
}

export function uuid(value: string | null, name = "identifier") {
  if (!value || !UUID_RE.test(value)) throw new ValidationError(`Invalid ${name}`);
  return value;
}

export function providerId(value: string | null, name = "provider identifier") {
  if (!value || !PROVIDER_ID_RE.test(value)) throw new ValidationError(`Invalid ${name}`);
  return value;
}

