import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Chip } from '@/components/chip';
import { ThemedText } from '@/components/themed-text';
import { DECIDER_GENRE_CHIPS } from '@/lib/decider';
import { routes } from '@/lib/routes';
import { colors, radius, spacing } from '@/theme';

import { CategoryCard } from './category-card';

const CATEGORIES = [
  'Trending Now',
  'New Releases',
  'Watch with Friends',
  'Comedy Gold',
] as const;

export function BrowseScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [selectedGenreId, setSelectedGenreId] = useState<number | null>(null);

  function openSearch() {
    router.push(routes.search);
  }

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={[
        styles.content,
        {
          paddingTop: insets.top + spacing.header,
          paddingBottom: spacing.navContent,
        },
      ]}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      <ThemedText variant="screenTitle">Search</ThemedText>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Search titles"
        accessibilityHint="Opens search"
        onPress={openSearch}
        style={({ pressed }) => [styles.searchBar, pressed && styles.searchBarPressed]}
      >
        <Ionicons name="search" size={18} color={colors.textMuted} />
        <ThemedText style={styles.searchPlaceholder}>Search titles</ThemedText>
      </Pressable>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.genreRow}
        style={styles.genreScroll}
      >
        {DECIDER_GENRE_CHIPS.map((g) => (
          <Chip
            key={g.label}
            label={g.label}
            selected={selectedGenreId === g.id}
            onPress={() => setSelectedGenreId(g.id)}
          />
        ))}
      </ScrollView>

      <View style={styles.grid}>
        {CATEGORIES.map((label) => (
          <CategoryCard key={label} label={label} />
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  content: {
    paddingHorizontal: spacing.inset,
    gap: spacing.lg,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 52,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderCurve: 'continuous',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
  },
  searchBarPressed: {
    opacity: 0.7,
  },
  searchPlaceholder: {
    color: colors.textMuted,
  },
  genreScroll: {
    marginHorizontal: -spacing.inset,
  },
  genreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.inset,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.card,
  },
});
