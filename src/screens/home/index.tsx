import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { colors, spacing } from '@/theme';

export function HomeScreen() {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.root,
        {
          paddingTop: insets.top + spacing.header,
          paddingBottom: spacing.navContent,
        },
      ]}
    >
      <ThemedText variant="screenTitle">For You</ThemedText>
      <ThemedText variant="metadata" style={styles.subtitle}>
        {"Tonight's picks will land here."}
      </ThemedText>
      <View style={styles.placeholder}>
        <ThemedText variant="sectionRail">{"Tonight's pick"}</ThemedText>
        <ThemedText variant="caption" style={styles.caption}>
          Hero card placeholder — Phase 3
        </ThemedText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
    paddingHorizontal: spacing.inset,
  },
  subtitle: {
    marginTop: spacing.sm,
  },
  placeholder: {
    marginTop: spacing.hero,
    backgroundColor: colors.surface,
    borderRadius: 24,
    borderCurve: 'continuous',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: spacing.xxl,
    minHeight: 220,
    justifyContent: 'flex-end',
    gap: spacing.sm,
  },
  caption: {
    color: colors.textMuted,
  },
});
