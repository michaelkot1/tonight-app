import { useRouter } from 'expo-router';
import { useState } from 'react';

import { OnboardingScaffold } from '@/components/onboarding-scaffold';
import { TextInput } from '@/components/text-input';
import { useHandleAvailability } from '@/hooks/use-handle-availability';
import { useProfile, useUpdateHandle } from '@/hooks/use-profile';
import { routes } from '@/lib/routes';

/** Lowercase and strip a source name down to a valid handle candidate. */
function suggestHandle(source: string): string {
  return source
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '')
    .slice(0, 20);
}

const HELPER_TEXT: Record<string, string> = {
  idle: '3–20 characters — letters, numbers, and underscores.',
  invalid: '3–20 characters — letters, numbers, and underscores.',
  checking: 'Checking availability…',
  available: 'Nice — that handle is available.',
  taken: 'That handle is already taken.',
  error: "Couldn't check availability. Try again.",
};

export function HandleScreen() {
  const router = useRouter();
  const { data: profile } = useProfile();
  const updateHandle = useUpdateHandle();

  // `null` until the user types — value derives from an existing handle or a
  // suggestion off the display name so the field is prefilled without an effect.
  const [edited, setEdited] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const suggestion = profile
    ? suggestHandle(profile.handle ?? profile.display_name ?? '')
    : '';
  const handle = edited ?? suggestion;

  const { status, available } = useHandleAvailability(handle);
  // Own existing handle is always fine — the RPC doesn't exclude auth.uid().
  const isOwnHandle =
    !!profile?.handle && handle === suggestHandle(profile.handle);
  const canContinue = available || isOwnHandle;
  const isError = !isOwnHandle && (status === 'taken' || status === 'error');
  const footer = isOwnHandle ? HELPER_TEXT.available : HELPER_TEXT[status];

  async function handleContinue() {
    if (!canContinue) return;
    setSaveError(null);
    try {
      await updateHandle.mutateAsync(handle);
      router.push(routes.onboarding.watchWith);
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'Could not save handle.');
    }
  }

  return (
    <OnboardingScaffold
      step={3}
      totalSteps={6}
      title="Pick your @handle"
      subtitle="This is how friends find you on Tonight."
      primaryDisabled={!canContinue || updateHandle.isPending}
      primaryLoading={updateHandle.isPending}
      onPrimary={handleContinue}
    >
      <TextInput
        label="Handle"
        value={handle}
        onChangeText={(text) => setEdited(suggestHandle(text))}
        placeholder="yourname"
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="username"
        maxLength={20}
        helper={saveError ? undefined : isError ? undefined : footer}
        error={saveError ?? (isError ? footer : undefined)}
      />
    </OnboardingScaffold>
  );
}
