import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  View,
  type ListRenderItem,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SaveControl } from '@/components/bookmark-button';
import { TextInput } from '@/components/text-input';
import { ThemedText } from '@/components/themed-text';
import { useTitleSearch, type TitleSearchResult } from '@/hooks/use-titles';
import { routes } from '@/lib/routes';
import { releaseYear, tmdbPosterUrl } from '@/lib/titles';
import { colors, radius, spacing } from '@/theme';

const MEDIA_LABEL: Record<TitleSearchResult['media_type'], string> = {
  movie: 'Movie',
  tv: 'TV',
};

/** Compact horizontal result row: small poster + title + meta + rating. */
function SearchResultRow({
  result,
  onPress,
}: {
  result: TitleSearchResult;
  onPress: () => void;
}) {
  const posterUri = tmdbPosterUrl(result.poster_path, 'w185');
  const year = releaseYear(result.release_date);
  const meta = [MEDIA_LABEL[result.media_type], year].filter(Boolean).join(' · ');
  const rating =
    typeof result.tmdb_rating === 'number' ? result.tmdb_rating.toFixed(1) : null;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={result.title}
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
    >
      <View style={styles.thumb}>
        {posterUri ? (
          <Image
            source={{ uri: posterUri }}
            style={styles.thumbImage}
            contentFit="cover"
            transition={150}
            accessibilityIgnoresInvertColors
          />
        ) : (
          <View style={[styles.thumbImage, styles.thumbFallback]}>
            <Ionicons name="film-outline" size={18} color={colors.textMuted} />
          </View>
        )}
      </View>

      <View style={styles.rowBody}>
        <ThemedText variant="cardTitle" numberOfLines={1}>
          {result.title}
        </ThemedText>
        {meta ? (
          <ThemedText variant="metadata" numberOfLines={1}>
            {meta}
          </ThemedText>
        ) : null}
      </View>

      {rating ? (
        <View style={styles.rating}>
          <Ionicons name="star" size={12} color={colors.rating} />
          <ThemedText variant="caption" style={styles.ratingText}>
            {rating}
          </ThemedText>
        </View>
      ) : null}

      <SaveControl titleId={result.id} size="sm" />
    </Pressable>
  );
}

export function SearchScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [query, setQuery] = useState('');

  const trimmed = query.trim();
  const { data, isFetching, isError, refetch } = useTitleSearch(query);
  const results = data ?? [];

  const renderItem: ListRenderItem<TitleSearchResult> = ({ item }) => (
    <SearchResultRow result={item} onPress={() => router.push(routes.title(item.id))} />
  );

  const renderEmpty = () => {
    if (trimmed.length < 2) {
      return (
        <View style={styles.stateBox}>
          <Ionicons name="search" size={28} color={colors.textMuted} />
          <ThemedText variant="metadata" style={styles.stateText}>
            Search movies and shows to rate.
          </ThemedText>
        </View>
      );
    }
    if (isFetching) {
      return (
        <View style={styles.stateBox}>
          <ActivityIndicator color={colors.textMuted} />
        </View>
      );
    }
    if (isError) {
      return (
        <View style={styles.stateBox}>
          <ThemedText variant="metadata" style={styles.stateText}>
            Something went wrong.
          </ThemedText>
          <Pressable accessibilityRole="button" onPress={() => refetch()}>
            <ThemedText variant="pill" style={styles.retry}>
              Try again
            </ThemedText>
          </Pressable>
        </View>
      );
    }
    return (
      <View style={styles.stateBox}>
        <ThemedText variant="metadata" style={styles.stateText}>
          {`No results for "${trimmed}".`}
        </ThemedText>
      </View>
    );
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top + spacing.sm }]}>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back"
          onPress={() => router.back()}
          hitSlop={12}
          style={({ pressed }) => [styles.backButton, pressed && styles.rowPressed]}
        >
          <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
        </Pressable>
        <View style={styles.searchField}>
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search titles"
            autoFocus
            autoCorrect={false}
            autoCapitalize="none"
            returnKeyType="search"
            clearButtonMode="while-editing"
          />
        </View>
      </View>

      <FlatList
        data={results}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: insets.bottom + spacing.navContent },
        ]}
        ItemSeparatorComponent={Separator}
        ListEmptyComponent={renderEmpty}
        showsVerticalScrollIndicator={false}
        removeClippedSubviews
        initialNumToRender={10}
        maxToRenderPerBatch={10}
        windowSize={7}
      />
    </View>
  );
}

const Separator = () => <View style={styles.separator} />;

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    paddingHorizontal: spacing.inset,
    paddingBottom: spacing.md,
  },
  backButton: {
    minHeight: 52,
    justifyContent: 'center',
  },
  searchField: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: spacing.inset,
    flexGrow: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  rowPressed: {
    opacity: 0.7,
  },
  thumb: {
    width: 48,
    height: 72,
    borderRadius: radius.sm,
    borderCurve: 'continuous',
    overflow: 'hidden',
    backgroundColor: colors.surface,
  },
  thumbImage: {
    width: '100%',
    height: '100%',
  },
  thumbFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowBody: {
    flex: 1,
    gap: spacing.xs,
  },
  rating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  ratingText: {
    color: colors.rating,
    fontVariant: ['tabular-nums'],
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
  },
  stateBox: {
    paddingTop: spacing.xxxl * 2,
    alignItems: 'center',
    gap: spacing.md,
  },
  stateText: {
    textAlign: 'center',
  },
  retry: {
    color: colors.accent,
  },
});
