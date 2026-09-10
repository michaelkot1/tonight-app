/**
 * Thin wrapper around Supabase Edge Function invocation.
 *
 * `supabase.functions.invoke` already attaches the persisted session's access
 * token, but we resolve it explicitly and forward it as a Bearer header so JWT-
 * verified functions (tmdb-search / tmdb-title, mirroring delete-account) always
 * receive a valid Authorization even right after a session refresh.
 */
import { getSupabase } from '@/lib/supabase';

export class EdgeFunctionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EdgeFunctionError';
  }
}

/** Invoke a POST Edge Function with an optional JSON body; returns typed data. */
export async function invokeEdgeFunction<TResponse, TBody extends object | undefined = undefined>(
  name: string,
  body?: TBody,
): Promise<TResponse> {
  const supabase = getSupabase();
  if (!supabase) {
    throw new EdgeFunctionError('Supabase is not configured');
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.access_token) {
    throw new EdgeFunctionError('Not signed in');
  }

  const { data, error } = await supabase.functions.invoke<TResponse>(name, {
    method: 'POST',
    body: body ?? {},
    headers: { Authorization: `Bearer ${session.access_token}` },
  });

  if (error) {
    throw new EdgeFunctionError(error.message);
  }
  return data as TResponse;
}
