import { useRouter } from 'expo-router';
import { useState } from 'react';

import { OnboardingScaffold } from '@/components/onboarding-scaffold';
import { ServiceGrid } from '@/components/service-grid';
import { ThemedText } from '@/components/themed-text';
import { routes } from '@/lib/routes';
import type { StreamingService } from '@/lib/services';
import { useSetUserServices, useUserServices } from '@/hooks/use-user-services';

export function ServicesScreen() {
  const router = useRouter();
  const { data: existing } = useUserServices();
  const setServices = useSetUserServices();

  // `null` until the user interacts — display derives from the saved selection.
  const [edited, setEdited] = useState<StreamingService[] | null>(null);
  const selected = edited ?? existing ?? [];

  function toggle(service: StreamingService) {
    setEdited((current) => {
      const base = current ?? existing ?? [];
      return base.includes(service)
        ? base.filter((s) => s !== service)
        : [...base, service];
    });
  }

  async function handleContinue() {
    try {
      await setServices.mutateAsync(selected);
      router.push(routes.onboarding.tasteSeed);
    } catch {
      // Surfaced inline below; leave selection intact for retry.
    }
  }

  return (
    <OnboardingScaffold
      step={1}
      totalSteps={6}
      title="Which of these do you pay for?"
      subtitle="We'll only suggest what you can actually stream tonight."
      primaryDisabled={selected.length === 0}
      primaryLoading={setServices.isPending}
      onPrimary={handleContinue}
    >
      <ServiceGrid selected={selected} onToggle={toggle} />
      {setServices.isError ? (
        <ThemedText variant="caption">
          Couldn&apos;t save your services. Please try again.
        </ThemedText>
      ) : null}
    </OnboardingScaffold>
  );
}
