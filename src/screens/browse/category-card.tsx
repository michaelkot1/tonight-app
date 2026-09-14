import { Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { colors, radius, spacing } from '@/theme';

interface CategoryCardProps {
  label: string;
  onPress?: () => void;
}

/** Surface tile for Browse category grid (ServiceGrid-style 2-col). */
export function CategoryCard({ label, onPress }: CategoryCardProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [styles.tile, pressed && styles.pressed]}
    >
      <ThemedText variant="cardTitle" numberOfLines={2} style={styles.label}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tile: {
    width: '48%',
    flexGrow: 1,
    minHeight: 96,
    borderRadius: radius.poster,
    borderCurve: 'continuous',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing.lg,
    justifyContent: 'flex-end',
  },
  pressed: {
    opacity: 0.85,
  },
  label: {
    color: colors.textPrimary,
  },
});
