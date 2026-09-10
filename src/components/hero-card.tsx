import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { type ReactNode } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { tmdbBackdropUrl, tmdbPosterUrl } from '@/lib/titles';
import { colors, radius, spacing } from '@/theme';

interface HeroCardProps {
  title: string;
  posterPath?: string | null;
  backdropPath?: string | null;
  /** Metadata line under the title (e.g. `2024 · Sci-Fi · 2h 8m`). */
  meta?: string;
  /** Muted 12px social proof line (e.g. `Alex & 2 friends loved this`). */
  socialLine?: string;
  /** Overlapping friend avatars rendered beside the social line. */
  friendPile?: ReactNode;
  /** White "Watch" CTA. No-op safe. */
  onWatch?: () => void;
  /** Tap anywhere on the card (e.g. open detail). */
  onPress?: () => void;
  chipLabel?: string;
  style?: StyleProp<ViewStyle>;
}

/**
 * "Tonight's pick" hero — full-bleed artwork (~362×452, r24) with a bottom
 * scrim for legibility, coral pick chip, ExtraBold title, and a white Watch CTA,
 * per design.md "Hero".
 */
export function HeroCard({
  title,
  posterPath,
  backdropPath,
  meta,
  socialLine,
  friendPile,
  onWatch,
  onPress,
  chipLabel = "Tonight's pick",
  style,
}: HeroCardProps) {
  const artUri = tmdbPosterUrl(posterPath, 'w780') ?? tmdbBackdropUrl(backdropPath, 'w780');

  const inner = (
    <View style={[styles.card, style]}>
      {artUri ? (
        <Image
          source={{ uri: artUri }}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          transition={250}
          accessibilityIgnoresInvertColors
        />
      ) : (
        <View style={[StyleSheet.absoluteFill, styles.fallback]} />
      )}

      <LinearGradient
        colors={['transparent', 'rgba(5,5,6,0.35)', 'rgba(5,5,6,0.92)']}
        locations={[0, 0.5, 1]}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />

      <View style={styles.overlay}>
        <View style={styles.chip}>
          <Ionicons name="sparkles" size={13} color={colors.ctaText} />
          <ThemedText variant="pill" style={styles.chipLabel}>
            {chipLabel}
          </ThemedText>
        </View>

        <ThemedText variant="heroTitle" numberOfLines={2} style={styles.title}>
          {title}
        </ThemedText>

        {meta ? (
          <ThemedText variant="metadata" numberOfLines={1} style={styles.meta}>
            {meta}
          </ThemedText>
        ) : null}

        {friendPile || socialLine ? (
          <View style={styles.socialRow}>
            {friendPile}
            {socialLine ? (
              <ThemedText variant="caption" numberOfLines={1} style={styles.social}>
                {socialLine}
              </ThemedText>
            ) : null}
          </View>
        ) : null}

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Watch ${title}`}
          onPress={onWatch}
          style={({ pressed }) => [styles.watch, pressed && styles.pressed]}
        >
          <Ionicons name="play" size={16} color={colors.ctaText} />
          <ThemedText variant="pill" style={styles.watchLabel}>
            Watch
          </ThemedText>
        </Pressable>
      </View>
    </View>
  );

  if (!onPress) return inner;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      onPress={onPress}
      style={({ pressed }) => (pressed ? styles.pressed : undefined)}
    >
      {inner}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    aspectRatio: 362 / 452,
    borderRadius: radius.hero,
    borderCurve: 'continuous',
    overflow: 'hidden',
    backgroundColor: colors.surface,
    justifyContent: 'flex-end',
  },
  fallback: {
    backgroundColor: colors.surface,
  },
  overlay: {
    padding: spacing.xxl,
    gap: spacing.md,
  },
  chip: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.accent,
    borderRadius: radius.full,
    borderCurve: 'continuous',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  chipLabel: {
    color: colors.ctaText,
  },
  title: {
    color: colors.textPrimary,
  },
  meta: {
    color: colors.textPrimary,
    opacity: 0.85,
  },
  socialRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  social: {
    color: colors.textPrimary,
    opacity: 0.9,
    flexShrink: 1,
  },
  watch: {
    alignSelf: 'flex-start',
    marginTop: spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.ctaFill,
    borderRadius: radius.full,
    borderCurve: 'continuous',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm + 2,
  },
  watchLabel: {
    color: colors.ctaText,
  },
  pressed: {
    opacity: 0.9,
  },
});
