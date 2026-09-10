import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View, type GestureResponderEvent } from 'react-native';

import { colors, radius, shadows } from '@/theme';

interface DeciderFabProps {
  onPress?: (event: GestureResponderEvent) => void;
  accessibilityState?: { selected?: boolean };
}

/**
 * Center Decider FAB — 64px coral circle per design.md.
 * Used as the middle tab's `tabBarButton`.
 */
export function DeciderFab({ onPress, accessibilityState }: DeciderFabProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Decide with friends"
      accessibilityState={accessibilityState}
      style={({ pressed }) => [styles.pressable, pressed && styles.pressed]}
    >
      <View style={styles.fab}>
        <Ionicons name="sparkles" size={28} color={colors.ctaFill} />
      </View>
    </Pressable>
  );
}

const FAB_SIZE = radius.fab;

const styles = StyleSheet.create({
  pressable: {
    top: -18,
    justifyContent: 'center',
    alignItems: 'center',
    flex: 1,
  },
  pressed: {
    opacity: 0.85,
  },
  fab: {
    width: FAB_SIZE,
    height: FAB_SIZE,
    borderRadius: FAB_SIZE / 2,
    backgroundColor: colors.accent,
    borderWidth: 4,
    borderColor: colors.shell,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: shadows.fab,
  },
});
