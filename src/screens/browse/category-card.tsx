import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import type { BrowseCategory } from '@/lib/categories';
import { colors, radius, spacing } from '@/theme';

interface CategoryCardProps {
  category: BrowseCategory;
  onPress: () => void;
}

/** Surface tile for the Browse category grid (2-col). Opens the story viewer. */
export function CategoryCard({ category, onPress }: CategoryCardProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={category.label}
      onPress={onPress}
      style={({ pressed }) => [styles.tile, pressed && styles.pressed]}
    >
      <Ionicons name={category.icon} size={22} color={colors.textMuted} />
      <View style={styles.textBlock}>
        <ThemedText variant="cardTitle" numberOfLines={2}>
          {category.label}
        </ThemedText>
        <ThemedText variant="caption" numberOfLines={2} style={styles.blurb}>
          {category.blurb}
        </ThemedText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tile: {
    width: '48%',
    flexGrow: 1,
    minHeight: 128,
    borderRadius: radius.poster,
    borderCurve: 'continuous',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing.lg,
    justifyContent: 'space-between',
  },
  pressed: {
    opacity: 0.85,
  },
  textBlock: {
    gap: spacing.xs,
  },
  blurb: {
    color: colors.textMuted,
  },
});
