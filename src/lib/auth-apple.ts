import * as AppleAuthentication from 'expo-apple-authentication';
import { Platform } from 'react-native';

import type { TonightSupabaseClient } from '@/lib/supabase';

export interface AppleSignInResult {
  error: string | null;
  /** True when the user dismissed the Apple sheet — treat as soft cancel. */
  canceled: boolean;
}

function formatAppleFullName(
  fullName: AppleAuthentication.AppleAuthenticationFullName | null,
): string | null {
  if (!fullName) return null;
  const parts = [
    fullName.givenName,
    fullName.middleName,
    fullName.familyName,
  ].filter((part): part is string => !!part?.trim());
  if (parts.length === 0) return null;
  return parts.join(' ');
}

function isAppleCancelError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code: unknown }).code === 'ERR_REQUEST_CANCELED'
  );
}

/** True when native Sign in with Apple can be presented (iOS only). */
export async function isAppleAuthAvailable(): Promise<boolean> {
  if (Platform.OS !== 'ios') return false;
  try {
    return await AppleAuthentication.isAvailableAsync();
  } catch {
    return false;
  }
}

/**
 * Native Sign in with Apple → Supabase `signInWithIdToken`.
 * When Apple returns a name (first sign-in only), persists it to user metadata
 * and `profiles.display_name` (the insert trigger runs before name is available).
 */
export async function signInWithApple(
  supabase: TonightSupabaseClient,
): Promise<AppleSignInResult> {
  if (Platform.OS !== 'ios') {
    return {
      error: 'Sign in with Apple is only available on iOS.',
      canceled: false,
    };
  }

  const available = await AppleAuthentication.isAvailableAsync();
  if (!available) {
    return {
      error:
        'Sign in with Apple isn\u2019t available in Expo Go. Run `npx expo run:ios` to test in a development build.',
      canceled: false,
    };
  }

  try {
    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
    });

    if (!credential.identityToken) {
      return { error: 'Apple did not return an identity token.', canceled: false };
    }

    const { data, error } = await supabase.auth.signInWithIdToken({
      provider: 'apple',
      token: credential.identityToken,
    });

    if (error) {
      return { error: error.message, canceled: false };
    }

    const fullName = formatAppleFullName(credential.fullName);
    const userId = data.user?.id;

    if (fullName && userId) {
      await supabase.auth.updateUser({
        data: {
          full_name: fullName,
          given_name: credential.fullName?.givenName ?? undefined,
          family_name: credential.fullName?.familyName ?? undefined,
        },
      });

      // Profile row is created by handle_new_user before Apple name is available.
      await supabase
        .from('profiles')
        .update({ display_name: fullName })
        .eq('id', userId);
    }

    return { error: null, canceled: false };
  } catch (error) {
    if (isAppleCancelError(error)) {
      return { error: null, canceled: true };
    }
    const message =
      error instanceof Error ? error.message : 'Sign in with Apple failed.';
    return { error: message, canceled: false };
  }
}
