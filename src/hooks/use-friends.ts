import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseQueryResult,
} from '@tanstack/react-query';
import { useMemo } from 'react';

import type { Tables } from '@/lib/database.types';
import { invokeEdgeFunction } from '@/lib/edge';
import {
  aggregateSocialByTitle,
  type FriendTitleRating,
  type TitleSocialProof,
} from '@/lib/social';
import { getSupabase } from '@/lib/supabase';
import type { Verdict } from '@/lib/titles';
import { useDebouncedValue } from '@/hooks/use-titles';
import { useAuth } from '@/providers/auth-provider';

export type ProfileSummary = Pick<
  Tables<'profiles'>,
  'id' | 'handle' | 'display_name' | 'avatar_url'
>;

export interface FollowingRow {
  followingId: string;
  createdAt: string;
  profile: ProfileSummary;
}

export interface FollowerRow {
  followerId: string;
  createdAt: string;
  profile: ProfileSummary;
}

const MIN_SEARCH_LENGTH = 2;
const SEARCH_DEBOUNCE_MS = 350;

export const myInviteQueryKey = (userId: string | undefined) =>
  ['my-invite', userId] as const;

export const followingQueryKey = (userId: string | undefined) =>
  ['following', userId] as const;

export const followersQueryKey = (userId: string | undefined) =>
  ['followers', userId] as const;

export const profileSearchQueryKey = (query: string) =>
  ['profile-search', query] as const;

export const friendRatingsQueryKey = (
  userId: string | undefined,
  titleIdsKey: string,
) => ['friend-ratings', userId, titleIdsKey] as const;

export const matchContactsQueryKey = (emailsKey: string) =>
  ['match-contacts', emailsKey] as const;

const MAX_CONTACT_EMAILS = 200;

function normalizeHandleQuery(raw: string): string {
  return raw.trim().replace(/^@+/, '').toLowerCase();
}

function invalidateFriendGraph(
  queryClient: ReturnType<typeof useQueryClient>,
  userId: string | undefined,
) {
  void queryClient.invalidateQueries({ queryKey: followingQueryKey(userId) });
  void queryClient.invalidateQueries({ queryKey: followersQueryKey(userId) });
  void queryClient.invalidateQueries({ queryKey: ['friend-ratings', userId] });
}

/** Durable reusable invite code for the signed-in user (`create_or_get_my_invite`). */
export function useMyInvite(): UseQueryResult<string> {
  const { user } = useAuth();
  return useQuery({
    queryKey: myInviteQueryKey(user?.id),
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 30,
    queryFn: async () => {
      const supabase = getSupabase();
      if (!supabase) throw new Error('Not configured');

      const { data, error } = await supabase.rpc('create_or_get_my_invite');
      if (error) throw error;
      if (!data) throw new Error('No invite code returned');
      return data;
    },
  });
}

/** Accept an invite code via SECURITY DEFINER RPC (two-way follows). */
export function useAcceptInvite() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (inviteCode: string) => {
      const supabase = getSupabase();
      if (!supabase) throw new Error('Not configured');

      const { data, error } = await supabase.rpc('accept_invite', {
        invite_code: inviteCode.trim(),
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      invalidateFriendGraph(queryClient, user?.id);
    },
  });
}

/** One-way follow INSERT (RLS: follower_id = auth.uid()). */
export function useFollow() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (followingId: string) => {
      const supabase = getSupabase();
      if (!supabase || !user?.id) throw new Error('Not signed in');
      if (followingId === user.id) throw new Error('Cannot follow yourself');

      const { error } = await supabase.from('follows').insert({
        follower_id: user.id,
        following_id: followingId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      invalidateFriendGraph(queryClient, user?.id);
    },
  });
}

/** One-way unfollow DELETE. */
export function useUnfollow() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (followingId: string) => {
      const supabase = getSupabase();
      if (!supabase || !user?.id) throw new Error('Not signed in');

      const { error } = await supabase
        .from('follows')
        .delete()
        .eq('follower_id', user.id)
        .eq('following_id', followingId);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidateFriendGraph(queryClient, user?.id);
    },
  });
}

