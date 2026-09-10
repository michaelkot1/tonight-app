import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

import { getSupabase } from '@/lib/supabase';

/** Handle format: 3–20 chars of lowercase letters, digits, or underscore. */
export const HANDLE_PATTERN = /^[a-z0-9_]{3,20}$/;

export function isHandleFormatValid(handle: string): boolean {
  return HANDLE_PATTERN.test(handle);
}

export type HandleAvailabilityStatus =
  | 'idle'
  | 'invalid'
  | 'checking'
  | 'available'
  | 'taken'
  | 'error';

interface UseHandleAvailabilityResult {
  status: HandleAvailabilityStatus;
  available: boolean;
}

/**
 * Debounced availability check against the `is_handle_available` RPC. Only fires for
 * well-formed handles; the debounce avoids a request on every keystroke.
 */
export function useHandleAvailability(
  handle: string,
  debounceMs = 400,
): UseHandleAvailabilityResult {
  const [debounced, setDebounced] = useState(handle);
  const formatValid = isHandleFormatValid(handle);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(handle), debounceMs);
    return () => clearTimeout(timer);
  }, [handle, debounceMs]);

  const query = useQuery({
    queryKey: ['handle-availability', debounced],
    queryFn: async (): Promise<boolean> => {
      const supabase = getSupabase();
      if (!supabase) throw new Error('Not configured');

      const { data, error } = await supabase.rpc('is_handle_available', {
        candidate: debounced,
      });
      if (error) throw error;
      return Boolean(data);
    },
    enabled: isHandleFormatValid(debounced),
    staleTime: 1000 * 30,
  });

  let status: HandleAvailabilityStatus;
  if (handle.length === 0) {
    status = 'idle';
  } else if (!formatValid) {
    status = 'invalid';
  } else if (handle !== debounced || query.isFetching) {
    status = 'checking';
  } else if (query.isError) {
    status = 'error';
  } else if (query.data === true) {
    status = 'available';
  } else if (query.data === false) {
    status = 'taken';
  } else {
    status = 'checking';
  }

  return { status, available: status === 'available' };
}
