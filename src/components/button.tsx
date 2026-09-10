import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  View,
  type PressableProps,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { colors, radius, shadows, spacing, type } from '@/theme';

type ButtonVariant = 'primary' | 'secondary' | 'ghost';

interface ButtonProps extends Omit<PressableProps, 'children' | 'style'> {
  label: string;
  variant?: ButtonVariant;
  loading?: boolean;
  disabled?: boolean;
}

/**
 * Themed pill button. `primary` is the white CTA from design.md; `secondary` is a
 * bordered surface tile; `ghost` is chromeless (for "skip"-style low-emphasis actions).
 */
export function Button({
  label,
  variant = 'primary',
  loading = false,
  disabled = false,
  ...props
}: ButtonProps) {
  const isDisabled = disabled || loading;
  const spinnerColor =
    variant === 'primary' ? colors.ctaText : colors.textPrimary;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        variant === 'primary' && styles.primary,
        variant === 'secondary' && styles.secondary,
        variant === 'ghost' && styles.ghost,
        pressed && !isDisabled && styles.pressed,
        isDisabled && styles.disabled,
      ]}
      {...props}
    >
      <View style={styles.content}>
        {loading ? (
          <ActivityIndicator color={spinnerColor} />
        ) : (
          <ThemedText
            variant="pill"
            style={[
              variant === 'primary' ? styles.primaryLabel : styles.altLabel,
              variant === 'ghost' && styles.ghostLabel,
            ]}
          >
            {label}
          </ThemedText>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 52,
    borderRadius: radius.full,
    borderCurve: 'continuous',
    paddingHorizontal: spacing.xxl,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  primary: {
    backgroundColor: colors.ctaFill,
    boxShadow: shadows.card,
  },
  secondary: {
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  ghost: {
    backgroundColor: 'transparent',
  },
  pressed: {
    opacity: 0.85,
  },
  disabled: {
    opacity: 0.4,
  },
  primaryLabel: {
    ...type.pill,
    color: colors.ctaText,
  },
  altLabel: {
    ...type.pill,
    color: colors.textPrimary,
  },
  ghostLabel: {
    color: colors.textMuted,
  },
});
