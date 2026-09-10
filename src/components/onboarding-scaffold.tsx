import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { ThemedText } from '@/components/themed-text';
import { colors, spacing } from '@/theme';

interface OnboardingScaffoldProps {
  title: string;
  subtitle?: string;
  /** 1-based step index; renders "{step} of {totalSteps}" when both provided. */
  step?: number;
  totalSteps?: number;
  children?: ReactNode;
  primaryLabel?: string;
  onPrimary?: () => void;
  primaryDisabled?: boolean;
  primaryLoading?: boolean;
  /** When provided, renders a low-emphasis "Skip" action in the bottom bar. */
  onSkip?: () => void;
  skipLabel?: string;
}

/**
 * Shared onboarding step chrome: header (progress + title + subtitle), scrollable
 * content slot, and a pinned bottom bar with a primary CTA and optional Skip.
 */
export function OnboardingScaffold({
  title,
  subtitle,
  step,
  totalSteps,
  children,
  primaryLabel = 'Continue',
  onPrimary,
  primaryDisabled = false,
  primaryLoading = false,
  onSkip,
  skipLabel = 'Skip for now',
}: OnboardingScaffoldProps) {
  const insets = useSafeAreaInsets();
  const showProgress = typeof step === 'number' && typeof totalSteps === 'number';

  return (
    <View style={styles.root}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + spacing.header },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          {showProgress ? (
            <ThemedText variant="caption" style={styles.progress}>
              {`${step} of ${totalSteps}`}
            </ThemedText>
          ) : null}
          <ThemedText variant="heroTitle">{title}</ThemedText>
          {subtitle ? (
            <ThemedText variant="metadata" style={styles.subtitle}>
              {subtitle}
            </ThemedText>
          ) : null}
        </View>
        <View style={styles.slot}>{children}</View>
      </ScrollView>
      <View
        style={[
          styles.bottomBar,
          { paddingBottom: insets.bottom + spacing.lg },
        ]}
      >
        <Button
          label={primaryLabel}
          onPress={onPrimary}
          disabled={primaryDisabled}
          loading={primaryLoading}
        />
        {onSkip ? (
          <Button label={skipLabel} variant="ghost" onPress={onSkip} />
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: spacing.inset,
    paddingBottom: spacing.xxxl,
    gap: spacing.rail,
  },
  header: {
    gap: spacing.sm,
  },
  progress: {
    color: colors.accent,
  },
  subtitle: {
    marginTop: spacing.xs,
  },
  slot: {
    gap: spacing.lg,
  },
  bottomBar: {
    paddingHorizontal: spacing.inset,
    paddingTop: spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    backgroundColor: colors.shell,
    gap: spacing.sm,
  },
});
