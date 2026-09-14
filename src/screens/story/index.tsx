import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import {
  cancelAnimation,
  Easing,
  runOnJS,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SaveControl } from '@/components/bookmark-button';
import { ThemedText } from '@/components/themed-text';
import { useCategoryFeed, useTitle, type TitleSearchResult } from '@/hooks/use-titles';
import { getCategoryBySlug, type BrowseCategory } from '@/lib/categories';
import { routes } from '@/lib/routes';
import {
  displayRating,
  formatStoryMeta,
  parseProviders,
  tmdbBackdropUrl,
  tmdbPosterUrl,
} from '@/lib/titles';
import { colors, radius, spacing } from '@/theme';

import { StoryProgressBar } from './story-progress-bar';

const STORY_DURATION_MS = 5000;

/** Route entry: resolves the category, then mounts the viewer (or bails). */
export function StoryScreen() {
  const { category: slug } = useLocalSearchParams<{ category: string }>();
  const router = useRouter();
  const category = getCategoryBySlug(slug);

  useEffect(() => {
    if (!category) router.back();
  }, [category, router]);

  if (!category) return null;
  return <StoryViewer category={category} />;
}

function StoryViewer({ category }: { category: BrowseCategory }) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { data, isLoading } = useCategoryFeed(category);
  const items = useMemo(() => data ?? [], [data]);

  const [index, setIndex] = useState(0);
  // Hold-to-pause (drives the "Paused" hint). Tracked separately from focus.
  const [holdPaused, setHoldPaused] = useState(false);
  // Focus-pause: false while the detail sheet (or anything) is over the story.
  const [focused, setFocused] = useState(true);
  const progress = useSharedValue(0);

  const count = items.length;
  const hasItems = count > 0;

  const goNext = useCallback(() => {
    setIndex((current) => {
      if (current + 1 < count) return current + 1;
      router.back();
      return current;
    });
  }, [count, router]);

  const handleComplete = useCallback(() => {
    goNext();
  }, [goNext]);

  const startTimer = useCallback(
    (from: number) => {
      cancelAnimation(progress);
      // Reanimated's imperative shared-value API clashes with the React
      // Compiler immutability rule; these writes are intentional and safe.
      /* eslint-disable react-hooks/immutability */
      progress.value = from;
      progress.value = withTiming(
        1,
        { duration: STORY_DURATION_MS * (1 - from), easing: Easing.linear },
        (finished) => {
          if (finished) runOnJS(handleComplete)();
        },
      );
      /* eslint-enable react-hooks/immutability */
    },
    [progress, handleComplete],
  );

  const goPrevOrRestart = useCallback(() => {
    if (progress.value > 0.15 || index === 0) {
      startTimer(0);
    } else {
      setIndex(index - 1);
    }
  }, [progress, startTimer, index]);

  // (a) Slide change / first load → run the active segment from the start.
  useEffect(() => {
    if (hasItems) startTimer(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, hasItems]);

  // (b) Pause on blur (detail sheet) or hold; resume from the captured point.
  useEffect(() => {
    if (!hasItems) return;
    if (focused && !holdPaused) {
      startTimer(progress.value);
    } else {
      cancelAnimation(progress);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focused, holdPaused, hasItems]);

  // Flip focus state so effect (b) can pause/resume. Stable setter → no churn.
  useFocusEffect(
    useCallback(() => {
      setFocused(true);
      return () => setFocused(false);
    }, []),
  );

  // Best-effort keyboard controls (web / hardware keyboards only).
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowRight') goNext();
      else if (event.key === 'ArrowLeft') goPrevOrRestart();
      else if (event.key === 'Escape') router.back();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [goNext, goPrevOrRestart, router]);

  // Each GestureDetector needs its own gesture instances, so build a fresh
  // hold-to-pause long-press per zone rather than sharing one object.
  const makeLongPress = useCallback(
    () =>
      Gesture.LongPress()
        .minDuration(200)
        .maxDistance(9999)
        .onStart(() => runOnJS(setHoldPaused)(true))
        .onFinalize(() => runOnJS(setHoldPaused)(false)),
    [],
  );

  const leftGesture = useMemo(
    () =>
      Gesture.Exclusive(
        makeLongPress(),
        Gesture.Tap().onEnd(() => runOnJS(goPrevOrRestart)()),
      ),
    [makeLongPress, goPrevOrRestart],
  );

  const rightGesture = useMemo(
    () =>
      Gesture.Exclusive(
        makeLongPress(),
        Gesture.Tap().onEnd(() => runOnJS(goNext)()),
      ),
    [makeLongPress, goNext],
  );

  if (isLoading) {
    return (
      <GestureHandlerRootView style={styles.root}>
        <CloseButton insetTop={insets.top} onPress={() => router.back()} />
        <View style={styles.centered}>
          <ActivityIndicator color={colors.textMuted} />
        </View>
      </GestureHandlerRootView>
    );
  }

  const item = items[index];
  if (!item) {
    return (
      <GestureHandlerRootView style={styles.root}>
        <CloseButton insetTop={insets.top} onPress={() => router.back()} />
        <View style={styles.centered}>
          <ThemedText variant="metadata">Nothing here yet.</ThemedText>
        </View>
      </GestureHandlerRootView>
    );
  }

  const artUri =
    tmdbBackdropUrl(item.backdrop_path, 'w1280') ?? tmdbPosterUrl(item.poster_path, 'w780');

  return (
    <GestureHandlerRootView style={styles.root}>
      {artUri ? (
        <Image
          source={{ uri: artUri }}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          transition={250}
          accessibilityIgnoresInvertColors
        />
      ) : (
        <View style={[StyleSheet.absoluteFill, styles.artFallback]} />
      )}

      <LinearGradient
        colors={['rgba(5,5,6,0.6)', 'transparent']}
        style={[styles.topScrim, { height: (insets.top + 120) }]}
        pointerEvents="none"
      />
      <LinearGradient
        colors={['transparent', 'rgba(5,5,6,0.85)', colors.bg]}
        locations={[0, 0.6, 1]}
        style={styles.bottomScrim}
        pointerEvents="none"
      />

      {/* Tap / hold zones over the media area (below header, above buttons). */}
      <View style={[styles.zones, { top: insets.top + 56 }]} pointerEvents="box-none">
        <GestureDetector gesture={leftGesture}>
          <View style={styles.leftZone} />
        </GestureDetector>
        <GestureDetector gesture={rightGesture}>
          <View style={styles.rightZone} />
        </GestureDetector>
      </View>

      {/* Top bar: progress segments + category label + close. */}
      <View style={[styles.topBar, { paddingTop: insets.top + spacing.sm }]}>
        <StoryProgressBar count={items.length} index={index} progress={progress} />
        <View style={styles.topRow}>
          <ThemedText variant="caption" style={styles.categoryLabel}>
            {category.label}
          </ThemedText>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close"
            hitSlop={12}
            onPress={() => router.back()}
          >
            <Ionicons name="close" size={26} color={colors.textPrimary} />
          </Pressable>
        </View>
      </View>

      <StoryOverlay item={item} insets={insets} onViewDetails={() => router.push(routes.title(item.id))} />

      {holdPaused ? (
        <View style={styles.pausedPill} pointerEvents="none">
          <ThemedText variant="caption">Paused</ThemedText>
        </View>
      ) : null}
    </GestureHandlerRootView>
  );
}

