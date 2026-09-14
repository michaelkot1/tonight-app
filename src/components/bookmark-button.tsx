import { Ionicons } from '@expo/vector-icons';
import { useMemo } from 'react';
import {
  Pressable,
  StyleSheet,
  type GestureResponderEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { useMySaves, useToggleSave } from '@/hooks/use-titles';
import { colors, radius } from '@/theme';

type BookmarkSize = 'sm' | 'md';

interface BookmarkButtonProps {
  saved: boolean;
  onPress?: () => void;
  disabled?: boolean;
  size?: BookmarkSize;
  /** Dimmed circular chip behind the icon (poster/hero overlays). */
  chip?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}

const ICON_SIZE: Record<BookmarkSize, number> = {
  sm: 18,
  md: 22,
};

/**
 * Presentational bookmark control. Outline when unsaved, filled when saved.
 * Stops propagation so nested use on cards does not open title detail.
 */
export function BookmarkButton({
  saved,
  onPress,
  disabled = false,
  size = 'md',
  chip = false,
  style,
  accessibilityLabel,
}: BookmarkButtonProps) {
  function handlePress(event: GestureResponderEvent) {
    event.stopPropagation?.();
    onPress?.();
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: saved, disabled }}
      accessibilityLabel={
        accessibilityLabel ?? (saved ? 'Remove from saved' : 'Save for later')
      }
      disabled={disabled}
      hitSlop={10}
      onPress={handlePress}
      style={({ pressed }) => [
        chip ? styles.chip : styles.bare,
        pressed && !disabled && styles.pressed,
        disabled && styles.disabled,
        style,
      ]}
    >
      <Ionicons
        name={saved ? 'bookmark' : 'bookmark-outline'}
        size={ICON_SIZE[size]}
        color={saved ? colors.accent : colors.textPrimary}
      />
    </Pressable>
  );
}

interface SaveControlProps {
  titleId: string;
  size?: BookmarkSize;
  chip?: boolean;
  style?: StyleProp<ViewStyle>;
}

/**
 * Wired bookmark control: reads `useMySaves` and toggles via `useToggleSave`.
 */
export function SaveControl({ titleId, size = 'md', chip = false, style }: SaveControlProps) {
  const { data: saves } = useMySaves();
  const toggleSave = useToggleSave();

  const saved = useMemo(
    () => saves?.some((row) => row.title?.id === titleId) ?? false,
    [saves, titleId],
  );

  return (
    <BookmarkButton
      saved={saved}
      size={size}
      chip={chip}
      style={style}
      disabled={toggleSave.isPending || !titleId}
      onPress={() => toggleSave.mutate({ titleId, saved: !saved })}
    />
  );
}

const styles = StyleSheet.create({
  bare: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chip: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.full,
    borderCurve: 'continuous',
    backgroundColor: colors.badgeBg,
  },
  pressed: {
    opacity: 0.85,
  },
  disabled: {
    opacity: 0.4,
  },
});
