import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { StreamingService } from '@/lib/services';
import { getSupabase } from '@/lib/supabase';
import { useAuth } from '@/providers/auth-provider';

const userServicesQueryKey = (userId: string | undefined) =>
  ['user-services', userId] as const;

/** Read the services the signed-in user has marked they pay for. */
export function useUserServices() {
  const { user } = useAuth();
  return useQuery({
    queryKey: userServicesQueryKey(user?.id),
    queryFn: async (): Promise<StreamingService[]> => {
      const supabase = getSupabase();
      if (!supabase || !user?.id) return [];

      const { data, error } = await supabase
        .from('user_services')
        .select('service')
        .eq('user_id', user.id);

      if (error) throw error;
      return data.map((row) => row.service);
    },
    enabled: !!user?.id,
  });
}

/**
 * Reconcile the user's selected services against the DB: insert newly-selected rows
 * and delete de-selected ones. PK is (user_id, service), so inserts are idempotent.
 */
export function useSetUserServices() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (selected: StreamingService[]) => {
      const supabase = getSupabase();
      if (!supabase || !user?.id) throw new Error('Not signed in');
      const userId = user.id;

      const { data: existingRows, error: readError } = await supabase
        .from('user_services')
        .select('service')
        .eq('user_id', userId);
      if (readError) throw readError;

      const existing = new Set(existingRows.map((row) => row.service));
      const next = new Set(selected);

      const toInsert = selected.filter((service) => !existing.has(service));
      const toDelete = [...existing].filter((service) => !next.has(service));

      if (toInsert.length > 0) {
        const { error: insertError } = await supabase
          .from('user_services')
          .insert(toInsert.map((service) => ({ user_id: userId, service })));
        if (insertError) throw insertError;
      }

      if (toDelete.length > 0) {
        const { error: deleteError } = await supabase
          .from('user_services')
          .delete()
          .eq('user_id', userId)
          .in('service', toDelete);
        if (deleteError) throw deleteError;
      }

      return selected;
    },
    onSuccess: (selected) => {
      queryClient.setQueryData(userServicesQueryKey(user?.id), selected);
    },
  });
}
