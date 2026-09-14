import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SaveControl } from '@/components/bookmark-button';
import { FriendPile } from '@/components/friend-pile';
import { HeroCard } from '@/components/hero-card';
import { PosterCard } from '@/components/poster-card';
import { PosterRail } from '@/components/poster-rail';
import { ThemedText } from '@/components/themed-text';
import { UserAvatar } from '@/components/user-avatar';
import { useFriendSocialByTitle } from '@/hooks/use-friends';
import { useProfile } from '@/hooks/use-profile';
import {
  useMyRatings,
  usePopularTitles,
  type MyRating,
  type PopularMediaFilter,
  type TitleSearchResult,
} from '@/hooks/use-titles';
import { routes } from '@/lib/routes';
import { displayRating, parseGenres, releaseYear } from '@/lib/titles';
import { colors, fonts, spacing } from '@/theme';

const MEDIA_LABEL: Record<TitleSearchResult['media_type'], string> = {
  movie: 'Movie',
  tv: 'TV',
};

/** Max-style content-type tabs (not Browse genre chips). */
const HOME_CATEGORIES = [
  { id: 'home', label: 'Home', mediaFilter: 'all' as PopularMediaFilter },
  { id: 'series', label: 'Series', mediaFilter: 'tv' as PopularMediaFilter },
  { id: 'movies', label: 'Movies', mediaFilter: 'movie' as PopularMediaFilter },
] as const;

type HomeCategoryId = (typeof HOME_CATEGORIES)[number]['id'];

export function HomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [categoryId, setCategoryId] = useState<HomeCategoryId>('home');

  const mediaFilter =
    HOME_CATEGORIES.find((c) => c.id === categoryId)?.mediaFilter ?? 'all';

  const { data: profile } = useProfile();
  const { data: popular, isLoading: popularLoading, isError: popularError } =
    usePopularTitles(mediaFilter);
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
    () =>
      (myRatings ?? []).filter(
        (rating): rating is MyRating & { title: NonNullable<MyRating['title']> } =>
          rating.title != null,
      ),
    [myRatings],
  );

  const socialTitleIds = useMemo(() => {
    const ids: string[] = [];
    if (pick) ids.push(pick.id);
    for (const item of popularRail) ids.push(item.id);
    for (const item of exploreTitles) ids.push(item.id);
    for (const item of ratedTitles) ids.push(item.title.id);
    return ids;
  }, [pick, popularRail, exploreTitles, ratedTitles]);

  const { data: socialByTitle } = useFriendSocialByTitle(socialTitleIds);

  function openTitle(id: string) {
    router.push(routes.title(id));
  }

  const pickMeta = pick
    ? [releaseYear(pick.release_date), MEDIA_LABEL[pick.media_type]].filter(Boolean).join(' · ')
    : undefined;
  const pickSocial = pick ? socialByTitle?.get(pick.id) : undefined;
  const avatarLabel = profile?.handle ?? profile?.display_name ?? null;

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
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryRow}
          style={styles.categoryScroll}
        >
          {HOME_CATEGORIES.map((cat) => {
            const active = cat.id === categoryId;
            return (
              <Pressable
                key={cat.id}
                accessibilityRole="tab"
                accessibilityState={{ selected: active }}
                accessibilityLabel={cat.label}
                onPress={() => setCategoryId(cat.id)}
                hitSlop={8}
                style={({ pressed }) => [
                  styles.categoryTab,
                  pressed && styles.pressed,
                ]}
              >
                <ThemedText
                  style={[styles.categoryLabel, active && styles.categoryLabelActive]}
                >
                  {cat.label}
                </ThemedText>
                {active ? <View style={styles.categoryUnderline} /> : null}
              </Pressable>
            );
          })}
        </ScrollView>

        <View style={styles.headerActions}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Saved"
            onPress={() => router.push(routes.saved)}
            hitSlop={12}
            style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
          >
            <Ionicons name="bookmark-outline" size={22} color={colors.textPrimary} />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Profile"
            onPress={() => router.push(routes.profile)}
            hitSlop={12}
            style={({ pressed }) => [pressed && styles.pressed]}
          >
            <UserAvatar
              uri={profile?.avatar_url}
              label={avatarLabel}
              size={40}
              ringColor={colors.border}
            />
          </Pressable>
        </View>
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
            socialLine={pickSocial?.socialLine}
            friendPile={
              pickSocial ? <FriendPile friends={pickSocial.pile} /> : undefined
            }
            action={<SaveControl titleId={pick.id} size="sm" chip />}
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
          renderItem={(item) => {
            const social = socialByTitle?.get(item.id);
            return (
              <PosterCard
                title={item.title}
                posterPath={item.poster_path}
                rating={item.tmdb_rating}
                friendPile={
                  social ? <FriendPile friends={social.pile} /> : undefined
                }
                action={<SaveControl titleId={item.id} size="sm" chip />}
                onPress={() => openTitle(item.id)}
              />
            );
          }}
        />
      ) : null}

      {ratedTitles.length > 0 ? (
        <PosterRail
          title="Your ratings"
          data={ratedTitles}
          keyExtractor={(item) => item.id}
          renderItem={(item) => {
            const social = socialByTitle?.get(item.title.id);
            return (
              <PosterCard
                title={item.title.title}
                posterPath={item.title.poster_path}
                genres={parseGenres(item.title.genres)}
                rating={displayRating(item.title)}
                friendPile={
                  social ? <FriendPile friends={social.pile} /> : undefined
                }
                action={<SaveControl titleId={item.title.id} size="sm" chip />}
                onPress={() => openTitle(item.title.id)}
              />
            );
          }}
        />
      ) : null}

      {exploreTitles.length > 0 ? (
        <PosterRail
          title="More to explore"
          data={exploreTitles}
          keyExtractor={(item) => item.id}
          renderItem={(item) => {
            const social = socialByTitle?.get(item.id);
            return (
              <PosterCard
                title={item.title}
                posterPath={item.poster_path}
                rating={item.tmdb_rating}
                friendPile={
                  social ? <FriendPile friends={social.pile} /> : undefined
                }
                action={<SaveControl titleId={item.id} size="sm" chip />}
                onPress={() => openTitle(item.id)}
              />
            );
          }}
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
    gap: spacing.md,
    paddingLeft: spacing.inset,
    paddingRight: spacing.inset,
  },
  categoryScroll: {
    flexGrow: 0,
    flexShrink: 1,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
  },
  categoryTab: {
    paddingBottom: spacing.xs,
    justifyContent: 'center',
  },
  categoryLabel: {
    fontFamily: fonts.body.medium,
    fontSize: 16,
    color: colors.textMuted,
  },
  categoryLabelActive: {
    fontFamily: fonts.body.semiBold,
    color: colors.textPrimary,
  },
  categoryUnderline: {
    marginTop: spacing.xs,
    height: 2,
    borderRadius: 1,
    backgroundColor: colors.textPrimary,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexShrink: 0,
  },
  iconButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
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
