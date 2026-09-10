import { type ReactElement } from 'react';
import {
  FlatList,
  StyleSheet,
  View,
  type ListRenderItem,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { spacing } from '@/theme';

interface PosterRailProps<T> {
  title: string;
  data: T[];
  renderItem: (item: T, index: number) => ReactElement;
  keyExtractor: (item: T, index: number) => string;
  /** Rendered inside the scroll area when `data` is empty. */
  ListEmptyComponent?: ReactElement | null;
  style?: StyleProp<ViewStyle>;
}

const Separator = () => <View style={styles.separator} />;

/**
 * Section title + horizontal poster FlatList. Gaps follow design.md:
 * 12px between cards, 12px from rail title to cards, 28px between sections
 * (the 28px section gap is owned by the parent list container).
 */
export function PosterRail<T>({
  title,
  data,
  renderItem,
  keyExtractor,
  ListEmptyComponent,
  style,
}: PosterRailProps<T>) {
  const renderRow: ListRenderItem<T> = ({ item, index }) => renderItem(item, index);

  return (
    <View style={[styles.section, style]}>
      <ThemedText variant="sectionRail" style={styles.title}>
        {title}
      </ThemedText>
      <FlatList
        data={data}
        horizontal
        renderItem={renderRow}
        keyExtractor={keyExtractor}
        ItemSeparatorComponent={Separator}
        ListEmptyComponent={ListEmptyComponent}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.content}
        removeClippedSubviews
        initialNumToRender={4}
        maxToRenderPerBatch={6}
        windowSize={5}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: spacing.card,
  },
  title: {
    paddingHorizontal: spacing.inset,
  },
  content: {
    paddingHorizontal: spacing.inset,
  },
  separator: {
    width: spacing.card,
  },
});
