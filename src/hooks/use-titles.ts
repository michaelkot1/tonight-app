import { useEffect, useState } from 'react';
import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseQueryResult,
} from '@tanstack/react-query';

import type { BrowseCategory, CategoryFeed } from '@/lib/categories';
import type { Json, Tables } from '@/lib/database.types';
import { invokeEdgeFunction } from '@/lib/edge';
import { getSupabase } from '@/lib/supabase';
import { isTitleEnriched, type MediaType, type Title, type Verdict } from '@/lib/titles';
import { useAuth } from '@/providers/auth-provider';

/** Lightweight result row returned by the `tmdb-search` Edge Function. */
export interface TitleSearchResult {
  id: string;
  tmdb_id: number;
  media_type: MediaType;
  title: string;
  poster_path: string | null;
  backdrop_path: string | null;
  release_date: string | null;
  tmdb_rating: number | null;
  overview: string | null;
  /** Present on `tmdb-popular` category feeds (optional for other consumers). */
  genres?: Json;
  /** Present on `tmdb-popular` category feeds (optional for other consumers). */
  runtime?: number | null;
}

interface TmdbSearchResponse {
  results: TitleSearchResult[];
}

interface TmdbPopularResponse {
  results: TitleSearchResult[];
}

interface TmdbTitleResponse {
  title: Title;
}

/** Media filter accepted by the `tmdb-popular` Edge Function. */
export type PopularMediaFilter = 'movie' | 'tv' | 'all';

const MIN_QUERY_LENGTH = 2;
const SEARCH_DEBOUNCE_MS = 350;

export const titleQueryKey = (titleId: string | undefined) => ['title', titleId] as const;
export const titleSearchQueryKey = (query: string) => ['title-search', query] as const;
export const popularTitlesQueryKey = (mediaType: PopularMediaFilter) =>
  ['popular-titles', mediaType] as const;
export const myRatingsQueryKey = (userId: string | undefined) => ['my-ratings', userId] as const;
export const mySavesQueryKey = (userId: string | undefined) => ['my-saves', userId] as const;

/** Debounce a rapidly-changing value (search box keystrokes). */
export function useDebouncedValue<T>(value: T, delay = SEARCH_DEBOUNCE_MS): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

/**
 * Debounced TMDB multi-search via the `tmdb-search` Edge Function. Upserts
 * lightweight cache rows server-side and returns local UUID + poster fields.
 */
export function useTitleSearch(query: string): UseQueryResult<TitleSearchResult[]> {
  const debouncedQuery = useDebouncedValue(query.trim());
  return useQuery({
    queryKey: titleSearchQueryKey(debouncedQuery),
    enabled: debouncedQuery.length >= MIN_QUERY_LENGTH,
    staleTime: 1000 * 60 * 5,
    queryFn: async () => {
      const response = await invokeEdgeFunction<TmdbSearchResponse, { query: string }>(
        'tmdb-search',
        { query: debouncedQuery },
      );
      return response.results ?? [];
    },
  });
}

/**
 * TMDB trending titles via the `tmdb-popular` Edge Function. Upserts lightweight
 * cache rows server-side and returns local UUID + poster fields — the same shape
 * as `useTitleSearch`, so results can render through the same poster components.
 * Powers Home rails / interim Tonight's pick and the onboarding taste-seed.
 */
export function usePopularTitles(
  mediaType: PopularMediaFilter = 'all',
): UseQueryResult<TitleSearchResult[]> {
  return useQuery({
    queryKey: popularTitlesQueryKey(mediaType),
    staleTime: 1000 * 60 * 30,
    queryFn: async () => {
      const response = await invokeEdgeFunction<
        TmdbPopularResponse,
        { media_type: PopularMediaFilter }
      >('tmdb-popular', { media_type: mediaType });
      return response.results ?? [];
    },
  });
}

export const categoryFeedQueryKey = (slug: string) => ['category-feed', slug] as const;

