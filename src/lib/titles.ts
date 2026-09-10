/**
 * Title domain types + safe parsers for the `titles` cache.
 *
 * The DB stores `genres` / `top_cast` / `keywords` / `providers` as `jsonb`
 * (typed as `Json` in database.types). These helpers narrow those blobs into
 * typed shapes without throwing on malformed data, and build TMDB image URLs.
 */
import type { Tables } from '@/lib/database.types';

export type Title = Tables<'titles'>;
export type MediaType = 'movie' | 'tv';
export type Verdict = 'loved' | 'liked' | 'meh';

/** A genre tag: `{ id, name }` (TMDB genre). */
export interface TitleGenre {
  id: number;
  name: string;
}

/** A top-billed cast member. */
export interface TitleCastMember {
  id: number;
  name: string;
  character: string | null;
  profile_path: string | null;
}

/** A TMDB keyword tag. */
export interface TitleKeyword {
  id: number;
  name: string;
}

/** A single streaming/rent/buy provider (TMDB watch providers, US region). */
export interface TitleProvider {
  provider_id: number;
  provider_name: string;
  logo_path: string | null;
  display_priority: number | null;
}

/** US watch-providers payload as returned by TMDB `watch/providers`. */
export interface TitleProviders {
  link: string | null;
  flatrate: TitleProvider[];
  rent: TitleProvider[];
  buy: TitleProvider[];
  free: TitleProvider[];
  ads: TitleProvider[];
}

// --- Safe parsers ------------------------------------------------------------

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function toNumberOrNull(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function toStringOrNull(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

/** Parse the `genres` jsonb into `TitleGenre[]`, dropping malformed entries. */
export function parseGenres(value: unknown): TitleGenre[] {
  return asArray(value).flatMap((entry) => {
    if (!isRecord(entry)) return [];
    const id = toNumberOrNull(entry.id);
    const name = toStringOrNull(entry.name);
    if (id === null || name === null) return [];
    return [{ id, name }];
  });
}

/** Parse the `top_cast` jsonb into `TitleCastMember[]`. */
export function parseCast(value: unknown): TitleCastMember[] {
  return asArray(value).flatMap((entry) => {
    if (!isRecord(entry)) return [];
    const id = toNumberOrNull(entry.id);
    const name = toStringOrNull(entry.name);
    if (id === null || name === null) return [];
    return [
      {
        id,
        name,
        character: toStringOrNull(entry.character),
        profile_path: toStringOrNull(entry.profile_path),
      },
    ];
  });
}

/** Parse the `keywords` jsonb into `TitleKeyword[]`. */
export function parseKeywords(value: unknown): TitleKeyword[] {
  return asArray(value).flatMap((entry) => {
    if (!isRecord(entry)) return [];
    const id = toNumberOrNull(entry.id);
    const name = toStringOrNull(entry.name);
    if (id === null || name === null) return [];
    return [{ id, name }];
  });
}

function parseProviderList(value: unknown): TitleProvider[] {
  return asArray(value).flatMap((entry) => {
    if (!isRecord(entry)) return [];
    const providerId = toNumberOrNull(entry.provider_id);
    const providerName = toStringOrNull(entry.provider_name);
    if (providerId === null || providerName === null) return [];
    return [
      {
        provider_id: providerId,
        provider_name: providerName,
        logo_path: toStringOrNull(entry.logo_path),
        display_priority: toNumberOrNull(entry.display_priority),
      },
    ];
  });
}

/** Parse the `providers` jsonb (US region object) into a typed shape. */
export function parseProviders(value: unknown): TitleProviders {
  const record = isRecord(value) ? value : {};
  return {
    link: toStringOrNull(record.link),
    flatrate: parseProviderList(record.flatrate),
    rent: parseProviderList(record.rent),
    buy: parseProviderList(record.buy),
    free: parseProviderList(record.free),
    ads: parseProviderList(record.ads),
  };
}

/** True when a title has been enriched (providers fetched via tmdb-title). */
export function isTitleEnriched(title: Pick<Title, 'providers_fetched_at'>): boolean {
  return Boolean(title.providers_fetched_at);
}

// --- TMDB image URLs ---------------------------------------------------------

const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p';

export type PosterSize = 'w92' | 'w154' | 'w185' | 'w342' | 'w500' | 'w780' | 'original';
export type BackdropSize = 'w300' | 'w780' | 'w1280' | 'original';
export type LogoSize = 'w45' | 'w92' | 'w154' | 'w185' | 'original';

/** Build a full TMDB image URL, or null when the path is missing. */
function tmdbImageUrl(path: string | null | undefined, size: string): string | null {
  if (!path) return null;
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `${TMDB_IMAGE_BASE}/${size}${normalized}`;
}

export function tmdbPosterUrl(path: string | null | undefined, size: PosterSize = 'w500'): string | null {
  return tmdbImageUrl(path, size);
}

export function tmdbBackdropUrl(path: string | null | undefined, size: BackdropSize = 'w780'): string | null {
  return tmdbImageUrl(path, size);
}

export function tmdbLogoUrl(path: string | null | undefined, size: LogoSize = 'w92'): string | null {
  return tmdbImageUrl(path, size);
}

// --- Display helpers ---------------------------------------------------------

/** `Genre · Genre` meta line (first `limit` genres). */
export function formatGenreMeta(genres: TitleGenre[], limit = 2): string {
  return genres
    .slice(0, limit)
    .map((g) => g.name)
    .join(' · ');
}

/**
 * Preferred display score for the gold rating badge: IMDb (0–10) when present,
 * else TMDB vote average. Returned rounded to one decimal, or null.
 */
export function displayRating(
  title: Pick<Title, 'imdb_rating' | 'tmdb_rating'>,
): number | null {
  const value = title.imdb_rating ?? title.tmdb_rating;
  if (value === null || value === undefined) return null;
  return Math.round(value * 10) / 10;
}

/** Release year (`YYYY`) parsed from `release_date`, or null. */
export function releaseYear(releaseDate: string | null | undefined): string | null {
  if (!releaseDate) return null;
  const year = releaseDate.slice(0, 4);
  return /^\d{4}$/.test(year) ? year : null;
}
