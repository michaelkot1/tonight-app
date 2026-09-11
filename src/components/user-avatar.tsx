import { Image } from 'expo-image';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { avatarHasLetterOverlay, avatarInitial } from '@/lib/avatar';
import { colors } from '@/theme';

interface UserAvatarProps {
  /** Remote avatar URL; when null/empty, shows letter monogram. */
  uri?: string | null;
  /** Source for the monogram letter (handle preferred). */
  label?: string | null;
  size?: number;
  /** Ring color — design.md: `#22222A` on headers, `#0C0C0F` on media piles. */
  ringColor?: string;
  style?: StyleProp<ViewStyle>;
}

/**
 * Circular avatar: expo-image when `uri` is set, else letter monogram.
 */
export function UserAvatar({
  uri,
  label,
  size = 40,
  ringColor = colors.border,
  style,
}: UserAvatarProps) {
  const radius = size / 2;
  const fontSize = Math.max(12, Math.round(size * 0.4));
  const showLetterOverlay = !!uri && avatarHasLetterOverlay(uri);

  return (
    <View
      style={[
        styles.base,
        {
          width: size,
          height: size,
          borderRadius: radius,
          borderColor: ringColor,
        },
        style,
      ]}
      accessibilityRole="image"
      accessibilityLabel={label ? `Avatar for ${label}` : 'Avatar'}
    >
      {uri ? (
        <>
          <Image
            source={{ uri }}
            style={styles.image}
            contentFit="cover"
            transition={150}
            accessibilityIgnoresInvertColors
          />
          {showLetterOverlay ? (
            <View style={styles.overlay} pointerEvents="none">
              <ThemedText
                variant="pill"
                style={[
                  styles.initial,
                  styles.overlayInitial,
                  { fontSize, lineHeight: fontSize + 2 },
                ]}
              >
                {avatarInitial(label)}
              </ThemedText>
            </View>
          ) : null}
        </>
      ) : (
        <View style={styles.fallback}>
          <ThemedText
            variant="pill"
            style={[styles.initial, { fontSize, lineHeight: fontSize + 2 }]}
          >
            {avatarInitial(label)}
          </ThemedText>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    overflow: 'hidden',
    borderWidth: 2,
    backgroundColor: colors.surface,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  fallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initial: {
    color: colors.textPrimary,
  },
  overlayInitial: {
    // Subtle shadow keeps the monogram legible over any glass gradient.
    textShadowColor: colors.scrim,
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
});