/**
 * Fallback for `useCategoryFeed`: read straight from the cached `titles` table
 * (RLS is select-only, so this is allowed) when the Edge Function is
 * unavailable or returns nothing. Ordered by TMDB popularity.
 */
async function fetchCachedCategoryTitles(
  category: BrowseCategory,
): Promise<TitleSearchResult[]> {
  const supabase = getSupabase();
  if (!supabase) return [];

  let query = supabase
    .from('titles')
    .select(
      'id, tmdb_id, media_type, title, poster_path, backdrop_path, release_date, tmdb_rating, overview, genres, runtime',
    );

  if (category.media && category.media !== 'all') {
    query = query.eq('media_type', category.media);
  }
  if (category.genreId != null) {
    query = query.contains('genres', [{ id: category.genreId }]);
  }

  const { data, error } = await query
    .order('tmdb_popularity', { ascending: false, nullsFirst: false })
    .limit(24);
  if (error) throw error;

  return (data ?? []).map((row) => ({
    id: row.id,
    tmdb_id: row.tmdb_id,
    media_type: row.media_type as MediaType,
    title: row.title,
    poster_path: row.poster_path,
    backdrop_path: row.backdrop_path,
    release_date: row.release_date,
    tmdb_rating: row.tmdb_rating,
    overview: row.overview,
    genres: row.genres,
    runtime: row.runtime,
  }));
}

/**
 * Titles for a Browse category (powers the Story viewer). Tries the
 * `tmdb-popular` Edge Function first; if it throws (e.g. `tmdb_not_configured`)
 * or returns no results, falls back to the cached `titles` table.
 */
export function useCategoryFeed(
  category: BrowseCategory,
): UseQueryResult<TitleSearchResult[]> {
  return useQuery({
    queryKey: categoryFeedQueryKey(category.slug),
    staleTime: 1000 * 60 * 30,
    queryFn: async (): Promise<TitleSearchResult[]> => {
      try {
        const response = await invokeEdgeFunction<
          TmdbPopularResponse,
          { feed: CategoryFeed; media_type: 'movie' | 'tv' | 'all'; genre_id: number | null }
        >('tmdb-popular', {
          feed: category.feed,
          media_type: category.media ?? 'all',
          genre_id: category.genreId ?? null,
        });
        if (response.results && response.results.length > 0) {
          return response.results;
        }
      } catch {
        // Edge unavailable (e.g. tmdb_not_configured) — fall through to cache.
      }
      return fetchCachedCategoryTitles(category);
    },
  });
}

async function fetchTitleRow(titleId: string): Promise<Title | null> {
  const supabase = getSupabase();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('titles')
    .select('*')
    .eq('id', titleId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

/**
 * Read one title. Prefers the cached `titles` row; if it is missing or not yet
 * enriched (no providers fetched), calls `tmdb-title` to ensure/enrich it.
 */
export function useTitle(titleId: string | undefined): UseQueryResult<Title | null> {
  return useQuery({
    queryKey: titleQueryKey(titleId),
    enabled: !!titleId,
    queryFn: async () => {
      const id = titleId!;
      const cached = await fetchTitleRow(id);
      if (cached && isTitleEnriched(cached)) return cached;

      const response = await invokeEdgeFunction<TmdbTitleResponse, { title_id: string }>(
        'tmdb-title',
        { title_id: id },
      );
      return response.title;
    },
  });
}

/** A rating joined with the poster fields needed to render it in a list. */
export interface MyRating {
  id: string;
  verdict: Verdict;
  created_at: string;
  updated_at: string;
  title: Pick<
    Tables<'titles'>,
    | 'id'
    | 'title'
    | 'media_type'
    | 'poster_path'
    | 'genres'
    | 'tmdb_rating'
    | 'imdb_rating'
    | 'release_date'
  > | null;
}

/** The signed-in user's ratings, newest first, joined with title poster fields. */
export function useMyRatings(): UseQueryResult<MyRating[]> {
  const { user } = useAuth();
  return useQuery({
    queryKey: myRatingsQueryKey(user?.id),
    enabled: !!user?.id,
    queryFn: async (): Promise<MyRating[]> => {
      const supabase = getSupabase();
      if (!supabase || !user?.id) return [];
      const { data, error } = await supabase
        .from('ratings')
        .select(
          'id, verdict, created_at, updated_at, title:titles(id, title, media_type, poster_path, genres, tmdb_rating, imdb_rating, release_date)',
        )
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as MyRating[];
    },
  });
}

interface RateTitleInput {
  titleId: string;
  /** `null` removes the rating. */
  verdict: Verdict | null;
}

/**
 * Insert/update/delete the signed-in user's rating for a title. Upserts on the
 * `(user_id, title_id)` unique constraint; a `null` verdict deletes the row.
 * Invalidates the affected `my-ratings` cache on success.
 */
export function useRateTitle() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ titleId, verdict }: RateTitleInput) => {
      const supabase = getSupabase();
      if (!supabase || !user?.id) throw new Error('Not signed in');
      const userId = user.id;

      if (verdict === null) {
        const { error } = await supabase
          .from('ratings')
          .delete()
          .eq('user_id', userId)
          .eq('title_id', titleId);
        if (error) throw error;
        return { titleId, verdict: null } as const;
      }

      const { error } = await supabase.from('ratings').upsert(
        { user_id: userId, title_id: titleId, verdict, updated_at: new Date().toISOString() },
        { onConflict: 'user_id,title_id' },
      );
      if (error) throw error;
      return { titleId, verdict } as const;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: myRatingsQueryKey(user?.id) });
    },
  });
}

