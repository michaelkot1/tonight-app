import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { flushPendingInvite, setPendingInviteCode } from '@/lib/pending-invite';
import { routes } from '@/lib/routes';
import { useAuth } from '@/providers/auth-provider';
import { colors, spacing } from '@/theme';

function firstParam(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? '';
  return value ?? '';
}

/**
 * Deep-link landing for `/invite/[code]`.
 * Stashes the code for logged-out / mid-onboarding users; accepts immediately
 * when a session already exists. Does not confuse auth PKCE `?code=` handling.
 */
export function InviteAcceptScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { code: codeParam } = useLocalSearchParams<{ code: string }>();
  const code = firstParam(codeParam).trim();
  const { session, onboardedAt, loading, profileLoading } = useAuth();
  const [status, setStatus] = useState<'working' | 'done' | 'error'>('working');
  const [message, setMessage] = useState('Connecting you…');
  const ranRef = useRef(false);

  useEffect(() => {
    if (loading || (session && profileLoading)) return;
    if (ranRef.current) return;
    ranRef.current = true;

    async function run() {
      if (!code) {
        setStatus('error');
        setMessage('This invite link is missing a code.');
        return;
      }

      await setPendingInviteCode(code);

      if (!session) {
        setMessage('Sign in to accept this invite.');
        setStatus('done');
        router.replace(routes.auth);
        return;
      }

      const result = await flushPendingInvite();
      if (result.error && !result.accepted) {
        // Non-fatal for expected cases (own invite, already connected via prior accept).
        setMessage(result.error);
        setStatus('error');
      } else {
        setMessage(result.accepted ? "You're connected." : 'Invite ready.');
        setStatus('done');
      }

      if (onboardedAt == null) {
        router.replace(routes.onboarding.services);
      } else {
        router.replace(routes.friends);
      }
    }

    void run();
  }, [code, session, onboardedAt, loading, profileLoading, router]);

  return (
    <View
      style={[
        styles.root,
        {
          paddingTop: insets.top + spacing.header,
          paddingBottom: insets.bottom + spacing.lg,
        },
      ]}
    >
      {status === 'working' ? (
        <ActivityIndicator color={colors.textMuted} />
      ) : null}
      <ThemedText variant="screenTitle">Invite</ThemedText>
      <ThemedText variant="metadata" style={styles.message}>
        {message}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
    paddingHorizontal: spacing.inset,
    gap: spacing.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  message: {
    textAlign: 'center',
  },
});
