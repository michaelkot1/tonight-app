import { useRouter } from 'expo-router';
import * as Linking from 'expo-linking';
import { ActivityIndicator, Share, StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { OnboardingScaffold } from '@/components/onboarding-scaffold';
import { ThemedText } from '@/components/themed-text';
import { useMyInvite } from '@/hooks/use-friends';
import { routes } from '@/lib/routes';
import { colors, radius, spacing } from '@/theme';

export function InviteScreen() {
  const router = useRouter();
  const invite = useMyInvite();
  const inviteUrl = invite.data
    ? Linking.createURL(`/invite/${invite.data}`)
    : null;

  function goNext() {
    router.push(routes.onboarding.notifications);
  }

  async function handleShare() {
    if (!inviteUrl) return;
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
        {invite.isLoading ? (
          <ActivityIndicator color={colors.textMuted} />
        ) : invite.isError || !inviteUrl ? (
          <ThemedText variant="metadata">
            Invite link unavailable right now — you can share from Friends
            later.
          </ThemedText>
        ) : (
          <ThemedText variant="cardTitle" numberOfLines={2}>
            {inviteUrl}
          </ThemedText>
        )}
      </View>
      <Button
        label="Share invite link"
        variant="secondary"
        onPress={handleShare}
        disabled={!inviteUrl}
        loading={invite.isLoading}
      />
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