/** A save joined with the poster fields needed to render it in a list. */
export interface MySave {
  id: string;
  created_at: string;
  updated_at: string;
  title: Pick<
    Tables<'titles'>,
    | 'id'
    | 'title'
    | 'media_type'
    | 'poster_path'
    | 'genres'
    | 'tmdb_rating'
    | 'imdb_rating'
    | 'release_date'
  > | null;
}

/** The signed-in user's saves, newest first, joined with title poster fields. */
export function useMySaves(): UseQueryResult<MySave[]> {
  const { user } = useAuth();
  return useQuery({
    queryKey: mySavesQueryKey(user?.id),
    enabled: !!user?.id,
    queryFn: async (): Promise<MySave[]> => {
      const supabase = getSupabase();
      if (!supabase || !user?.id) return [];
      const { data, error } = await supabase
        .from('saves')
        .select(
          'id, created_at, updated_at, title:titles(id, title, media_type, poster_path, genres, tmdb_rating, imdb_rating, release_date)',
        )
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as MySave[];
    },
  });
}

interface ToggleSaveInput {
  titleId: string;
  /** When set, forces save (`true`) or unsave (`false`). Otherwise toggles. */
  saved?: boolean;
}

/**
 * Insert or delete the signed-in user's save for a title. Upserts on the
 * `(user_id, title_id)` unique constraint when saving; deletes when unsaving.
 * Invalidates the affected `my-saves` cache on success.
 */
export function useToggleSave() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ titleId, saved }: ToggleSaveInput) => {
      const supabase = getSupabase();
      if (!supabase || !user?.id) throw new Error('Not signed in');
      const userId = user.id;

      let nextSaved = saved;
      if (nextSaved === undefined) {
        const { data: existing, error: lookupError } = await supabase
          .from('saves')
          .select('id')
          .eq('user_id', userId)
          .eq('title_id', titleId)
          .maybeSingle();
        if (lookupError) throw lookupError;
        nextSaved = !existing;
      }

      if (!nextSaved) {
        const { error } = await supabase
          .from('saves')
          .delete()
          .eq('user_id', userId)
          .eq('title_id', titleId);
        if (error) throw error;
        return { titleId, saved: false } as const;
      }

      const { error } = await supabase.from('saves').upsert(
        { user_id: userId, title_id: titleId, updated_at: new Date().toISOString() },
        { onConflict: 'user_id,title_id' },
      );
      if (error) throw error;
      return { titleId, saved: true } as const;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: mySavesQueryKey(user?.id) });
    },
  });
}
