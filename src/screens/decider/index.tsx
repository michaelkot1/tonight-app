import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { colors, spacing } from '@/theme';

export function DeciderScreen() {
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
      <ThemedText variant="screenTitle">Decider</ThemedText>
      <ThemedText variant="metadata" style={styles.subtitle}>
        Decide with friends — ranking lands in Phase 5.
      </ThemedText>
      <View style={styles.placeholder}>
        <ThemedText variant="cardTitle">{"Who's watching?"}</ThemedText>
        <ThemedText variant="caption">
          Solo / multi picker placeholder
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
    borderRadius: 16,
    borderCurve: 'continuous',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: spacing.xxl,
    gap: spacing.sm,
  },
});
