// Tonight — tmdb-title edge function.
// Ensures/enriches ONE title: fetches TMDB details + credits + keywords +
// US watch providers, plus OMDb (IMDb / Rotten Tomatoes) by imdb_id, then
// upserts the full `titles` cache row with the service role and returns it.
//
// verify_jwt is enabled at the gateway; we re-derive the caller from their JWT
// (mirrors the delete-account function).
import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const TMDB_BASE = 'https://api.themoviedb.org/3';
const OMDB_BASE = 'https://www.omdbapi.com/';
const TOP_CAST_LIMIT = 10;

type MediaType = 'movie' | 'tv';

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function nullableDate(value: string | undefined | null): string | null {
  return value && value.length > 0 ? value : null;
}

function tmdbAuth(): { headers: Record<string, string>; apiKey: string | null } {
  const readToken = Deno.env.get('TMDB_READ_ACCESS_TOKEN');
  const apiKey = Deno.env.get('TMDB_API_KEY') ?? null;
  const headers: Record<string, string> = { accept: 'application/json' };
  if (readToken) headers.Authorization = `Bearer ${readToken}`;
  return { headers, apiKey };
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

    const imdbRating = data.imdbRating && data.imdbRating !== 'N/A' ? Number(data.imdbRating) : null;
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

  let body: { title_id?: unknown; tmdb_id?: unknown; media_type?: unknown };
  try {
    body = await req.json();
  } catch {
    return json({ error: 'invalid_json' }, 400);
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Resolve the target title to a (tmdb_id, media_type) pair.
  let tmdbId: number | null =
    typeof body.tmdb_id === 'number' ? Math.floor(body.tmdb_id) : null;
  let mediaType: MediaType | null =
    body.media_type === 'movie' || body.media_type === 'tv' ? body.media_type : null;
  const titleId = typeof body.title_id === 'string' ? body.title_id : null;

  if ((!tmdbId || !mediaType) && titleId) {
    const { data: existing, error: lookupError } = await adminClient
      .from('titles')
      .select('tmdb_id, media_type')
      .eq('id', titleId)
      .maybeSingle();
    if (lookupError) {
      return json({ error: 'lookup_failed', detail: lookupError.message }, 500);
    }
    if (!existing) {
      return json({ error: 'title_not_found' }, 404);
    }
    tmdbId = existing.tmdb_id;
    mediaType = existing.media_type as MediaType;
  }

  if (!tmdbId || !mediaType) {
    return json({ error: 'missing_identifier' }, 400);
  }

  const { headers, apiKey } = tmdbAuth();
  if (!headers.Authorization && !apiKey) {
    return json({ error: 'tmdb_not_configured' }, 500);
  }

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
  if (!detailsRes.ok) {
    const detail = await detailsRes.text();
    return json({ error: 'tmdb_error', status: detailsRes.status, detail }, 502);
  }
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

  const { data: upserted, error: upsertError } = await adminClient
    .from('titles')
    .upsert(row, { onConflict: 'tmdb_id,media_type' })
    .select('*')
    .single();

  if (upsertError) {
    return json({ error: 'upsert_failed', detail: upsertError.message }, 500);
  }

  return json({ title: upserted });
});
