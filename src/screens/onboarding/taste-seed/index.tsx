import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { OnboardingScaffold } from '@/components/onboarding-scaffold';
import { ThemedText } from '@/components/themed-text';
import { routes } from '@/lib/routes';
import { colors, radius, spacing } from '@/theme';

// TODO(taste-seed): Phase 3 — swap this placeholder for real TMDB popular titles
// rated with the loved / liked / meh gesture to fix cold-start. Awaiting owner
// decision on the seed title set.
export function TasteSeedScreen() {
  const router = useRouter();

  function advance() {
    router.push(routes.onboarding.handle);
  }

  return (
    <OnboardingScaffold
      step={2}
      totalSteps={6}
      title="Teach Tonight your taste"
      subtitle="Soon you'll rate a few popular titles so your picks feel personal from day one."
      primaryLabel="Skip for now"
      onPrimary={advance}
    >
      <View style={styles.placeholder}>
        <ThemedText variant="cardTitle">Rating comes next</ThemedText>
        <ThemedText variant="caption">
          We&apos;re still wiring up the loved / liked / meh gesture. You can skip
          this for now and personalize later.
        </ThemedText>
      </View>
    </OnboardingScaffold>
  );
}

const styles = StyleSheet.create({
  placeholder: {
    backgroundColor: colors.surface,
    borderRadius: radius.hero,
    borderCurve: 'continuous',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: spacing.xxl,
    gap: spacing.sm,
  },
});
