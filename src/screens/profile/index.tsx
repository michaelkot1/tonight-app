import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { colors, spacing } from '@/theme';

export function ProfileScreen() {
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
      <View style={styles.headerRow}>
        <View style={styles.avatar} />
        <View style={styles.headerCopy}>
          <ThemedText variant="screenTitle">Profile</ThemedText>
          <ThemedText variant="caption">Auth + tastes in later phases</ThemedText>
        </View>
      </View>
      <View style={styles.placeholder}>
        <ThemedText variant="cardTitle">Streaming services</ThemedText>
        <ThemedText variant="caption">Placeholder — Phase 2</ThemedText>
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
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.border,
  },
  headerCopy: {
    flex: 1,
    gap: spacing.xs,
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
