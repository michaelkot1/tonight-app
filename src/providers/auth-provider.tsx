import type { Session, User } from '@supabase/supabase-js';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as Linking from 'expo-linking';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import { hasSupabaseEnv } from '@/lib/env';
import { getSupabase } from '@/lib/supabase';
import {
  fetchProfile,
  profileQueryKey,
  type Profile,
} from '@/hooks/use-profile';

interface AuthResult {
  error: string | null;
}

interface SignUpResult extends AuthResult {
  /**
   * True when signup succeeded but email confirmation is required (no session yet).
   * The UI should collect the 6-digit OTP and call `verifyEmailOtp`.
   */
  needsEmailConfirmation: boolean;
}

interface AuthContextValue {
  /** False when Supabase env is missing — screens should surface a disabled state. */
  isConfigured: boolean;
  /** True until the initial getSession() resolves. */
  loading: boolean;
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  /** Onboarding-complete gate. `null` → user still needs onboarding. */
  onboardedAt: string | null;
  profileLoading: boolean;
  signInWithEmail: (email: string, password: string) => Promise<AuthResult>;
  signUpWithEmail: (email: string, password: string) => Promise<SignUpResult>;
  /** Resend the signup confirmation email (standard link). */
  resendConfirmationEmail: (email: string) => Promise<AuthResult>;
  signOut: () => Promise<void>;
  deleteAccount: () => Promise<AuthResult>;
}

/**
 * Redirect target embedded in the confirmation email. Resolves to the app's deep
 * link in every environment: `tonight://` in a dev/standalone build, or the
 * `exp://…/--/` dev URL under Expo Go. Must be allow-listed in Supabase Auth →
 * URL Configuration (Redirect URLs).
 */
function authRedirectUrl(): string {
  return Linking.createURL('/');
}

const NOT_CONFIGURED_ERROR =
  'Sign-in is unavailable — Supabase environment is not configured.';

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const supabase = getSupabase();
  const isConfigured = hasSupabaseEnv() && !!supabase;
  const queryClient = useQueryClient();

  const [session, setSession] = useState<Session | null>(null);
  // Only "loading" while we have a client and are awaiting the initial getSession().
  const [loading, setLoading] = useState(() => !!supabase);

  useEffect(() => {
    if (!supabase) return;

    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!mounted) return;
      setSession(nextSession);
      if (!nextSession) {
        // Drop any cached profile so a new sign-in re-fetches cleanly.
        queryClient.removeQueries({ queryKey: ['profile'] });
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [supabase, queryClient]);

  // Handle the email-confirmation deep link: the link 302-redirects into the app
  // with a PKCE `?code=`, which we exchange for a session (on the same device that
  // signed up). onAuthStateChange then drives the root redirect into the app.
  useEffect(() => {
    if (!supabase) return;

    async function handleUrl(url: string | null) {
      if (!url) return;
      const { queryParams } = Linking.parse(url);
      const code = queryParams?.code;
      if (typeof code === 'string' && code.length > 0) {
        await supabase!.auth.exchangeCodeForSession(code);
      }
    }

    Linking.getInitialURL().then(handleUrl);
    const sub = Linking.addEventListener('url', ({ url }) => {
      void handleUrl(url);
    });

    return () => sub.remove();
  }, [supabase]);

  const user = session?.user ?? null;

  const profileQuery = useQuery({
    queryKey: profileQueryKey(user?.id),
    queryFn: () => fetchProfile(user!.id),
    enabled: isConfigured && !!user?.id,
  });

  const signInWithEmail = useCallback(
    async (email: string, password: string): Promise<AuthResult> => {
      if (!supabase) return { error: NOT_CONFIGURED_ERROR };
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      return { error: error?.message ?? null };
    },
    [supabase],
  );

  const signUpWithEmail = useCallback(
    async (email: string, password: string): Promise<SignUpResult> => {
      if (!supabase) {
        return { error: NOT_CONFIGURED_ERROR, needsEmailConfirmation: false };
      }
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: authRedirectUrl() },
      });
      if (error) {
        return { error: error.message, needsEmailConfirmation: false };
      }
      // Supabase returns a user with empty identities when the email is already
      // registered (anti-enumeration). Surface a clear error instead.
      if (data.user && (data.user.identities?.length ?? 0) === 0) {
        return {
          error: 'An account with this email already exists. Sign in instead.',
          needsEmailConfirmation: false,
        };
      }
      // Confirm-email enabled → no session until the emailed link is clicked.
      return {
        error: null,
        needsEmailConfirmation: data.session == null,
      };
    },
    [supabase],
  );

  const resendConfirmationEmail = useCallback(
    async (email: string): Promise<AuthResult> => {
      if (!supabase) return { error: NOT_CONFIGURED_ERROR };
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email,
        options: { emailRedirectTo: authRedirectUrl() },
      });
      return { error: error?.message ?? null };
    },
    [supabase],
  );

  const signOut = useCallback(async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    queryClient.removeQueries({ queryKey: ['profile'] });
  }, [supabase, queryClient]);

  const deleteAccount = useCallback(async (): Promise<AuthResult> => {
    if (!supabase) return { error: NOT_CONFIGURED_ERROR };
    const { error } = await supabase.functions.invoke('delete-account', {
      method: 'POST',
    });
    if (error) return { error: error.message };
    await supabase.auth.signOut();
    queryClient.removeQueries({ queryKey: ['profile'] });
    return { error: null };
  }, [supabase, queryClient]);

  const value = useMemo<AuthContextValue>(
    () => ({
      isConfigured,
      loading,
      session,
      user,
      profile: profileQuery.data ?? null,
      onboardedAt: profileQuery.data?.onboarded_at ?? null,
      profileLoading: profileQuery.isLoading,
      signInWithEmail,
      signUpWithEmail,
      resendConfirmationEmail,
      signOut,
      deleteAccount,
    }),
    [
      isConfigured,
      loading,
      session,
      user,
      profileQuery.data,
      profileQuery.isLoading,
      signInWithEmail,
      signUpWithEmail,
      resendConfirmationEmail,
      signOut,
      deleteAccount,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