/** Profiles the current user follows (joined for handle / display name). */
export function useFollowing(): UseQueryResult<FollowingRow[]> {
  const { user } = useAuth();

  return useQuery({
    queryKey: followingQueryKey(user?.id),
    enabled: !!user?.id,
    queryFn: async () => {
      const supabase = getSupabase();
      if (!supabase || !user?.id) return [];

      const { data, error } = await supabase
        .from('follows')
        .select(
          `
          following_id,
          created_at,
          profile:profiles!follows_following_id_fkey (
            id,
            handle,
            display_name,
            avatar_url
          )
        `,
        )
        .eq('follower_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (data ?? [])
        .map((row) => {
          const profile = row.profile as ProfileSummary | ProfileSummary[] | null;
          const resolved = Array.isArray(profile) ? profile[0] : profile;
          if (!resolved) return null;
          return {
            followingId: row.following_id,
            createdAt: row.created_at,
            profile: resolved,
          } satisfies FollowingRow;
        })
        .filter((row): row is FollowingRow => row != null);
    },
  });
}

/** Profiles that follow the current user. */
export function useFollowers(): UseQueryResult<FollowerRow[]> {
  const { user } = useAuth();

  return useQuery({
    queryKey: followersQueryKey(user?.id),
    enabled: !!user?.id,
    queryFn: async () => {
      const supabase = getSupabase();
      if (!supabase || !user?.id) return [];

      const { data, error } = await supabase
        .from('follows')
        .select(
          `
          follower_id,
          created_at,
          profile:profiles!follows_follower_id_fkey (
            id,
            handle,
            display_name,
            avatar_url
          )
        `,
        )
        .eq('following_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (data ?? [])
        .map((row) => {
          const profile = row.profile as ProfileSummary | ProfileSummary[] | null;
          const resolved = Array.isArray(profile) ? profile[0] : profile;
          if (!resolved) return null;
          return {
            followerId: row.follower_id,
            createdAt: row.created_at,
            profile: resolved,
          } satisfies FollowerRow;
        })
        .filter((row): row is FollowerRow => row != null);
    },
  });
}

/**
 * Incoming friend requests: people who follow you that you do not follow back.
 * Accept = follow them (mutual).
 */
export function useFriendRequests(): {
  data: FollowerRow[];
  isLoading: boolean;
  isFetching: boolean;
  isError: boolean;
} {
  const followers = useFollowers();
  const following = useFollowing();
  const followingIds = new Set(
    (following.data ?? []).map((row) => row.followingId),
  );
  const data =
    followers.data == null
      ? []
      : followers.data.filter((row) => !followingIds.has(row.followerId));

  return {
    data,
    isLoading: followers.isLoading || following.isLoading,
    isFetching: followers.isFetching || following.isFetching,
    isError: followers.isError || following.isError,
  };
}

/** Debounced @handle prefix search against `profiles` (authenticated SELECT). */
export function useSearchProfiles(
  query: string,
): UseQueryResult<ProfileSummary[]> {
  const { user } = useAuth();
  const normalized = normalizeHandleQuery(query);
  const debounced = useDebouncedValue(normalized, SEARCH_DEBOUNCE_MS);

  return useQuery({
    queryKey: profileSearchQueryKey(debounced),
    enabled: !!user?.id && debounced.length >= MIN_SEARCH_LENGTH,
    staleTime: 1000 * 30,
    queryFn: async () => {
      const supabase = getSupabase();
      if (!supabase || !user?.id) return [];

      const { data, error } = await supabase
        .from('profiles')
        .select('id, handle, display_name, avatar_url')
        .not('handle', 'is', null)
        .ilike('handle', `${debounced}%`)
        .neq('id', user.id)
        .order('handle', { ascending: true })
        .limit(20);

      if (error) throw error;
      return (data ?? []) as ProfileSummary[];
    },
  });
}

/**
 * Batched friend ratings for visible title ids (RLS: self + people you follow).
 * Returns a map of titleId → pile + socialLine (excludes the signed-in user).
 */
export function useFriendSocialByTitle(
  titleIds: string[],
): UseQueryResult<Map<string, TitleSocialProof>> {
  const { user } = useAuth();
  const uniqueIds = useMemo(() => {
    const seen = new Set<string>();
    const ids: string[] = [];
    for (const id of titleIds) {
      if (!id || seen.has(id)) continue;
      seen.add(id);
      ids.push(id);
    }
    return ids.sort();
  }, [titleIds]);
  const titleIdsKey = uniqueIds.join(',');

  return useQuery({
    queryKey: friendRatingsQueryKey(user?.id, titleIdsKey),
    enabled: !!user?.id && uniqueIds.length > 0,
    staleTime: 1000 * 60,
    queryFn: async () => {
      const supabase = getSupabase();
      if (!supabase || !user?.id) return new Map<string, TitleSocialProof>();

      const { data, error } = await supabase
        .from('ratings')
        .select(
          `
          title_id,
          verdict,
          user_id,
          profile:profiles!ratings_user_id_fkey (
            id,
            handle,
            display_name,
            avatar_url
          )
        `,
        )
        .in('title_id', uniqueIds)
        .neq('user_id', user.id);

      if (error) throw error;

      const rows: FriendTitleRating[] = [];
      for (const row of data ?? []) {
        const profile = row.profile as ProfileSummary | ProfileSummary[] | null;
        const resolved = Array.isArray(profile) ? profile[0] : profile;
        if (!resolved) continue;
        rows.push({
          titleId: row.title_id,
          verdict: row.verdict as Verdict,
          profile: resolved,
        });
      }

      return aggregateSocialByTitle(rows);
    },
  });
}

interface MatchContactsResponse {
  matches: ProfileSummary[];
}

/** Normalize + de-dupe emails for the match-contacts Edge Function. */
export function normalizeContactEmails(raw: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of raw) {
    const email = value.trim().toLowerCase();
    if (!email || !email.includes('@') || seen.has(email)) continue;
    seen.add(email);
    out.push(email);
    if (out.length >= MAX_CONTACT_EMAILS) break;
  }
  return out;
}

/**
 * Match device contact emails against Tonight users via the `match-contacts`
 * Edge Function. Returns profile summaries only — never unmatched PII.
 */
export function useMatchContacts(
  emails: string[],
): UseQueryResult<ProfileSummary[]> {
  const { user } = useAuth();
  const normalized = useMemo(() => normalizeContactEmails(emails), [emails]);
  const emailsKey = normalized.join(',');

  return useQuery({
    queryKey: matchContactsQueryKey(emailsKey),
    enabled: !!user?.id && normalized.length > 0,
    staleTime: 1000 * 60 * 5,
    queryFn: async () => {
      const response = await invokeEdgeFunction<
        MatchContactsResponse,
        { emails: string[] }
      >('match-contacts', { emails: normalized });
      return response.matches ?? [];
    },
  });
}
