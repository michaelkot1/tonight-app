import { Image } from 'expo-image';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { SERVICE_CATALOG, type StreamingService } from '@/lib/services';
import { colors, radius, spacing } from '@/theme';

interface ServiceGridProps {
  /** Currently selected services. */
  selected: StreamingService[];
  onToggle: (service: StreamingService) => void;
  disabled?: boolean;
}

/** Multi-select grid of the 8 supported streaming services. */
export function ServiceGrid({ selected, onToggle, disabled = false }: ServiceGridProps) {
  const selectedSet = new Set(selected);

  return (
    <View style={styles.grid}>
      {SERVICE_CATALOG.map(({ service, displayName, logo }) => {
        const isSelected = selectedSet.has(service);
        return (
          <Pressable
            key={service}
            accessibilityRole="button"
            accessibilityLabel={displayName}
            accessibilityState={{ selected: isSelected, disabled }}
            disabled={disabled}
            onPress={() => onToggle(service)}
            style={({ pressed }) => [
              styles.tile,
              isSelected ? styles.tileSelected : styles.tileIdle,
              pressed && !disabled && styles.pressed,
            ]}
          >
            <View style={styles.iconSlot}>
              <Image
                source={logo}
                style={styles.icon}
                contentFit="contain"
                accessibilityLabel={displayName}
              />
            </View>
            <ThemedText
              variant="cardTitle"
              numberOfLines={1}
              style={isSelected ? styles.labelSelected : styles.labelIdle}
            >
              {displayName}
            </ThemedText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  tile: {
    // Two columns with a 12px gutter.
    width: '48%',
    flexGrow: 1,
    minHeight: 96,
    borderRadius: radius.poster,
    borderCurve: 'continuous',
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.lg,
    justifyContent: 'space-between',
  },
  tileIdle: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
  },
  tileSelected: {
    backgroundColor: colors.surface,
    borderColor: colors.accent,
  },
  pressed: {
    opacity: 0.85,
  },
  iconSlot: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    borderCurve: 'continuous',
    backgroundColor: colors.shell,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    width: 36,
    height: 36,
  },
  labelIdle: {
    color: colors.textPrimary,
  },
  labelSelected: {
    color: colors.textPrimary,
  },
});
