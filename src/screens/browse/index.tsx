import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { BROWSE_CATEGORIES } from '@/lib/categories';
import { routes } from '@/lib/routes';
import { colors, radius, spacing } from '@/theme';

import { CategoryCard } from './category-card';

export function BrowseScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

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

      <View style={styles.grid}>
        {BROWSE_CATEGORIES.map((category) => (
          <CategoryCard
            key={category.slug}
            category={category}
            onPress={() => router.push(routes.story(category.slug))}
          />
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
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.card,
  },
});
