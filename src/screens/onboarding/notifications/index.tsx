import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { OnboardingScaffold } from '@/components/onboarding-scaffold';
import { ThemedText } from '@/components/themed-text';
import { useCompleteOnboarding } from '@/hooks/use-profile';
import { routes } from '@/lib/routes';
import { colors, radius, spacing } from '@/theme';

export function NotificationsScreen() {
  const router = useRouter();
  const completeOnboarding = useCompleteOnboarding();
  const [error, setError] = useState<string | null>(null);

  async function finish(enableNotifications: boolean) {
    setError(null);
    // TODO(notifications): When enableNotifications is true, request the OS
    // permission via expo-notifications before completing. Deferred this phase.
    void enableNotifications;
    try {
      await completeOnboarding.mutateAsync();
      router.replace(routes.tabs);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not finish setup.');
    }
  }

  return (
    <OnboardingScaffold
      step={6}
      totalSteps={6}
      title="Never miss a great night in"
      subtitle="We'll ping you when something great lands on your services."
      primaryLabel="Turn on notifications"
      primaryLoading={completeOnboarding.isPending}
      onPrimary={() => finish(true)}
      onSkip={() => finish(false)}
      skipLabel="Not now"
    >
      <View style={styles.card}>
        <ThemedText variant="cardTitle">What you&apos;ll hear about</ThemedText>
        <ThemedText variant="caption">
          New titles your friends loved, fresh arrivals on your services, and
          Decider invites — nothing noisy.
        </ThemedText>
      </View>
      {error ? (
        <ThemedText variant="caption" style={styles.error}>
          {error}
        </ThemedText>
      ) : null}
    </OnboardingScaffold>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.hero,
    borderCurve: 'continuous',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: spacing.xxl,
    gap: spacing.sm,
  },
  error: {
    color: colors.accent,
  },
});