/** Bottom overlay for the current slide; enriches via `useTitle`. */
function StoryOverlay({
  item,
  insets,
  onViewDetails,
}: {
  item: TitleSearchResult;
  insets: { bottom: number };
  onViewDetails: () => void;
}) {
  const { data: enriched } = useTitle(item.id);

  const titleText = enriched?.title ?? item.title;
  const rating = displayRating(
    enriched ?? { imdb_rating: null, tmdb_rating: item.tmdb_rating },
  );
  const meta = enriched
    ? formatStoryMeta(enriched)
    : formatStoryMeta({
        release_date: item.release_date,
        runtime: item.runtime ?? null,
        genres: item.genres ?? null,
      });
  const synopsis = enriched?.overview ?? item.overview;

  const providerNames = useMemo(() => {
    if (!enriched) return [];
    const providers = parseProviders(enriched.providers);
    const seen = new Set<string>();
    const names: string[] = [];
    for (const list of [providers.flatrate, providers.free, providers.ads]) {
      for (const provider of list) {
        if (seen.has(provider.provider_name)) continue;
        seen.add(provider.provider_name);
        names.push(provider.provider_name);
        if (names.length >= 4) return names;
      }
    }
    return names;
  }, [enriched]);

  return (
    <View
      style={[
        styles.overlay,
        { paddingBottom: insets.bottom + spacing.xl },
      ]}
    >
      {rating !== null ? (
        <View style={styles.ratingRow}>
          <Ionicons name="star" size={14} color={colors.rating} />
          <ThemedText variant="caption" style={styles.ratingText}>
            {rating.toFixed(1)}
          </ThemedText>
        </View>
      ) : null}

      <ThemedText variant="heroTitle" numberOfLines={2}>
        {titleText}
      </ThemedText>

      {meta ? (
        <ThemedText variant="metadata" numberOfLines={1}>
          {meta}
        </ThemedText>
      ) : null}

      {synopsis ? (
        <ThemedText variant="body" numberOfLines={4} style={styles.synopsis}>
          {synopsis}
        </ThemedText>
      ) : null}

      {providerNames.length > 0 ? (
        <View style={styles.providerChips}>
          {providerNames.map((name) => (
            <View key={name} style={styles.providerChip}>
              <ThemedText variant="caption" style={styles.providerChipText}>
                {name}
              </ThemedText>
            </View>
          ))}
        </View>
      ) : null}

      <View style={styles.actionRow}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="View details"
          onPress={onViewDetails}
          style={({ pressed }) => [styles.detailsPill, pressed && styles.pressed]}
        >
          <Ionicons name="information-circle-outline" size={18} color={colors.ctaText} />
          <ThemedText variant="pill">View details</ThemedText>
        </Pressable>
        <View style={styles.saveSlot}>
          <SaveControl titleId={item.id} size="md" />
        </View>
      </View>
    </View>
  );
}

