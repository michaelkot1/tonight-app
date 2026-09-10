import { useRouter } from 'expo-router';
import * as Linking from 'expo-linking';
import { Share, StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { OnboardingScaffold } from '@/components/onboarding-scaffold';
import { ThemedText } from '@/components/themed-text';
import { routes } from '@/lib/routes';
import { colors, radius, spacing } from '@/theme';

// Placeholder invite link. Real per-user invite codes (invites table) land with the
// friends/invite feature; contacts matching is deferred this phase.
const PLACEHOLDER_CODE = 'tonight';

export function InviteScreen() {
  const router = useRouter();
  const inviteUrl = Linking.createURL(`/invite/${PLACEHOLDER_CODE}`);

  function goNext() {
    router.push(routes.onboarding.notifications);
  }

  async function handleShare() {
    try {
      await Share.share({
        message: `Join me on Tonight — we'll decide what to watch in 60 seconds. ${inviteUrl}`,
      });
    } catch {
      // User dismissed or share failed — no-op.
    }
  }

  return (
    <OnboardingScaffold
      step={5}
      totalSteps={6}
      title="Bring a friend"
      subtitle="Tonight is better with friends — their ratings power your picks."
      primaryLabel="Continue"
      onPrimary={goNext}
      onSkip={goNext}
    >
      <View style={styles.card}>
        <ThemedText variant="caption">Your invite link</ThemedText>
        <ThemedText variant="cardTitle" numberOfLines={1}>
          {inviteUrl}
        </ThemedText>
      </View>
      <Button label="Share invite link" variant="secondary" onPress={handleShare} />
    </OnboardingScaffold>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderCurve: 'continuous',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.sm,
  },
});
