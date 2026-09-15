// Tonight — decider-rank edge function.
// Builds a group taste profile from selected members' ratings, scores eligible
// unwatched titles (on ≥1 present member's streaming service), and returns a
// ranked list for Top 3 + shuffle. Service-role for bulk read/enrich.
//
// Request body extras (optional):
//   exclude_ids?: string[]  — hard-skip (already in client buffer / shuffled past)
//   demote_ids?: string[]   — soft-decay score (* DEMOTE_FACTOR) so resurfacing is rare
//
// verify_jwt is enabled at the gateway; we re-derive the caller from their JWT.
import { createClient, type SupabaseClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const TMDB_BASE = 'https://api.themoviedb.org/3';
const OMDB_BASE = 'https://www.omdbapi.com/';
const TOP_CAST_LIMIT = 10;

// TMDB genre id → name (lightweight list/trending payloads only return `genre_ids`).
// Mirrors tmdb-popular / tmdb-search — never store String(id) as the name.
const MOVIE_GENRES: Record<number, string> = {
  28: 'Action',
  12: 'Adventure',
  16: 'Animation',
  35: 'Comedy',
  80: 'Crime',
  99: 'Documentary',
  18: 'Drama',
  10751: 'Family',
  14: 'Fantasy',
  36: 'History',
  27: 'Horror',
  10402: 'Music',
  9648: 'Mystery',
  10749: 'Romance',
  878: 'Science Fiction',
  10770: 'TV Movie',
  53: 'Thriller',
  10752: 'War',
  37: 'Western',
};

const TV_GENRES: Record<number, string> = {
  10759: 'Action & Adventure',
  16: 'Animation',
  35: 'Comedy',
  80: 'Crime',
  99: 'Documentary',
  18: 'Drama',
  10751: 'Family',
  10762: 'Kids',
  9648: 'Mystery',
  10763: 'News',
  10764: 'Reality',
  10765: 'Sci-Fi & Fantasy',
  10766: 'Soap',
  10767: 'Talk',
  10768: 'War & Politics',
  37: 'Western',
};

const W_GENRE = 0.4;
const W_ACTOR = 0.25;
const W_META = 0.15;
const W_QUALITY = 0.15;
const W_POP = 0.05;

const VERDICT_WEIGHT: Record<string, number> = {
  loved: 3,
  liked: 1,
  meh: -2,
};

const MIN_POOL = 12;
const RETURN_LIMIT_DEFAULT = 12;
const MAX_ENRICH = 15;
const MAX_POPULAR_INGEST = 20;
/** Soft-decay multiplier for titles the client already surfaced this session. */
const DEMOTE_FACTOR = 0.35;
/** Cap client-supplied UUID lists so a huge payload cannot blow ranking. */
const MAX_ID_LIST = 120;

const SERVICE_PROVIDER_KEYWORDS: Record<string, string[]> = {
  netflix: ['netflix'],
  max: ['max', 'hbo'],
  disney_plus: ['disney'],
  prime_video: ['amazon prime video', 'prime video'],
  hulu: ['hulu'],
  apple_tv_plus: ['apple tv+', 'apple tv plus'],
  peacock: ['peacock'],
  paramount_plus: ['paramount+', 'paramount plus'],
};

type MediaType = 'movie' | 'tv';
type MediaFilter = 'movie' | 'tv' | 'both';
type Verdict = 'loved' | 'liked' | 'meh';

interface GenreTag {
  id: number;
  name: string;
}

function mapGenres(mediaType: MediaType, genreIds: number[] | undefined): GenreTag[] {
  if (!genreIds || genreIds.length === 0) return [];
  const table = mediaType === 'movie' ? MOVIE_GENRES : TV_GENRES;
  return genreIds
    .filter((id) => table[id])
    .map((id) => ({ id, name: table[id] }));
}

interface CastTag {
  id: number;
  name: string;
}
interface KeywordTag {
  id: number;
  name: string;
}
interface ProviderEntry {
  provider_id?: number;
  provider_name?: string;
}
interface TitleProviders {
  flatrate?: ProviderEntry[];
  free?: ProviderEntry[];
  ads?: ProviderEntry[];
  rent?: ProviderEntry[];
  buy?: ProviderEntry[];
}

interface TitleRow {
  id: string;
  tmdb_id: number;
  media_type: MediaType;
  title: string;
  overview: string | null;
  poster_path: string | null;
  backdrop_path: string | null;
  release_date: string | null;
  genres: unknown;
  top_cast: unknown;
  director: string | null;
  keywords: unknown;
  tmdb_popularity: number | null;
  tmdb_rating: number | null;
  imdb_id: string | null;
  imdb_rating: number | null;
  rt_rating: number | null;
  providers: unknown;
  providers_fetched_at: string | null;
}

interface ProfileRow {
  id: string;
  handle: string | null;
  display_name: string | null;
  avatar_url: string | null;
}

interface RatingRow {
  user_id: string;
  title_id: string;
  verdict: Verdict;
  title: TitleRow | null;
}

interface ServiceCatalogRow {
  service: string;
  display_name: string;
  tmdb_provider_id: number;
}

interface AffinityMaps {
  genre: Map<number, number>;
  actor: Map<number, number>;
  keyword: Map<number, number>;
  director: Map<string, number>;
  genreNames: Map<number, string>;
  actorNames: Map<number, string>;
}

interface ScoreParts {
  genre: number;
  actor: number;
  meta: number;
  quality: number;
  pop: number;
  total: number;
  dominant: 'genre' | 'actor' | 'meta' | 'quality' | 'pop';
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function resolveGenreName(id: number, name: string | null, mediaType?: MediaType): string | null {
  if (name && !/^\d+$/.test(name)) return name;
  if (mediaType === 'tv' && TV_GENRES[id]) return TV_GENRES[id];
  return MOVIE_GENRES[id] ?? TV_GENRES[id] ?? null;
}

function parseGenres(value: unknown, mediaType?: MediaType): GenreTag[] {
  return asArray(value).flatMap((entry) => {
    if (!isRecord(entry)) return [];
    const id = typeof entry.id === 'number' ? entry.id : null;
    if (id === null) return [];
    const rawName = typeof entry.name === 'string' ? entry.name : null;
    const name = resolveGenreName(id, rawName, mediaType);
    if (!name) return [];
    return [{ id, name }];
  });
}

function parseCast(value: unknown): CastTag[] {
  return asArray(value).flatMap((entry) => {
    if (!isRecord(entry)) return [];
    const id = typeof entry.id === 'number' ? entry.id : null;
    const name = typeof entry.name === 'string' ? entry.name : null;
    if (id === null || !name) return [];
    return [{ id, name }];
  });
}

function parseKeywords(value: unknown): KeywordTag[] {
  return asArray(value).flatMap((entry) => {
    if (!isRecord(entry)) return [];
    const id = typeof entry.id === 'number' ? entry.id : null;
    const name = typeof entry.name === 'string' ? entry.name : null;
    if (id === null || !name) return [];
    return [{ id, name }];
  });
}

function parseProviders(value: unknown): TitleProviders {
  if (!isRecord(value)) return {};
  return value as TitleProviders;
}

function streamProviders(providers: TitleProviders): ProviderEntry[] {
  return [
    ...(providers.flatrate ?? []),
    ...(providers.free ?? []),
    ...(providers.ads ?? []),
  ];
}

function normalizeAffinity(map: Map<number | string, number>): void {
  let max = 0;
  for (const v of map.values()) max = Math.max(max, Math.abs(v));
  if (max <= 0) return;
  for (const [k, v] of map) map.set(k, v / max);
}

function buildAffinity(ratings: RatingRow[]): AffinityMaps {
  const genre = new Map<number, number>();
  const actor = new Map<number, number>();
  const keyword = new Map<number, number>();
  const director = new Map<string, number>();
  const genreNames = new Map<number, string>();
  const actorNames = new Map<number, string>();

  for (const row of ratings) {
    const weight = VERDICT_WEIGHT[row.verdict] ?? 0;
    if (!row.title || weight === 0) continue;
    const title = row.title;

    for (const g of parseGenres(title.genres)) {
      genre.set(g.id, (genre.get(g.id) ?? 0) + weight);
      genreNames.set(g.id, g.name);
    }
    for (const a of parseCast(title.top_cast).slice(0, TOP_CAST_LIMIT)) {
      actor.set(a.id, (actor.get(a.id) ?? 0) + weight);
      actorNames.set(a.id, a.name);
    }
    for (const k of parseKeywords(title.keywords)) {
      keyword.set(k.id, (keyword.get(k.id) ?? 0) + weight);
    }
    if (title.director) {
      const key = title.director.toLowerCase();
      director.set(key, (director.get(key) ?? 0) + weight);
    }
  }

  normalizeAffinity(genre as Map<number | string, number>);
  normalizeAffinity(actor as Map<number | string, number>);
  normalizeAffinity(keyword as Map<number | string, number>);
  normalizeAffinity(director as Map<number | string, number>);

  return { genre, actor, keyword, director, genreNames, actorNames };
}

function matchScore(ids: number[], affinity: Map<number, number>): number {
  if (ids.length === 0 || affinity.size === 0) return 0;
  let sum = 0;
  let hits = 0;
  for (const id of ids) {
    const v = affinity.get(id);
    if (v !== undefined) {
      sum += Math.max(0, v);
      hits += 1;
    }
  }
  if (hits === 0) return 0;
  return Math.min(1, sum / Math.max(1, Math.min(ids.length, 3)));
}

function qualityScore(imdb: number | null, rt: number | null, tmdb: number | null): number {
  const parts: number[] = [];
  if (typeof imdb === 'number') parts.push(imdb / 10);
  if (typeof rt === 'number') parts.push(rt / 100);
  if (typeof tmdb === 'number') parts.push(tmdb / 10);
  if (parts.length === 0) return 0.45;
  return parts.reduce((a, b) => a + b, 0) / parts.length;
}

function popularityScore(pop: number | null): number {
  if (typeof pop !== 'number' || pop <= 0) return 0.2;
  // Soft-cap popular TMDB scores (~0–200+).
  return Math.min(1, Math.log10(pop + 1) / 2.5);
}

function scoreTitle(title: TitleRow, affinity: AffinityMaps, coldStart: boolean): ScoreParts {
  const genres = parseGenres(title.genres);
  const cast = parseCast(title.top_cast);
  const keywords = parseKeywords(title.keywords);

  const genre = matchScore(
    genres.map((g) => g.id),
    affinity.genre,
  );
  const actor = matchScore(
    cast.map((c) => c.id),
    affinity.actor,
  );
  const keywordMatch = matchScore(
    keywords.map((k) => k.id),
    affinity.keyword,
  );
  let directorMatch = 0;
  if (title.director) {
    directorMatch = Math.max(0, affinity.director.get(title.director.toLowerCase()) ?? 0);
  }
  const meta = Math.min(1, keywordMatch * 0.7 + directorMatch * 0.3);
  const quality = qualityScore(title.imdb_rating, title.rt_rating, title.tmdb_rating);
  const pop = popularityScore(title.tmdb_popularity);

  let wGenre = W_GENRE;
  let wActor = W_ACTOR;
  let wMeta = W_META;
  let wQuality = W_QUALITY;
  let wPop = W_POP;

  if (coldStart) {
    // Lean on quality + popularity when affinity is sparse (plan.md cold start).
    wGenre = 0.15;
    wActor = 0.1;
    wMeta = 0.1;
    wQuality = 0.4;
    wPop = 0.25;
  }

  const parts = {
    genre,
    actor,
    meta,
    quality,
    pop,
    total: wGenre * genre + wActor * actor + wMeta * meta + wQuality * quality + wPop * pop,
    dominant: 'quality' as ScoreParts['dominant'],
  };

  const weighted = {
    genre: wGenre * genre,
    actor: wActor * actor,
    meta: wMeta * meta,
    quality: wQuality * quality,
    pop: wPop * pop,
  };
  let dominant: ScoreParts['dominant'] = 'quality';
  let best = -1;
  for (const key of Object.keys(weighted) as (keyof typeof weighted)[]) {
    if (weighted[key] > best) {
      best = weighted[key];
      dominant = key;
    }
  }
  parts.dominant = dominant;
  return parts;
}

function whyPicked(
  title: TitleRow,
  parts: ScoreParts,
  affinity: AffinityMaps,
  coldStart: boolean,
): string {
  if (coldStart && (parts.dominant === 'quality' || parts.dominant === 'pop')) {
    return 'A strong pick while your group taste is still warming up';
  }

  if (parts.dominant === 'genre') {
    const genres = parseGenres(title.genres);
    let bestName: string | null = null;
    let best = -1;
    for (const g of genres) {
      const v = affinity.genre.get(g.id) ?? -1;
      if (v > best) {
        best = v;
        bestName = g.name;
      }
    }
    if (bestName) return `Because you love ${bestName.toLowerCase()}`;
    return 'Because it matches genres you love';
  }

  if (parts.dominant === 'actor') {
    const cast = parseCast(title.top_cast);
    let bestName: string | null = null;
    let best = -1;
    for (const c of cast) {
      const v = affinity.actor.get(c.id) ?? -1;
      if (v > best) {
        best = v;
        bestName = c.name;
      }
    }
    if (bestName) return `Because you've loved titles with ${bestName}`;
    return "Because it features actors you've loved";
  }

  if (parts.dominant === 'meta') {
    if (title.director) return `Similar vibe — ${title.director} territory you tend to like`;
    return 'Similar vibe to what the group has loved';
  }

  if (parts.dominant === 'pop') return 'Popular right now and still fresh for your group';
  return 'Highly rated and on your services';
}

function providerNameMatchesService(providerName: string, service: string): boolean {
  const keywords = SERVICE_PROVIDER_KEYWORDS[service];
  if (!keywords) return false;
  const name = providerName.toLowerCase();
  return keywords.some((keyword) => name.includes(keyword));
}

function matchTitleServices(
  title: TitleRow,
  memberServices: Set<string>,
  catalogByProviderId: Map<number, ServiceCatalogRow>,
  catalogByService: Map<string, ServiceCatalogRow>,
): ServiceCatalogRow[] {
  const providers = streamProviders(parseProviders(title.providers));
  const matched = new Map<string, ServiceCatalogRow>();

  for (const p of providers) {
    const byId =
      typeof p.provider_id === 'number' ? catalogByProviderId.get(p.provider_id) : undefined;
    if (byId && memberServices.has(byId.service)) {
      matched.set(byId.service, byId);
      continue;
    }
    // Keyword fallback when provider id is missing or uncatalogued.
    const name = typeof p.provider_name === 'string' ? p.provider_name : '';
    if (!name) continue;
    for (const service of memberServices) {
      if (matched.has(service)) continue;
      if (providerNameMatchesService(name, service)) {
        const row = catalogByService.get(service);
        if (row) matched.set(service, row);
      }
    }
  }

  return [...matched.values()];
}

function titleHasGenre(title: TitleRow, genreId: number | null): boolean {
  if (genreId === null) return true;
  return parseGenres(title.genres).some((g) => g.id === genreId);
}

function tmdbAuth(): { headers: Record<string, string>; apiKey: string | null } {
  const readToken = Deno.env.get('TMDB_READ_ACCESS_TOKEN');
  const apiKey = Deno.env.get('TMDB_API_KEY') ?? null;
  const headers: Record<string, string> = { accept: 'application/json' };
  if (readToken) headers.Authorization = `Bearer ${readToken}`;
  return { headers, apiKey };
}

function nullableDate(value: string | undefined | null): string | null {
  return value && value.length > 0 ? value : null;
}

interface TmdbCredit {
  id: number;
  name: string;
  job?: string;
  character?: string;
  profile_path?: string | null;
}

interface TmdbDetails {
  id: number;
  title?: string;
  name?: string;
  overview?: string;
  poster_path?: string | null;
  backdrop_path?: string | null;
  release_date?: string;
  first_air_date?: string;
  vote_average?: number;
  popularity?: number;
  imdb_id?: string | null;
  genres?: { id: number; name: string }[];
  created_by?: { id: number; name: string }[];
  credits?: { cast?: TmdbCredit[]; crew?: TmdbCredit[] };
  keywords?: { keywords?: { id: number; name: string }[]; results?: { id: number; name: string }[] };
  external_ids?: { imdb_id?: string | null };
  'watch/providers'?: { results?: Record<string, unknown> };
}

interface OmdbResponse {
  Response?: string;
  imdbRating?: string;
  Ratings?: { Source: string; Value: string }[];
}

async function fetchOmdb(imdbId: string): Promise<{ imdb: number | null; rt: number | null }> {
  const omdbKey = Deno.env.get('OMDB_API_KEY');
  if (!omdbKey) return { imdb: null, rt: null };

  const url = new URL(OMDB_BASE);
  url.searchParams.set('i', imdbId);
  url.searchParams.set('apikey', omdbKey);

  try {
    const res = await fetch(url.toString());
    if (!res.ok) return { imdb: null, rt: null };
    const data = (await res.json()) as OmdbResponse;
    if (data.Response === 'False') return { imdb: null, rt: null };

    const imdbRating =
      data.imdbRating && data.imdbRating !== 'N/A' ? Number(data.imdbRating) : null;
    let rt: number | null = null;
    const rtRating = data.Ratings?.find((r) => r.Source === 'Rotten Tomatoes');
    if (rtRating) {
      const parsed = parseInt(rtRating.Value.replace('%', ''), 10);
      if (!Number.isNaN(parsed)) rt = parsed;
    }
    return {
      imdb: imdbRating !== null && !Number.isNaN(imdbRating) ? imdbRating : null,
      rt,
    };
  } catch {
    return { imdb: null, rt: null };
  }
}

async function enrichTitle(
  admin: SupabaseClient,
  tmdbId: number,
  mediaType: MediaType,
): Promise<TitleRow | null> {
  const { headers, apiKey } = tmdbAuth();
  if (!headers.Authorization && !apiKey) return null;

  const detailsUrl = new URL(`${TMDB_BASE}/${mediaType}/${tmdbId}`);
  detailsUrl.searchParams.set('language', 'en-US');
  detailsUrl.searchParams.set(
    'append_to_response',
    'credits,keywords,external_ids,watch/providers',
  );
  if (!headers.Authorization && apiKey) {
    detailsUrl.searchParams.set('api_key', apiKey);
  }

  const detailsRes = await fetch(detailsUrl.toString(), { headers });
  if (!detailsRes.ok) return null;
  const details = (await detailsRes.json()) as TmdbDetails;

  const genres = Array.isArray(details.genres)
    ? details.genres.map((g) => ({ id: g.id, name: g.name }))
    : [];
  const cast = details.credits?.cast ?? [];
  const topCast = cast.slice(0, TOP_CAST_LIMIT).map((c) => ({
    id: c.id,
    name: c.name,
    character: c.character ?? null,
    profile_path: c.profile_path ?? null,
  }));

  let director: string | null = null;
  if (mediaType === 'movie') {
    const dir = (details.credits?.crew ?? []).find((c) => c.job === 'Director');
    director = dir?.name ?? null;
  } else if (details.created_by && details.created_by.length > 0) {
    director = details.created_by.map((c) => c.name).join(', ');
  }

  const keywordsSource = details.keywords?.keywords ?? details.keywords?.results ?? [];
  const keywords = keywordsSource.map((k) => ({ id: k.id, name: k.name }));
  const providers = (details['watch/providers']?.results?.['US'] as unknown) ?? {};
  const imdbId = details.external_ids?.imdb_id ?? details.imdb_id ?? null;
  const { imdb, rt } = imdbId ? await fetchOmdb(imdbId) : { imdb: null, rt: null };

  const row = {
    tmdb_id: tmdbId,
    media_type: mediaType,
    title: (details.title ?? details.name ?? '').trim() || 'Untitled',
    overview: details.overview && details.overview.length > 0 ? details.overview : null,
    poster_path: details.poster_path ?? null,
    backdrop_path: details.backdrop_path ?? null,
    release_date: nullableDate(details.release_date ?? details.first_air_date),
    genres,
    top_cast: topCast,
    director,
    keywords,
    tmdb_popularity: typeof details.popularity === 'number' ? details.popularity : null,
    tmdb_rating: typeof details.vote_average === 'number' ? details.vote_average : null,
    imdb_id: imdbId,
    imdb_rating: imdb,
    rt_rating: rt,
    providers,
    providers_fetched_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await admin
    .from('titles')
    .upsert(row, { onConflict: 'tmdb_id,media_type' })
    .select('*')
    .single();

  if (error || !data) return null;
  return data as TitleRow;
}

async function ingestPopular(
  admin: SupabaseClient,
  mediaFilter: MediaFilter,
): Promise<TitleRow[]> {
  const { headers, apiKey } = tmdbAuth();
  if (!headers.Authorization && !apiKey) return [];

  const mediaTypes: MediaType[] =
    mediaFilter === 'movie' ? ['movie'] : mediaFilter === 'tv' ? ['tv'] : ['movie', 'tv'];

  const upserted: TitleRow[] = [];

  for (const mediaType of mediaTypes) {
    const url = new URL(`${TMDB_BASE}/trending/${mediaType}/week`);
    url.searchParams.set('language', 'en-US');
    if (!headers.Authorization && apiKey) url.searchParams.set('api_key', apiKey);

    const res = await fetch(url.toString(), { headers });
    if (!res.ok) continue;
    const payload = (await res.json()) as {
      results?: {
        id: number;
        title?: string;
        name?: string;
        poster_path?: string | null;
        backdrop_path?: string | null;
        release_date?: string;
        first_air_date?: string;
        vote_average?: number;
        popularity?: number;
        genre_ids?: number[];
        overview?: string;
      }[];
    };

    for (const item of (payload.results ?? []).slice(0, MAX_POPULAR_INGEST)) {
      const lightweight = {
        tmdb_id: item.id,
        media_type: mediaType,
        title: (item.title ?? item.name ?? '').trim() || 'Untitled',
        overview: item.overview && item.overview.length > 0 ? item.overview : null,
        poster_path: item.poster_path ?? null,
        backdrop_path: item.backdrop_path ?? null,
        release_date: nullableDate(item.release_date ?? item.first_air_date),
        genres: mapGenres(mediaType, item.genre_ids),
        top_cast: [],
        director: null,
        keywords: [],
        tmdb_popularity: typeof item.popularity === 'number' ? item.popularity : null,
        tmdb_rating: typeof item.vote_average === 'number' ? item.vote_average : null,
        updated_at: new Date().toISOString(),
      };

      const { data } = await admin
        .from('titles')
        .upsert(lightweight, { onConflict: 'tmdb_id,media_type' })
        .select('*')
        .single();
      if (data) upserted.push(data as TitleRow);
    }
  }

  return upserted;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return json({ error: 'method_not_allowed' }, 405);
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return json({ error: 'missing_authorization' }, 401);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: userData, error: userError } = await userClient.auth.getUser();
  if (userError || !userData?.user) {
    return json({ error: 'unauthorized' }, 401);
  }
  const callerId = userData.user.id;

  let body: {
    member_ids?: unknown;
    media?: unknown;
    genre_id?: unknown;
    offset?: unknown;
    limit?: unknown;
    exclude_ids?: unknown;
    demote_ids?: unknown;
  };
  try {
    body = await req.json();
  } catch {
    return json({ error: 'invalid_json' }, 400);
  }

  const media: MediaFilter =
    body.media === 'movie' || body.media === 'tv' || body.media === 'both'
      ? body.media
      : 'both';
  const genreId =
    typeof body.genre_id === 'number' && Number.isFinite(body.genre_id)
      ? Math.floor(body.genre_id)
      : null;
  const offset =
    typeof body.offset === 'number' && body.offset > 0 ? Math.floor(body.offset) : 0;
  const limit =
    typeof body.limit === 'number' && body.limit > 0
      ? Math.min(30, Math.floor(body.limit))
      : RETURN_LIMIT_DEFAULT;

  /** Hard-exclude: already in the client's buffer / shuffled past this session. */
  const excludeIds = new Set(
    (Array.isArray(body.exclude_ids) ? body.exclude_ids : [])
      .filter((id): id is string => typeof id === 'string' && id.length > 0)
      .slice(0, MAX_ID_LIST),
  );
  /** Soft-decay: previously shown; still eligible but ranked lower. */
  const demoteIds = new Set(
    (Array.isArray(body.demote_ids) ? body.demote_ids : [])
      .filter((id): id is string => typeof id === 'string' && id.length > 0)
      .slice(0, MAX_ID_LIST),
  );

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Resolve members: always include self; others must be followed by caller.
  const requested = Array.isArray(body.member_ids)
    ? body.member_ids.filter((id): id is string => typeof id === 'string' && id.length > 0)
    : [];
  const memberSet = new Set<string>([callerId]);
  const others = [...new Set(requested.filter((id) => id !== callerId))];

  if (others.length > 0) {
    const { data: follows, error: followError } = await admin
      .from('follows')
      .select('following_id')
      .eq('follower_id', callerId)
      .in('following_id', others);
    if (followError) {
      return json({ error: 'follows_lookup_failed', detail: followError.message }, 500);
    }
    const allowed = new Set((follows ?? []).map((f) => f.following_id as string));
    for (const id of others) {
      if (!allowed.has(id)) {
        return json({ error: 'invalid_member', detail: id }, 403);
      }
      memberSet.add(id);
    }
  }
  const memberIds = [...memberSet];

  const { data: profiles, error: profileError } = await admin
    .from('profiles')
    .select('id, handle, display_name, avatar_url')
    .in('id', memberIds);
  if (profileError) {
    return json({ error: 'profiles_lookup_failed', detail: profileError.message }, 500);
  }
  const profileById = new Map<string, ProfileRow>(
    (profiles ?? []).map((p) => [p.id, p as ProfileRow]),
  );

  // Ratings for taste profile + watched set.
  const { data: ratingRows, error: ratingError } = await admin
    .from('ratings')
    .select(
      'user_id, title_id, verdict, title:titles(id, tmdb_id, media_type, title, overview, poster_path, backdrop_path, release_date, genres, top_cast, director, keywords, tmdb_popularity, tmdb_rating, imdb_id, imdb_rating, rt_rating, providers, providers_fetched_at)',
    )
    .in('user_id', memberIds);
  if (ratingError) {
    return json({ error: 'ratings_lookup_failed', detail: ratingError.message }, 500);
  }

  const ratings = (ratingRows ?? []) as unknown as RatingRow[];
  const watched = new Set(ratings.map((r) => r.title_id));
  const affinity = buildAffinity(ratings);
  const coldStart =
    ratings.filter((r) => r.verdict === 'loved' || r.verdict === 'liked').length < 3;

  // Union of selected members' streaming services.
  const { data: serviceRows, error: serviceError } = await admin
    .from('user_services')
    .select('user_id, service')
    .in('user_id', memberIds);
  if (serviceError) {
    return json({ error: 'services_lookup_failed', detail: serviceError.message }, 500);
  }
  const memberServices = new Set((serviceRows ?? []).map((r) => r.service as string));

  const { data: catalogRows, error: catalogError } = await admin
    .from('service_catalog')
    .select('service, display_name, tmdb_provider_id');
  if (catalogError) {
    return json({ error: 'catalog_lookup_failed', detail: catalogError.message }, 500);
  }
  const catalog = (catalogRows ?? []) as ServiceCatalogRow[];
  const catalogByProviderId = new Map(catalog.map((c) => [c.tmdb_provider_id, c]));
  const catalogByService = new Map(catalog.map((c) => [c.service, c]));

  if (memberServices.size === 0) {
    return json({
      picks: [],
      total: 0,
      offset,
      cold_start: coldStart,
      empty_reason: 'no_services',
      note: 'Add streaming services so we can match availability.',
    });
  }

  // Prefer already-enriched cached titles.
  let titleQuery = admin
    .from('titles')
    .select(
      'id, tmdb_id, media_type, title, overview, poster_path, backdrop_path, release_date, genres, top_cast, director, keywords, tmdb_popularity, tmdb_rating, imdb_id, imdb_rating, rt_rating, providers, providers_fetched_at',
    )
    .not('providers_fetched_at', 'is', null)
    .order('tmdb_popularity', { ascending: false })
    .limit(200);

  if (media === 'movie' || media === 'tv') {
    titleQuery = titleQuery.eq('media_type', media);
  }

  const { data: enrichedTitles, error: titlesError } = await titleQuery;
  if (titlesError) {
    return json({ error: 'titles_lookup_failed', detail: titlesError.message }, 500);
  }

  let candidates = ((enrichedTitles ?? []) as TitleRow[]).filter(
    (t) => !watched.has(t.id) && titleHasGenre(t, genreId),
  );

  let notes: string[] = [];
  const { headers: tmdbHeaders, apiKey } = tmdbAuth();
  const tmdbConfigured = Boolean(tmdbHeaders.Authorization || apiKey);

  // Thin pool → enrich lightweight cache rows, then popular feed if needed.
  if (candidates.length < MIN_POOL) {
    let lightQuery = admin
      .from('titles')
      .select(
        'id, tmdb_id, media_type, title, overview, poster_path, backdrop_path, release_date, genres, top_cast, director, keywords, tmdb_popularity, tmdb_rating, imdb_id, imdb_rating, rt_rating, providers, providers_fetched_at',
      )
      .is('providers_fetched_at', null)
      .order('tmdb_popularity', { ascending: false })
      .limit(40);
    if (media === 'movie' || media === 'tv') {
      lightQuery = lightQuery.eq('media_type', media);
    }
    const { data: lightTitles } = await lightQuery;
    const toEnrich = ((lightTitles ?? []) as TitleRow[])
      .filter((t) => !watched.has(t.id) && titleHasGenre(t, genreId))
      .slice(0, MAX_ENRICH);

    if (toEnrich.length > 0 && tmdbConfigured) {
      notes.push(`batch_enriched_${toEnrich.length}`);
      for (const light of toEnrich) {
        const enriched = await enrichTitle(admin, light.tmdb_id, light.media_type);
        if (enriched && !watched.has(enriched.id) && titleHasGenre(enriched, genreId)) {
          candidates.push(enriched);
        }
      }
    } else if (toEnrich.length > 0 && !tmdbConfigured) {
      notes.push('enrich_skipped_tmdb_not_configured');
    }

    if (candidates.length < MIN_POOL && tmdbConfigured) {
      notes.push('popular_ingest');
      const ingested = await ingestPopular(admin, media);
      const enrichTargets = ingested
        .filter((t) => !watched.has(t.id) && !t.providers_fetched_at)
        .slice(0, MAX_ENRICH);
      for (const light of enrichTargets) {
        const enriched = await enrichTitle(admin, light.tmdb_id, light.media_type);
        if (enriched && !watched.has(enriched.id) && titleHasGenre(enriched, genreId)) {
          candidates.push(enriched);
        }
      }
    } else if (candidates.length < MIN_POOL && !tmdbConfigured) {
      notes.push('cold_start_quality_pop_only');
    }
  }

  // Dedupe by id.
  const byId = new Map<string, TitleRow>();
  for (const t of candidates) byId.set(t.id, t);
  candidates = [...byId.values()];

  // Eligibility: on ≥1 present member's services; skip session-excluded titles.
  const eligible: { title: TitleRow; services: ServiceCatalogRow[]; parts: ScoreParts }[] = [];
  for (const title of candidates) {
    if (excludeIds.has(title.id)) continue;
    const services = matchTitleServices(
      title,
      memberServices,
      catalogByProviderId,
      catalogByService,
    );
    if (services.length === 0) continue;
    if (media !== 'both' && title.media_type !== media) continue;
    if (!titleHasGenre(title, genreId)) continue;
    const parts = scoreTitle(title, affinity, coldStart);
    // Soft-decay: keep eligible but push down the ranking for previously shown titles.
    if (demoteIds.has(title.id)) {
      parts.total *= DEMOTE_FACTOR;
    }
    eligible.push({ title, services, parts });
  }

  eligible.sort((a, b) => b.parts.total - a.parts.total);

  // Ambient friend ratings (followed users, for piles on results).
  const { data: followingRows } = await admin
    .from('follows')
    .select('following_id')
    .eq('follower_id', callerId);
  const followingIds = (followingRows ?? []).map((r) => r.following_id as string);

  const friendRatingsByTitle = new Map<
    string,
    { user_id: string; verdict: Verdict; profile: ProfileRow }[]
  >();

  if (followingIds.length > 0 && eligible.length > 0) {
    const pickIds = eligible.map((e) => e.title.id);
    const { data: friendRatings } = await admin
      .from('ratings')
      .select(
        'user_id, title_id, verdict, profile:profiles!ratings_user_id_fkey(id, handle, display_name, avatar_url)',
      )
      .in('user_id', followingIds)
      .in('title_id', pickIds);

    for (const row of friendRatings ?? []) {
      const profile = (row as { profile?: ProfileRow }).profile;
      if (!profile) continue;
      const list = friendRatingsByTitle.get(row.title_id as string) ?? [];
      list.push({
        user_id: row.user_id as string,
        verdict: row.verdict as Verdict,
        profile,
      });
      friendRatingsByTitle.set(row.title_id as string, list);
    }
  }

  const sliced = eligible.slice(offset, offset + limit);
  const picks = sliced.map(({ title, services, parts }) => {
    const friendRows = friendRatingsByTitle.get(title.id) ?? [];
    return {
      id: title.id,
      title: title.title,
      media_type: title.media_type,
      poster_path: title.poster_path,
      backdrop_path: title.backdrop_path,
      release_date: title.release_date,
      genres: parseGenres(title.genres, title.media_type),
      why_picked: whyPicked(title, parts, affinity, coldStart),
      score: Math.round(parts.total * 1000) / 1000,
      imdb_rating: title.imdb_rating,
      rt_rating: title.rt_rating,
      tmdb_rating: title.tmdb_rating,
      services: services.map((s) => ({
        service: s.service,
        display_name: s.display_name,
      })),
      friend_ratings: friendRows.map((r) => ({
        user_id: r.user_id,
        verdict: r.verdict,
        handle: r.profile.handle,
        display_name: r.profile.display_name,
        avatar_url: r.profile.avatar_url,
      })),
      member_verdicts: memberIds.flatMap((id) => {
        // Selected members have not rated eligible titles (unwatched filter).
        // Keep the field for API stability / future use.
        void id;
        return [];
      }),
    };
  });

  return json({
    picks,
    total: eligible.length,
    offset,
    limit,
    cold_start: coldStart,
    members: memberIds.map((id) => profileById.get(id) ?? { id, handle: null, display_name: null, avatar_url: null }),
    empty_reason: picks.length === 0 ? 'no_eligible' : null,
    note:
      picks.length === 0
        ? 'No eligible unwatched titles on your services. Rate more, add services, or invite friends.'
        : notes.length > 0
          ? notes.join('; ')
          : null,
  });
});
