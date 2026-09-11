import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseQueryResult,
} from '@tanstack/react-query';

import type { Tables } from '@/lib/database.types';
import { getSupabase } from '@/lib/supabase';
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

function normalizeHandleQuery(raw: string): string {
  return raw.trim().replace(/^@+/, '').toLowerCase();
}

function invalidateFriendGraph(
  queryClient: ReturnType<typeof useQueryClient>,
  userId: string | undefined,
) {
  void queryClient.invalidateQueries({ queryKey: followingQueryKey(userId) });
  void queryClient.invalidateQueries({ queryKey: followersQueryKey(userId) });
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
