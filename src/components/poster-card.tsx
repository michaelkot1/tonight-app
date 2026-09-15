import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { type ReactNode } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { formatGenreMeta, tmdbPosterUrl, type TitleGenre } from '@/lib/titles';
import { colors, radius, spacing } from '@/theme';

export const POSTER_CARD_WIDTH = 160;
const POSTER_CARD_HEIGHT = 240;

interface PosterCardProps {
  title: string;
  posterPath?: string | null;
  genres?: TitleGenre[];
  /** Gold rating badge score (IMDb or TMDB), top-right. Hidden when null. */
  rating?: number | null;
  onPress?: () => void;
  /** Overlay slot for overlapping friend avatars, bottom-left on the artwork. */
  friendPile?: ReactNode;
  /** Overlay action (e.g. bookmark), top-left on the artwork. */
  action?: ReactNode;
  style?: StyleProp<ViewStyle>;
}

/**
 * 160×240 poster tile (r16 image well) with title + `Genre · Genre` meta below,
 * a gold rating badge top-right, and an optional friend pile overlay — per
 * design.md "Poster rail cards".
 */
export function PosterCard({
  title,
  posterPath,
  genres,
  rating,
  onPress,
  friendPile,
  action,
  style,
}: PosterCardProps) {
  const meta = genres && genres.length > 0 ? formatGenreMeta(genres) : null;
  const posterUri = tmdbPosterUrl(posterPath);
  const showRating = typeof rating === 'number';

  const content = (
    <View style={[styles.card, style]}>
      <View style={styles.well}>
        {posterUri ? (
          <Image
            source={{ uri: posterUri }}
            style={styles.image}
            contentFit="cover"
            transition={200}
            accessibilityIgnoresInvertColors
          />
        ) : (
          <View style={[styles.image, styles.imageFallback]}>
            <ThemedText variant="caption" numberOfLines={3} style={styles.fallbackText}>
              {title}
            </ThemedText>
          </View>
        )}

        {action ? <View style={styles.action}>{action}</View> : null}

        {showRating ? (
          <View style={styles.badge}>
            <Ionicons name="star" size={11} color={colors.rating} />
            <ThemedText variant="caption" style={styles.badgeText}>
              {rating!.toFixed(1)}
            </ThemedText>
          </View>
        ) : null}

        {friendPile ? <View style={styles.friendPile}>{friendPile}</View> : null}
      </View>

      <ThemedText variant="cardTitle" numberOfLines={1}>
        {title}
      </ThemedText>
      {meta ? (
        <ThemedText variant="metadata" numberOfLines={1}>
          {meta}
        </ThemedText>
      ) : null}
    </View>
  );

  if (!onPress) return content;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      onPress={onPress}
      style={({ pressed }) => (pressed ? styles.pressed : undefined)}
    >
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    width: POSTER_CARD_WIDTH,
    gap: spacing.sm,
  },
  well: {
    width: POSTER_CARD_WIDTH,
    height: POSTER_CARD_HEIGHT,
    borderRadius: radius.poster,
    borderCurve: 'continuous',
    overflow: 'hidden',
    backgroundColor: colors.surface,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imageFallback: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
  },
  fallbackText: {
    textAlign: 'center',
    color: colors.textMuted,
  },
  action: {
    position: 'absolute',
    top: spacing.sm,
    left: spacing.sm,
    zIndex: 2,
  },
  badge: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.full,
    borderCurve: 'continuous',
    backgroundColor: colors.badgeBg,
  },
  badgeText: {
    color: colors.rating,
    fontVariant: ['tabular-nums'],
  },
  friendPile: {
    position: 'absolute',
    left: spacing.sm,
    bottom: spacing.sm,
  },
  pressed: {
    opacity: 0.85,
  },
});
