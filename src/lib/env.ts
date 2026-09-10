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

export function hasSupabaseEnv(): boolean {
  return Boolean(env.supabaseUrl && env.supabaseAnonKey);
}
