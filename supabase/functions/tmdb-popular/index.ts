// Tonight — tmdb-popular edge function.
// Fetches TMDB trending (movie + tv) for Home + onboarding taste-seed, upserts
// lightweight `titles` cache rows with the service role (clients have select-only
// RLS on `titles`), and returns the local UUID + poster fields — mirroring the
// `tmdb-search` result shape so the client can reuse the same rendering path.
//
// verify_jwt is enabled at the gateway; we re-derive the caller from their JWT
// (mirrors delete-account / tmdb-search) so only authenticated users can call it.
import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const TMDB_BASE = 'https://api.themoviedb.org/3';

// TMDB genre id → name maps (stable, small — lets us store genre names from the
// lightweight trending payload, which only returns `genre_ids`).
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

type MediaType = 'movie' | 'tv';
type MediaFilter = 'movie' | 'tv' | 'all';

interface TmdbTrendingResult {
  id: number;
  media_type?: string;
  title?: string;
  name?: string;
  overview?: string;
  poster_path?: string | null;
  backdrop_path?: string | null;
  release_date?: string;
  first_air_date?: string;
  vote_average?: number;
  popularity?: number;
  genre_ids?: number[];
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

/** Normalize a possibly-empty TMDB date string to a real date or null. */
function nullableDate(value: string | undefined): string | null {
  return value && value.length > 0 ? value : null;
}

function mapGenres(mediaType: MediaType, genreIds: number[] | undefined) {
  if (!genreIds || genreIds.length === 0) return [];
  const table = mediaType === 'movie' ? MOVIE_GENRES : TV_GENRES;
  return genreIds
    .filter((id) => table[id])
    .map((id) => ({ id, name: table[id] }));
}

/** Build TMDB auth: prefer the v4 read access token (Bearer), else v3 api_key. */
function tmdbAuth(): { headers: Record<string, string>; apiKey: string | null } {
  const readToken = Deno.env.get('TMDB_READ_ACCESS_TOKEN');
  const apiKey = Deno.env.get('TMDB_API_KEY') ?? null;
  const headers: Record<string, string> = { accept: 'application/json' };
  if (readToken) headers.Authorization = `Bearer ${readToken}`;
  return { headers, apiKey };
}

/** Fetch one TMDB trending endpoint, tagging each item with `media_type`. */
async function fetchTrending(
  window: 'movie' | 'tv' | 'all',
  page: number,
  headers: Record<string, string>,
  apiKey: string | null,
): Promise<TmdbTrendingResult[]> {
  const url = new URL(`${TMDB_BASE}/trending/${window}/week`);
  url.searchParams.set('page', String(page));
  url.searchParams.set('language', 'en-US');
  if (!headers.Authorization && apiKey) {
    url.searchParams.set('api_key', apiKey);
  }

  const res = await fetch(url.toString(), { headers });
  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`tmdb_error:${res.status}:${detail}`);
  }
  const data = (await res.json()) as { results?: TmdbTrendingResult[] };
  const results = Array.isArray(data.results) ? data.results : [];
  // `/trending/{movie|tv}/week` items omit media_type; inject it. `/trending/all`
  // items already carry it.
  if (window !== 'all') {
    return results.map((r) => ({ ...r, media_type: window }));
  }
  return results;
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

  // Identify the caller from their JWT (authn only — writes use the service role).
  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: userData, error: userError } = await userClient.auth.getUser();
  if (userError || !userData?.user) {
    return json({ error: 'unauthorized' }, 401);
  }

  let body: { media_type?: unknown; page?: unknown };
  try {
    body = await req.json();
  } catch {
    // Body is optional for this function; default to trending "all".
    body = {};
  }

  const mediaType: MediaFilter =
    body.media_type === 'movie' || body.media_type === 'tv' ? body.media_type : 'all';
  const page = typeof body.page === 'number' && body.page > 0 ? Math.floor(body.page) : 1;

  const { headers, apiKey } = tmdbAuth();
  if (!headers.Authorization && !apiKey) {
    return json({ error: 'tmdb_not_configured' }, 500);
  }

  let rawResults: TmdbTrendingResult[];
  try {
    if (mediaType === 'all') {
      // Interleave movie + tv trending so a mixed feed isn't dominated by one.
      const [movies, shows] = await Promise.all([
        fetchTrending('movie', page, headers, apiKey),
        fetchTrending('tv', page, headers, apiKey),
      ]);
      const interleaved: TmdbTrendingResult[] = [];
      const max = Math.max(movies.length, shows.length);
      for (let i = 0; i < max; i++) {
        if (movies[i]) interleaved.push(movies[i]);
        if (shows[i]) interleaved.push(shows[i]);
      }
      rawResults = interleaved;
    } else {
      rawResults = await fetchTrending(mediaType, page, headers, apiKey);
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'tmdb_error';
    return json({ error: 'tmdb_error', detail: message }, 502);
  }

  // Keep only movie/tv results with a title.
  const filtered = rawResults.filter(
    (r): r is TmdbTrendingResult & { media_type: MediaType } =>
      (r.media_type === 'movie' || r.media_type === 'tv') && Boolean(r.title || r.name),
  );

  if (filtered.length === 0) {
    return json({ results: [] });
  }

  // De-dupe by (tmdb_id, media_type) so the upsert doesn't fight itself.
  const rowByKey = new Map<
    string,
    {
      tmdb_id: number;
      media_type: MediaType;
      title: string;
      overview: string | null;
      poster_path: string | null;
      backdrop_path: string | null;
      release_date: string | null;
      tmdb_rating: number | null;
      tmdb_popularity: number | null;
      genres: { id: number; name: string }[];
    }
  >();
  const order: string[] = [];
  for (const r of filtered) {
    const key = `${r.media_type}:${r.id}`;
    if (rowByKey.has(key)) continue;
    order.push(key);
    rowByKey.set(key, {
      tmdb_id: r.id,
      media_type: r.media_type,
      title: (r.title ?? r.name)!,
      overview: r.overview && r.overview.length > 0 ? r.overview : null,
      poster_path: r.poster_path ?? null,
      backdrop_path: r.backdrop_path ?? null,
      release_date: nullableDate(r.release_date ?? r.first_air_date),
      tmdb_rating: typeof r.vote_average === 'number' ? r.vote_average : null,
      tmdb_popularity: typeof r.popularity === 'number' ? r.popularity : null,
      genres: mapGenres(r.media_type, r.genre_ids),
    });
  }
  const rows = order.map((key) => rowByKey.get(key)!);

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: upserted, error: upsertError } = await adminClient
    .from('titles')
    .upsert(rows, { onConflict: 'tmdb_id,media_type' })
    .select(
      'id, tmdb_id, media_type, title, poster_path, backdrop_path, release_date, tmdb_rating, overview',
    );

  if (upsertError) {
    return json({ error: 'upsert_failed', detail: upsertError.message }, 500);
  }

  // Return in TMDB trending order.
  const byKey = new Map(
    (upserted ?? []).map((row) => [`${row.media_type}:${row.tmdb_id}`, row]),
  );
  const results = order.map((key) => byKey.get(key)).filter(Boolean);

  return json({ results });
});
