import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { colors, spacing } from '@/theme';

export function SavedScreen() {
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
      <ThemedText variant="screenTitle">Saved</ThemedText>

      <View style={styles.stateBox}>
        <Ionicons name="bookmark-outline" size={28} color={colors.textMuted} />
        <ThemedText variant="metadata" style={styles.stateText}>
          Titles you save for later will show up here.
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
  stateBox: {
    paddingTop: spacing.xxxl * 2,
    alignItems: 'center',
    gap: spacing.md,
  },
  stateText: {
    textAlign: 'center',
  },
});
