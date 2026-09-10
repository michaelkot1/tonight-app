import { useState } from 'react';
import {
  StyleSheet,
  TextInput as RNTextInput,
  View,
  type TextInputProps as RNTextInputProps,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { colors, radius, spacing, type } from '@/theme';

interface TextInputProps extends RNTextInputProps {
  label?: string;
  /** Error text — when set, styles the field red and replaces helper text. */
  error?: string;
  /** Neutral helper/hint text shown under the field. */
  helper?: string;
}

/** Labeled text field on `colors.surface` with error/helper support. */
export function TextInput({
  label,
  error,
  helper,
  style,
  onFocus,
  onBlur,
  ...props
}: TextInputProps) {
  const [focused, setFocused] = useState(false);
  const footer = error ?? helper;

  return (
    <View style={styles.root}>
      {label ? (
        <ThemedText variant="caption" style={styles.label}>
          {label}
        </ThemedText>
      ) : null}
      <RNTextInput
        placeholderTextColor={colors.textMuted}
        selectionColor={colors.accent}
        style={[
          styles.input,
          focused && styles.inputFocused,
          !!error && styles.inputError,
          style,
        ]}
        onFocus={(e) => {
          setFocused(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          onBlur?.(e);
        }}
        {...props}
      />
      {footer ? (
        <ThemedText
          variant="caption"
          style={error ? styles.errorText : styles.helperText}
        >
          {footer}
        </ThemedText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: spacing.sm,
  },
  label: {
    color: colors.textMuted,
  },
  input: {
    ...type.body,
    minHeight: 52,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderCurve: 'continuous',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
    color: colors.textPrimary,
  },
  inputFocused: {
    borderColor: colors.textMuted,
  },
  inputError: {
    borderColor: colors.accent,
  },
  helperText: {
    color: colors.textMuted,
  },
  errorText: {
    color: colors.accent,
  },
});
