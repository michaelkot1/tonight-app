import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { OnboardingScaffold } from '@/components/onboarding-scaffold';
import { SaveControl } from '@/components/bookmark-button';
import { RatingControl } from '@/components/rating-control';
import { ThemedText } from '@/components/themed-text';
import { useRateTitle, usePopularTitles, type TitleSearchResult } from '@/hooks/use-titles';
import { routes } from '@/lib/routes';
import { releaseYear, tmdbPosterUrl, type Verdict } from '@/lib/titles';
import { colors, radius, spacing } from '@/theme';

const SEED_COUNT = 8;

const MEDIA_LABEL: Record<TitleSearchResult['media_type'], string> = {
  movie: 'Movie',
  tv: 'TV',
};

export function TasteSeedScreen() {
  const router = useRouter();
  const { data: popular, isLoading, isError } = usePopularTitles('all');
  const rateTitle = useRateTitle();

  // Local verdict map so the UI reflects taps immediately; each change is also
  // persisted through `useRateTitle` (upsert on user_id + title_id).
  const [verdicts, setVerdicts] = useState<Record<string, Verdict>>({});

  const seeds = (popular ?? []).slice(0, SEED_COUNT);
  const ratedCount = Object.keys(verdicts).length;

  function rate(titleId: string, verdict: Verdict | null) {
    setVerdicts((current) => {
      const next = { ...current };
      if (verdict === null) {
        delete next[titleId];
      } else {
        next[titleId] = verdict;
      }
      return next;
    });
    rateTitle.mutate({ titleId, verdict });
  }

  function advance() {
    router.push(routes.onboarding.handle);
  }

  return (
    <OnboardingScaffold
      step={2}
      totalSteps={6}
      title="Teach Tonight your taste"
      subtitle="Rate a few you've seen so your picks feel personal from day one."
      primaryLabel="Continue"
      primaryDisabled={ratedCount === 0}
      onPrimary={advance}
      onSkip={advance}
      skipLabel="Skip for now"
    >
      {isLoading ? (
        <View style={styles.stateBox}>
          <ActivityIndicator color={colors.textMuted} />
        </View>
      ) : isError || seeds.length === 0 ? (
        <View style={styles.stateBox}>
          <ThemedText variant="metadata" style={styles.stateText}>
            Couldn&apos;t load titles right now. You can skip and personalize later.
          </ThemedText>
        </View>
      ) : (
        seeds.map((title) => (
          <SeedRow
            key={title.id}
            title={title}
            value={verdicts[title.id] ?? null}
            disabled={rateTitle.isPending}
            onChange={(verdict) => rate(title.id, verdict)}
          />
        ))
      )}
    </OnboardingScaffold>
  );
}

function SeedRow({
  title,
  value,
  disabled,
  onChange,
}: {
  title: TitleSearchResult;
  value: Verdict | null;
  disabled: boolean;
  onChange: (verdict: Verdict | null) => void;
}) {
  const posterUri = tmdbPosterUrl(title.poster_path, 'w185');
  const meta = [MEDIA_LABEL[title.media_type], releaseYear(title.release_date)]
    .filter(Boolean)
    .join(' · ');

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.thumb}>
          {posterUri ? (
            <Image
              source={{ uri: posterUri }}
              style={styles.thumbImage}
              contentFit="cover"
              transition={150}
              accessibilityIgnoresInvertColors
            />
          ) : (
            <View style={[styles.thumbImage, styles.thumbFallback]} />
          )}
        </View>
        <View style={styles.cardCopy}>
          <ThemedText variant="cardTitle" numberOfLines={2}>
            {title.title}
          </ThemedText>
          {meta ? (
            <ThemedText variant="metadata" numberOfLines={1}>
              {meta}
            </ThemedText>
          ) : null}
        </View>
        <SaveControl titleId={title.id} size="sm" />
      </View>
      <RatingControl value={value} onChange={onChange} disabled={disabled} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.poster,
    borderCurve: 'continuous',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'center',
  },
  thumb: {
    width: 48,
    height: 72,
    borderRadius: radius.sm,
    borderCurve: 'continuous',
    overflow: 'hidden',
    backgroundColor: colors.shell,
  },
  thumbImage: {
    width: '100%',
    height: '100%',
  },
  thumbFallback: {
    backgroundColor: colors.shell,
  },
  cardCopy: {
    flex: 1,
    gap: spacing.xs,
  },
  stateBox: {
    paddingVertical: spacing.xxxl,
    alignItems: 'center',
    gap: spacing.md,
  },
  stateText: {
    textAlign: 'center',
  },
});
