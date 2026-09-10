import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import type { Verdict } from '@/lib/titles';
import { colors, radius, spacing } from '@/theme';

interface VerdictOption {
  verdict: Verdict;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}

const OPTIONS: VerdictOption[] = [
  { verdict: 'loved', label: 'Loved', icon: 'heart' },
  { verdict: 'liked', label: 'Liked', icon: 'thumbs-up' },
  { verdict: 'meh', label: 'Meh', icon: 'remove' },
];

interface RatingControlProps {
  /** Currently selected verdict (or null / undefined for none). */
  value?: Verdict | null;
  /** Fires with the new verdict, or `null` when the active verdict is toggled off. */
  onChange?: (verdict: Verdict | null) => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

/**
 * Loved / Liked / Meh verdict picker built from theme tokens. Tapping the active
 * verdict again clears it (emits `null`). Selected fills with the coral accent.
 */
export function RatingControl({ value, onChange, disabled = false, style }: RatingControlProps) {
  return (
    <View style={[styles.row, style]} accessibilityRole="radiogroup">
      {OPTIONS.map((option) => {
        const selected = value === option.verdict;
        return (
          <Pressable
            key={option.verdict}
            accessibilityRole="radio"
            accessibilityState={{ selected, disabled }}
            accessibilityLabel={`Rate ${option.label}`}
            disabled={disabled}
            onPress={() => onChange?.(selected ? null : option.verdict)}
            style={({ pressed }) => [
              styles.option,
              selected ? styles.optionSelected : styles.optionIdle,
              pressed && !disabled && styles.pressed,
              disabled && styles.disabled,
            ]}
          >
            <Ionicons
              name={option.icon}
              size={16}
              color={selected ? colors.ctaText : colors.textPrimary}
            />
            <ThemedText
              variant="pill"
              style={selected ? styles.labelSelected : styles.labelIdle}
            >
              {option.label}
            </ThemedText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  option: {
    flex: 1,
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: radius.full,
    borderCurve: 'continuous',
    borderWidth: StyleSheet.hairlineWidth,
  },
  optionIdle: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
  },
  optionSelected: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  pressed: {
    opacity: 0.85,
  },
  disabled: {
    opacity: 0.4,
  },
  labelIdle: {
    color: colors.textPrimary,
  },
  labelSelected: {
    color: colors.ctaText,
  },
});
