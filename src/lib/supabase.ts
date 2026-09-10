import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

import type { Database } from '@/lib/database.types';
import { env, hasSupabaseEnv } from '@/lib/env';

/** Typed Supabase client for the Tonight schema (generated in database.types.ts). */
export type TonightSupabaseClient = SupabaseClient<Database>;

/**
 * Expo SecureStore adapter for Supabase auth sessions.
 * Web falls back to localStorage (Expo web / SSR-safe no-op when unavailable).
 */
const ExpoSecureStoreAdapter = {
  getItem: (key: string) => {
    if (Platform.OS === 'web') {
      if (typeof localStorage === 'undefined') return null;
      return localStorage.getItem(key);
    }
    return SecureStore.getItemAsync(key);
  },
  setItem: (key: string, value: string) => {
    if (Platform.OS === 'web') {
      if (typeof localStorage === 'undefined') return;
      localStorage.setItem(key, value);
      return;
    }
    return SecureStore.setItemAsync(key, value);
  },
  removeItem: (key: string) => {
    if (Platform.OS === 'web') {
      if (typeof localStorage === 'undefined') return;
      localStorage.removeItem(key);
      return;
    }
    return SecureStore.deleteItemAsync(key);
  },
};

let client: TonightSupabaseClient | null = null;

/** Returns null when Supabase env is missing — callers must null-check. */
export function getSupabase(): TonightSupabaseClient | null {
  if (!hasSupabaseEnv()) {
    return null;
  }

  if (!client) {
    client = createClient<Database>(env.supabaseUrl!, env.supabaseAnonKey!, {
      auth: {
        storage: ExpoSecureStoreAdapter,
        autoRefreshToken: true,
        persistSession: true,
        // Native: we parse the email-confirmation deep link ourselves (see
        // AuthProvider) rather than relying on browser URL detection.
        detectSessionInUrl: false,
        // PKCE → the confirmation redirect carries a `?code=` query param we can
        // parse with expo-linking and exchange for a session on-device.
        flowType: 'pkce',
      },
    });
  }

  return client;
}
