import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useMemo } from 'react';
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
import { ThemedText } from '@/components/themed-text';
import { useMySaves, type MySave } from '@/hooks/use-titles';
import { routes } from '@/lib/routes';
import { releaseYear, tmdbPosterUrl } from '@/lib/titles';
import { colors, radius, spacing } from '@/theme';

type SavedTitle = NonNullable<MySave['title']>;

interface SavedRow {
  saveId: string;
  title: SavedTitle;
  createdAt: string;
}

type ListItem =
  | { kind: 'header'; key: string; label: string }
  | { kind: 'row'; key: string; row: SavedRow };

function SavedTitleRow({
  row,
  onPress,
}: {
  row: SavedRow;
  onPress: () => void;
}) {
  const posterUri = tmdbPosterUrl(row.title.poster_path, 'w185');
  const year = releaseYear(row.title.release_date);
  const mediaLabel = row.title.media_type === 'tv' ? 'TV' : 'Movie';
  const meta = [mediaLabel, year].filter(Boolean).join(' · ');
  const rating =
    typeof row.title.imdb_rating === 'number'
      ? row.title.imdb_rating.toFixed(1)
      : typeof row.title.tmdb_rating === 'number'
        ? row.title.tmdb_rating.toFixed(1)
        : null;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={row.title.title}
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
          {row.title.title}
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

      <SaveControl titleId={row.title.id} size="sm" />
    </Pressable>
  );
}

export function SavedScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { data, isLoading, isError, refetch } = useMySaves();

  const listItems = useMemo<ListItem[]>(() => {
    const rows: SavedRow[] = (data ?? [])
      .filter((save): save is MySave & { title: SavedTitle } => save.title != null)
      .map((save) => ({
        saveId: save.id,
        title: save.title,
        createdAt: save.created_at,
      }));

    // Newest-first within each media section (query already orders by created_at desc).
    const movies = rows.filter((row) => row.title.media_type === 'movie');
    const shows = rows.filter((row) => row.title.media_type === 'tv');

    const items: ListItem[] = [];
    if (movies.length > 0) {
      items.push({ kind: 'header', key: 'header-movies', label: 'Movies' });
      for (const row of movies) {
        items.push({ kind: 'row', key: row.saveId, row });
      }
    }
    if (shows.length > 0) {
      items.push({ kind: 'header', key: 'header-tv', label: 'TV Shows' });
      for (const row of shows) {
        items.push({ kind: 'row', key: row.saveId, row });
      }
    }
    return items;
  }, [data]);

  const renderItem: ListRenderItem<ListItem> = ({ item }) => {
    if (item.kind === 'header') {
      return (
        <ThemedText variant="sectionRail" style={styles.sectionHeader}>
          {item.label}
        </ThemedText>
      );
    }
    return (
      <SavedTitleRow
        row={item.row}
        onPress={() => router.push(routes.title(item.row.title.id))}
      />
    );
  };

  const renderEmpty = () => {
    if (isLoading) {
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
            Couldn&apos;t load your saved titles.
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
        <Ionicons name="bookmark-outline" size={28} color={colors.textMuted} />
        <ThemedText variant="metadata" style={styles.stateText}>
          Titles you save for later will show up here.
        </ThemedText>
      </View>
    );
  };

  return (
    <View
      style={[
        styles.root,
        {
          paddingTop: insets.top + spacing.header,
        },
      ]}
    >
      <ThemedText variant="screenTitle" style={styles.title}>
        Saved
      </ThemedText>

      <FlatList
        data={listItems}
        renderItem={renderItem}
        keyExtractor={(item) => item.key}
        ItemSeparatorComponent={ItemSeparator}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: insets.bottom + spacing.navContent },
        ]}
        showsVerticalScrollIndicator={false}
        removeClippedSubviews
        initialNumToRender={12}
        maxToRenderPerBatch={12}
        windowSize={7}
      />
    </View>
  );
}

function ItemSeparator() {
  return <View style={styles.separator} />;
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  title: {
    paddingHorizontal: spacing.inset,
    marginBottom: spacing.md,
  },
  listContent: {
    paddingHorizontal: spacing.inset,
    flexGrow: 1,
  },
  sectionHeader: {
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
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
