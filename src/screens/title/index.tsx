import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { RatingControl } from '@/components/rating-control';
import { ThemedText } from '@/components/themed-text';
import { useMyRatings, useRateTitle, useTitle } from '@/hooks/use-titles';
import {
  formatGenreMeta,
  parseGenres,
  parseProviders,
  releaseYear,
  tmdbBackdropUrl,
  tmdbPosterUrl,
  type Title,
  type Verdict,
} from '@/lib/titles';
import { colors, radius, spacing } from '@/theme';

interface ScoreItem {
  label: string;
  value: string;
}

function buildScores(title: Title): ScoreItem[] {
  const scores: ScoreItem[] = [];
  if (typeof title.imdb_rating === 'number') {
    scores.push({ label: 'IMDb', value: title.imdb_rating.toFixed(1) });
  }
  if (typeof title.rt_rating === 'number') {
    scores.push({ label: 'Rotten Tomatoes', value: `${title.rt_rating}%` });
  }
  if (typeof title.tmdb_rating === 'number') {
    scores.push({ label: 'TMDB', value: title.tmdb_rating.toFixed(1) });
  }
  return scores;
}

export function TitleDetailScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const { data: title, isLoading, isError, refetch } = useTitle(id);
  const { data: myRatings } = useMyRatings();
  const rateTitle = useRateTitle();

  const currentVerdict = useMemo<Verdict | null>(() => {
    const match = myRatings?.find((rating) => rating.title?.id === id);
    return match?.verdict ?? null;
  }, [myRatings, id]);

  function handleRate(verdict: Verdict | null) {
    if (!id) return;
    rateTitle.mutate({ titleId: id, verdict });
  }

  if (isLoading) {
    return (
      <View style={[styles.root, styles.centered]}>
        <ActivityIndicator color={colors.textMuted} />
      </View>
    );
  }

  if (isError || !title) {
    return (
      <View style={[styles.root, styles.centered, { paddingTop: insets.top }]}>
        <BackButton onPress={() => router.back()} floating insetTop={insets.top} />
        <ThemedText variant="metadata" style={styles.stateText}>
          {isError ? "Couldn't load this title." : 'Title not found.'}
        </ThemedText>
        {isError ? (
          <Pressable accessibilityRole="button" onPress={() => refetch()}>
            <ThemedText variant="pill" style={styles.retry}>
              Try again
            </ThemedText>
          </Pressable>
        ) : null}
      </View>
    );
  }

  const genres = parseGenres(title.genres);
  const genreMeta = formatGenreMeta(genres, 3);
  const year = releaseYear(title.release_date);
  const mediaLabel = title.media_type === 'tv' ? 'TV' : 'Movie';
  const metaLine = [year, mediaLabel, genreMeta].filter(Boolean).join(' · ');
  const scores = buildScores(title);

  const providers = parseProviders(title.providers);
  const streamNames = dedupeNames(providers.flatrate, providers.free, providers.ads);
  const rentNames = dedupeNames(providers.rent, providers.buy);

  const artUri =
    tmdbBackdropUrl(title.backdrop_path, 'w1280') ?? tmdbPosterUrl(title.poster_path, 'w780');

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + spacing.xxxl }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hero}>
          {artUri ? (
            <Image
              source={{ uri: artUri }}
              style={StyleSheet.absoluteFill}
              contentFit="cover"
              transition={250}
              accessibilityIgnoresInvertColors
            />
          ) : (
            <View style={[StyleSheet.absoluteFill, styles.heroFallback]} />
          )}
          <LinearGradient
            colors={['rgba(5,5,6,0.2)', 'transparent', colors.bg]}
            locations={[0, 0.45, 1]}
            style={StyleSheet.absoluteFill}
            pointerEvents="none"
          />
          <BackButton onPress={() => router.back()} floating insetTop={insets.top} />
        </View>

        <View style={styles.body}>
          <ThemedText variant="heroTitle" style={styles.title}>
            {title.title}
          </ThemedText>
          {metaLine ? (
            <ThemedText variant="metadata" style={styles.meta}>
              {metaLine}
            </ThemedText>
          ) : null}

          {scores.length > 0 ? (
            <View style={styles.scoreRow}>
              {scores.map((score) => (
                <View key={score.label} style={styles.scoreChip}>
                  <Ionicons name="star" size={12} color={colors.rating} />
                  <ThemedText variant="caption" style={styles.scoreValue}>
                    {score.value}
                  </ThemedText>
                  <ThemedText variant="caption" style={styles.scoreLabel}>
                    {score.label}
                  </ThemedText>
                </View>
              ))}
            </View>
          ) : null}

          <View style={styles.rateBlock}>
            <ThemedText variant="sectionRail">Your rating</ThemedText>
            <RatingControl
              value={currentVerdict}
              onChange={handleRate}
              disabled={rateTitle.isPending}
            />
          </View>

          {title.overview ? (
            <View style={styles.section}>
              <ThemedText variant="sectionRail">Overview</ThemedText>
              <ThemedText variant="body" style={styles.overview}>
                {title.overview}
              </ThemedText>
            </View>
          ) : null}

          {streamNames.length > 0 || rentNames.length > 0 ? (
            <View style={styles.section}>
              <ThemedText variant="sectionRail">Where to watch</ThemedText>
              {streamNames.length > 0 ? (
                <ProviderGroup label="Streaming" names={streamNames} />
              ) : null}
              {rentNames.length > 0 ? (
                <ProviderGroup label="Rent or buy" names={rentNames} />
              ) : null}
            </View>
          ) : (
            <View style={styles.section}>
              <ThemedText variant="sectionRail">Where to watch</ThemedText>
              <ThemedText variant="metadata">
                No US streaming info available.
              </ThemedText>
            </View>
          )}

          {title.director ? (
            <View style={styles.section}>
              <ThemedText variant="sectionRail">
                {title.media_type === 'tv' ? 'Created by' : 'Director'}
              </ThemedText>
              <ThemedText variant="metadata">{title.director}</ThemedText>
            </View>
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
}

function ProviderGroup({ label, names }: { label: string; names: string[] }) {
  return (
    <View style={styles.providerGroup}>
      <ThemedText variant="caption" style={styles.providerGroupLabel}>
        {label}
      </ThemedText>
      <View style={styles.providerChips}>
        {names.map((name) => (
          <View key={name} style={styles.providerChip}>
            <ThemedText variant="caption" style={styles.providerChipText}>
              {name}
            </ThemedText>
          </View>
        ))}
      </View>
    </View>
  );
}

function BackButton({
  onPress,
  floating,
  insetTop,
}: {
  onPress: () => void;
  floating?: boolean;
  insetTop: number;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Back"
      onPress={onPress}
      hitSlop={12}
      style={({ pressed }) => [
        styles.back,
        floating && [styles.backFloating, { top: insetTop + spacing.sm }],
        pressed && styles.backPressed,
      ]}
    >
      <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
    </Pressable>
  );
}

/** Collect unique provider display names across multiple provider lists. */
function dedupeNames(...lists: { provider_name: string }[][]): string[] {
  const seen = new Set<string>();
  const names: string[] = [];
  for (const list of lists) {
    for (const provider of list) {
      if (seen.has(provider.provider_name)) continue;
      seen.add(provider.provider_name);
      names.push(provider.provider_name);
    }
  }
  return names;
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.inset,
  },
  hero: {
    width: '100%',
    aspectRatio: 3 / 4,
    backgroundColor: colors.surface,
  },
  heroFallback: {
    backgroundColor: colors.surface,
  },
  body: {
    paddingHorizontal: spacing.inset,
    marginTop: -spacing.xxxl,
    gap: spacing.lg,
  },
  title: {
    color: colors.textPrimary,
  },
  meta: {
    marginTop: -spacing.sm,
  },
  scoreRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  scoreChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.surface,
    borderRadius: radius.full,
    borderCurve: 'continuous',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  scoreValue: {
    color: colors.textPrimary,
    fontVariant: ['tabular-nums'],
  },
  scoreLabel: {
    color: colors.textMuted,
  },
  rateBlock: {
    gap: spacing.md,
  },
  section: {
    gap: spacing.sm,
  },
  overview: {
    color: colors.textPrimary,
    opacity: 0.85,
    lineHeight: 21,
  },
  providerGroup: {
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  providerGroupLabel: {
    color: colors.textMuted,
  },
  providerChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  providerChip: {
    backgroundColor: colors.shell,
    borderRadius: radius.full,
    borderCurve: 'continuous',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  providerChipText: {
    color: colors.textPrimary,
  },
  stateText: {
    textAlign: 'center',
  },
  retry: {
    color: colors.accent,
  },
  back: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backFloating: {
    position: 'absolute',
    left: spacing.inset,
    borderRadius: radius.full,
    backgroundColor: colors.badgeBg,
  },
  backPressed: {
    opacity: 0.7,
  },
});