function CloseButton({ insetTop, onPress }: { insetTop: number; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Close"
      hitSlop={12}
      onPress={onPress}
      style={[styles.floatingClose, { top: insetTop + spacing.sm }]}
    >
      <Ionicons name="close" size={26} color={colors.textPrimary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  artFallback: {
    backgroundColor: colors.surface,
  },
  topScrim: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  bottomScrim: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '55%',
  },
  zones: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
  },
  leftZone: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: '35%',
  },
  rightZone: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: '65%',
  },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    gap: spacing.sm,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.inset,
  },
  categoryLabel: {
    color: colors.textPrimary,
  },
  overlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: spacing.inset,
    gap: spacing.md,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  ratingText: {
    color: colors.rating,
    fontVariant: ['tabular-nums'],
  },
  synopsis: {
    opacity: 0.85,
    lineHeight: 21,
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
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.xs,
  },
  detailsPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.ctaFill,
    borderRadius: radius.full,
    borderCurve: 'continuous',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  saveSlot: {
    marginLeft: 'auto',
  },
  pressed: {
    opacity: 0.85,
  },
  floatingClose: {
    position: 'absolute',
    right: spacing.inset,
    zIndex: 2,
  },
  pausedPill: {
    position: 'absolute',
    alignSelf: 'center',
    top: '48%',
    backgroundColor: colors.badgeBg,
    borderRadius: radius.full,
    borderCurve: 'continuous',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
});
