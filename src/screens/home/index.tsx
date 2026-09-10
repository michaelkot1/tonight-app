import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { HeroCard } from '@/components/hero-card';
import { PosterCard } from '@/components/poster-card';
import { PosterRail } from '@/components/poster-rail';
import { ThemedText } from '@/components/themed-text';
import {
  useMyRatings,
  usePopularTitles,
  type MyRating,
  type TitleSearchResult,
} from '@/hooks/use-titles';
import { routes } from '@/lib/routes';
import { displayRating, parseGenres, releaseYear } from '@/lib/titles';
import { colors, spacing } from '@/theme';

const MEDIA_LABEL: Record<TitleSearchResult['media_type'], string> = {
  movie: 'Movie',
  tv: 'TV',
};

export function HomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const { data: popular, isLoading: popularLoading, isError: popularError } =
    usePopularTitles('all');
  const { data: myRatings } = useMyRatings();

  const results = popular ?? [];

  // Interim Tonight's pick: top trending title. Provider-based service filtering
  // needs enriched rows (providers), which the lightweight popular feed omits, so
  // we fall back to the highest-ranked available title until the Decider lands.
  const pick = results[0] ?? null;
  const railTitles = pick ? results.slice(1) : results;
  const exploreTitles = railTitles.slice(8);
  const popularRail = railTitles.slice(0, 8);

  const ratedTitles = useMemo(
    () => (myRatings ?? []).filter((rating): rating is MyRating & { title: NonNullable<MyRating['title']> } =>
      rating.title != null,
    ),
    [myRatings],
  );

  function openTitle(id: string) {
    router.push(routes.title(id));
  }

  const pickMeta = pick
    ? [releaseYear(pick.release_date), MEDIA_LABEL[pick.media_type]].filter(Boolean).join(' · ')
    : undefined;

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={[
        styles.content,
        {
          paddingTop: insets.top + spacing.header,
          paddingBottom: spacing.navContent,
        },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <ThemedText variant="screenTitle">For You</ThemedText>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Search titles"
          onPress={() => router.push(routes.search)}
          hitSlop={12}
          style={({ pressed }) => [styles.searchButton, pressed && styles.pressed]}
        >
          <Ionicons name="search" size={20} color={colors.textPrimary} />
        </Pressable>
      </View>

      <View style={styles.heroSlot}>
        {popularLoading ? (
          <View style={styles.heroPlaceholder}>
            <ActivityIndicator color={colors.textMuted} />
          </View>
        ) : pick ? (
          <HeroCard
            title={pick.title}
            posterPath={pick.poster_path}
            backdropPath={pick.backdrop_path}
            meta={pickMeta}
            onPress={() => openTitle(pick.id)}
            onWatch={() => openTitle(pick.id)}
          />
        ) : (
          <View style={styles.heroPlaceholder}>
            <ThemedText variant="sectionRail">{"Tonight's pick"}</ThemedText>
            <ThemedText variant="caption" style={styles.muted}>
              {popularError
                ? "Couldn't load picks right now. Pull to refresh soon."
                : 'Rate a few titles to unlock your picks.'}
            </ThemedText>
          </View>
        )}
      </View>

      {popularRail.length > 0 ? (
        <PosterRail
          title="Popular now"
          data={popularRail}
          keyExtractor={(item) => item.id}
          renderItem={(item) => (
            <PosterCard
              title={item.title}
              posterPath={item.poster_path}
              rating={item.tmdb_rating}
              onPress={() => openTitle(item.id)}
            />
          )}
        />
      ) : null}

      {ratedTitles.length > 0 ? (
        <PosterRail
          title="Your ratings"
          data={ratedTitles}
          keyExtractor={(item) => item.id}
          renderItem={(item) => (
            <PosterCard
              title={item.title.title}
              posterPath={item.title.poster_path}
              genres={parseGenres(item.title.genres)}
              rating={displayRating(item.title)}
              onPress={() => openTitle(item.title.id)}
            />
          )}
        />
      ) : null}

      {exploreTitles.length > 0 ? (
        <PosterRail
          title="More to explore"
          data={exploreTitles}
          keyExtractor={(item) => item.id}
          renderItem={(item) => (
            <PosterCard
              title={item.title}
              posterPath={item.poster_path}
              rating={item.tmdb_rating}
              onPress={() => openTitle(item.id)}
            />
          )}
        />
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  content: {
    gap: spacing.rail,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.inset,
  },
  searchButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  heroSlot: {
    paddingHorizontal: spacing.inset,
  },
  heroPlaceholder: {
    width: '100%',
    aspectRatio: 362 / 452,
    borderRadius: 24,
    borderCurve: 'continuous',
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: spacing.xxl,
    justifyContent: 'flex-end',
    gap: spacing.sm,
  },
  muted: {
    color: colors.textMuted,
  },
  pressed: {
    opacity: 0.7,
  },
});
