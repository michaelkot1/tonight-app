import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { Tables } from '@/lib/database.types';
import { getSupabase } from '@/lib/supabase';
import { useAuth } from '@/providers/auth-provider';

export type Profile = Tables<'profiles'>;

/** Shared React Query key so the AuthProvider and screens hit the same cache entry. */
export const profileQueryKey = (userId: string | undefined) =>
  ['profile', userId] as const;

/** Fetch the current user's own `profiles` row (RLS-scoped). Pure — no hooks. */
export async function fetchProfile(userId: string): Promise<Profile | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

/** Read the signed-in user's profile row. */
export function useProfile() {
  const { user } = useAuth();
  return useQuery({
    queryKey: profileQueryKey(user?.id),
    queryFn: () => fetchProfile(user!.id),
    enabled: !!user?.id,
  });
}

function useProfileUserId(): string | undefined {
  return useAuth().user?.id;
}

/** Update the handle (unique, 3–20 chars of [a-z0-9_]). Assumes availability checked. */
export function useUpdateHandle() {
  const userId = useProfileUserId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (handle: string) => {
      const supabase = getSupabase();
      if (!supabase || !userId) throw new Error('Not signed in');

      const { data, error } = await supabase
        .from('profiles')
        .update({ handle })
        .eq('id', userId)
        .select('*')
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(profileQueryKey(userId), data);
    },
  });
}

/** Set the "watch with" preference (partner | roommates | friends | solo). */
export function useUpdateWatchWith() {
  const userId = useProfileUserId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (watchWith: string) => {
      const supabase = getSupabase();
      if (!supabase || !userId) throw new Error('Not signed in');

      const { data, error } = await supabase
        .from('profiles')
        .update({ watch_with: watchWith })
        .eq('id', userId)
        .select('*')
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(profileQueryKey(userId), data);
    },
  });
}

/** Mark onboarding complete by stamping `onboarded_at`. This is the routing gate. */
export function useCompleteOnboarding() {
  const userId = useProfileUserId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const supabase = getSupabase();
      if (!supabase || !userId) throw new Error('Not signed in');

      const { data, error } = await supabase
        .from('profiles')
        .update({ onboarded_at: new Date().toISOString() })
        .eq('id', userId)
        .select('*')
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(profileQueryKey(userId), data);
    },
  });
}
