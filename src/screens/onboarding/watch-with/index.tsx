import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Chip } from '@/components/chip';
import { OnboardingScaffold } from '@/components/onboarding-scaffold';
import { useProfile, useUpdateWatchWith } from '@/hooks/use-profile';
import { routes } from '@/lib/routes';
import { spacing } from '@/theme';

const OPTIONS = [
  { value: 'partner', label: 'Partner' },
  { value: 'roommates', label: 'Roommates' },
  { value: 'friends', label: 'Friends' },
  { value: 'solo', label: 'Solo' },
] as const;

export function WatchWithScreen() {
  const router = useRouter();
  const { data: profile } = useProfile();
  const updateWatchWith = useUpdateWatchWith();

  // `undefined` until the user picks — display derives from the saved preference.
  const [edited, setEdited] = useState<string | null | undefined>(undefined);
  const selected = edited === undefined ? (profile?.watch_with ?? null) : edited;

  function goNext() {
    router.push(routes.onboarding.invite);
  }

  async function handleContinue() {
    if (selected) {
      try {
        await updateWatchWith.mutateAsync(selected);
      } catch {
        // Non-blocking preference — advance regardless.
      }
    }
    goNext();
  }

  return (
    <OnboardingScaffold
      step={4}
      totalSteps={6}
      title="Who do you usually watch with?"
      subtitle="This tunes your defaults and invite copy. You can change it anytime."
      primaryDisabled={updateWatchWith.isPending}
      primaryLoading={updateWatchWith.isPending}
      onPrimary={handleContinue}
      onSkip={goNext}
    >
      <View style={styles.chips}>
        {OPTIONS.map(({ value, label }) => (
          <Chip
            key={value}
            label={label}
            selected={selected === value}
            onPress={() => setEdited(value)}
          />
        ))}
      </View>
    </OnboardingScaffold>
  );
}

const styles = StyleSheet.create({
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
});
