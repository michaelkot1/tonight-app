/**
 * Typed public env for the Expo client.
 *
 * Client-safe: EXPO_PUBLIC_SUPABASE_* only.
 * TMDB / OMDb keys must stay server-side (API routes / Edge Functions) — typed
 * here as optional placeholders so config stays discoverable without shipping secrets.
 */
export interface PublicEnv {
  supabaseUrl: string | undefined;
  supabaseAnonKey: string | undefined;
  /**
   * OAuth (deferred — Phase 2 defers native Apple/Google sign-in wiring).
   * Optional/nullable: NEVER require these. They exist so Google Sign-In can
   * drop in later without a schema/config hunt. Do not add secrets here.
   */
  googleIosClientId: string | undefined;
  googleWebClientId: string | undefined;
}

export interface ServerEnvNames {
  /** Server-only — do not expose via EXPO_PUBLIC_ */
  tmdbApiKey: 'TMDB_API_KEY';
  tmdbReadAccessToken: 'TMDB_READ_ACCESS_TOKEN';
  omdbApiKey: 'OMDB_API_KEY';
}

export const serverEnvNames: ServerEnvNames = {
  tmdbApiKey: 'TMDB_API_KEY',
  tmdbReadAccessToken: 'TMDB_READ_ACCESS_TOKEN',
  omdbApiKey: 'OMDB_API_KEY',
};

function trimEnv(value: string | undefined): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export const env: PublicEnv = {
  supabaseUrl: trimEnv(process.env.EXPO_PUBLIC_SUPABASE_URL),
  supabaseAnonKey: trimEnv(process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY),
  // Deferred OAuth — optional, safe to be undefined.
  googleIosClientId: trimEnv(process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID),
  googleWebClientId: trimEnv(process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID),
};

/**
 * Fail-loud guard: if the anon key is present but not a well-formed anon JWT,
 * warn at bundle load so the first Metro log line names the real problem
 * ("Invalid API key" from PostgREST is otherwise very misleading).
 * Pure, no throw — a decode failure must never crash the app.
 */
function validateAnonKey(key: string | undefined): void {
  if (!key) return;
  const malformed = '[env] EXPO_PUBLIC_SUPABASE_ANON_KEY appears malformed — sign-in will fail with "Invalid API key"';
  try {
    const parts = key.split('.');
    if (parts.length !== 3) return console.warn(malformed);
    const b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4);
    const payload = JSON.parse(atob(padded)) as { role?: string };
    if (payload.role === 'service_role') {
      console.error('[env] EXPO_PUBLIC_SUPABASE_ANON_KEY is a service_role JWT — this must NEVER ship to the client. Replace with the anon key immediately.');
    } else if (payload.role !== 'anon') {
      console.warn(malformed);
    }
  } catch {
    console.warn(malformed);
  }
}

validateAnonKey(env.supabaseAnonKey);

export function hasSupabaseEnv(): boolean {
  return Boolean(env.supabaseUrl && env.supabaseAnonKey);
}
