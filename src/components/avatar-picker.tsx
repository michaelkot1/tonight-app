import { Image } from 'expo-image';
import { useMemo } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { UserAvatar } from '@/components/user-avatar';
import {
  avatarInitial,
  avatarUrlForSelection,
  dicebearFunEmojiUrl,
  dicebearGlassUrl,
  EMOJI_AVATAR_OPTION_COUNT,
  funEmojiAvatarSeeds,
  glassAvatarSeeds,
  GLASS_AVATAR_OPTION_COUNT,
  type AvatarSelection,
} from '@/lib/avatar';
import { colors, spacing } from '@/theme';

const PREVIEW_SIZE = 96;
const OPTION_SIZE = 56;
const OPTION_FONT_SIZE = Math.max(12, Math.round(OPTION_SIZE * 0.4));

interface AvatarPickerProps {
  handle: string;
  selection: AvatarSelection;
  onSelect: (selection: AvatarSelection) => void;
  style?: StyleProp<ViewStyle>;
}

/**
 * Letter monogram (default) + DiceBear glass PNG variants (with a centered
 * initial overlaid) + DiceBear fun-emoji PNG variants (no overlay). All derived
 * from the handle so previews live-update as the user types.
 */
export function AvatarPicker({
  handle,
  selection,
  onSelect,
  style,
}: AvatarPickerProps) {
  const glassSeeds = useMemo(
    () => glassAvatarSeeds(handle, GLASS_AVATAR_OPTION_COUNT),
    [handle],
  );
  const emojiSeeds = useMemo(
    () => funEmojiAvatarSeeds(handle, EMOJI_AVATAR_OPTION_COUNT),
    [handle],
  );

  const previewUri = avatarUrlForSelection(selection, handle, PREVIEW_SIZE * 2);
  const letter = avatarInitial(handle);
  const isLetterSelected = selection.kind === 'letter';

  return (
    <View style={[styles.root, style]}>
      <UserAvatar
        uri={previewUri}
        label={handle}
        size={PREVIEW_SIZE}
        style={styles.preview}
      />

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.options}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ selected: isLetterSelected }}
          accessibilityLabel={`Letter avatar ${letter}`}
          onPress={() => onSelect({ kind: 'letter' })}
          style={[
            styles.option,
            isLetterSelected ? styles.optionSelected : styles.optionIdle,
          ]}
        >
          <View style={styles.optionInner}>
            <ThemedText variant="pill" style={styles.optionLetter}>
              {letter}
            </ThemedText>
          </View>
        </Pressable>

        {glassSeeds.map((seed, index) => {
          const selected =
            selection.kind === 'glass' && selection.index === index;
          const uri = dicebearGlassUrl(seed, OPTION_SIZE * 2);
          return (
            <Pressable
              key={`glass-${seed}-${index}`}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              accessibilityLabel={`Glass avatar option ${index + 1}`}
              onPress={() => onSelect({ kind: 'glass', index })}
              style={[
                styles.option,
                selected ? styles.optionSelected : styles.optionIdle,
              ]}
            >
              <Image
                source={{ uri }}
                style={styles.optionImage}
                contentFit="cover"
                transition={120}
                accessibilityIgnoresInvertColors
              />
              <View style={styles.optionOverlay} pointerEvents="none">
                <ThemedText
                  variant="pill"
                  style={[styles.optionLetter, styles.optionOverlayLetter]}
                >
                  {letter}
                </ThemedText>
              </View>
            </Pressable>
          );
        })}

        {emojiSeeds.map((seed, index) => {
          const selected =
            selection.kind === 'emoji' && selection.index === index;
          const uri = dicebearFunEmojiUrl(seed, OPTION_SIZE * 2);
          return (
            <Pressable
              key={`emoji-${seed}-${index}`}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              accessibilityLabel={`Emoji avatar option ${index + 1}`}
              onPress={() => onSelect({ kind: 'emoji', index })}
              style={[
                styles.option,
                selected ? styles.optionSelected : styles.optionIdle,
              ]}
            >
              <Image
                source={{ uri }}
                style={styles.optionImage}
                contentFit="cover"
                transition={120}
                accessibilityIgnoresInvertColors
              />
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    alignItems: 'center',
    gap: spacing.lg,
  },
  preview: {
    alignSelf: 'center',
  },
  options: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  option: {
    width: OPTION_SIZE,
    height: OPTION_SIZE,
    borderRadius: OPTION_SIZE / 2,
    overflow: 'hidden',
    borderWidth: 2,
    backgroundColor: colors.surface,
  },
  optionIdle: {
    borderColor: colors.border,
  },
  optionSelected: {
    borderColor: colors.accent,
  },
  optionInner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionLetter: {
    color: colors.textPrimary,
    fontSize: 22,
    lineHeight: 26,
  },
  optionImage: {
    width: '100%',
    height: '100%',
  },
  optionOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionOverlayLetter: {
    fontSize: OPTION_FONT_SIZE,
    lineHeight: OPTION_FONT_SIZE + 2,
    textShadowColor: colors.scrim,
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
});
