import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { TextInput } from '@/components/text-input';
import { ThemedText } from '@/components/themed-text';
import {
  useFollow,
  useFollowing,
  useFriendRequests,
  useSearchProfiles,
  type FollowerRow,
  type ProfileSummary,
} from '@/hooks/use-friends';
import { colors, radius, spacing } from '@/theme';

function profileLabel(profile: ProfileSummary): string {
  if (profile.handle) return `@${profile.handle}`;
  return profile.display_name ?? 'Friend';
}

function ProfileRow({
  profile,
  trailing,
}: {
  profile: ProfileSummary;
  trailing: ReactNode;
}) {
  return (
    <View style={styles.row}>
      <View style={styles.avatar} />
      <View style={styles.rowBody}>
        <ThemedText variant="cardTitle" numberOfLines={1}>
          {profileLabel(profile)}
        </ThemedText>
        {profile.display_name && profile.handle ? (
          <ThemedText variant="metadata" numberOfLines={1}>
            {profile.display_name}
          </ThemedText>
        ) : null}
      </View>
      {trailing}
    </View>
  );
}

export function DeciderScreen() {
  const insets = useSafeAreaInsets();
  const [addFriendsOpen, setAddFriendsOpen] = useState(false);
  const [query, setQuery] = useState('');

  const following = useFollowing();
  const requests = useFriendRequests();
  const search = useSearchProfiles(query);
  const follow = useFollow();

  const followingIds = useMemo(() => {
    const set = new Set<string>();
    for (const row of following.data ?? []) {
      set.add(row.followingId);
    }
    return set;
  }, [following.data]);

  const trimmed = query.trim().replace(/^@+/, '');
  const isSearching = trimmed.length >= 2;
  const searchResults = search.data ?? [];
  const requestRows = requests.data;

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: insets.top + spacing.header,
            paddingBottom: spacing.navContent,
          },
        ]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerRow}>
          <View style={styles.headerCopy}>
            <ThemedText variant="screenTitle">Decider</ThemedText>
            <ThemedText variant="metadata">
              Decide with friends — ranking lands in Phase 5.
            </ThemedText>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={
              addFriendsOpen ? 'Close add friends' : 'Add friends'
            }
            onPress={() => setAddFriendsOpen((open) => !open)}
            hitSlop={12}
            style={({ pressed }) => [
              styles.addFriendsButton,
              addFriendsOpen && styles.addFriendsButtonActive,
              pressed && styles.pressed,
            ]}
          >
            <Ionicons
              name={addFriendsOpen ? 'close' : 'person-add'}
              size={22}
              color={colors.textPrimary}
            />
          </Pressable>
        </View>

        {addFriendsOpen ? (
          <View style={styles.card}>
            <ThemedText variant="sectionRail">Add friends</ThemedText>
            <TextInput
              label="Search username"
              value={query}
              onChangeText={setQuery}
              placeholder="@handle"
              autoCapitalize="none"
              autoCorrect={false}
              clearButtonMode="while-editing"
              autoFocus
            />
            {isSearching && search.isFetching ? (
              <ActivityIndicator color={colors.textMuted} />
            ) : null}
            {isSearching ? (
              searchResults.length === 0 && !search.isFetching ? (
                <ThemedText variant="metadata">
                  {search.isError
                    ? 'Search failed. Try again.'
                    : `No profiles matching “${trimmed}”.`}
                </ThemedText>
              ) : (
                searchResults.map((item) => {
                  const isFriend = followingIds.has(item.id);
                  return (
                    <ProfileRow
                      key={item.id}
                      profile={item}
                      trailing={
                        isFriend ? (
                          <ThemedText variant="caption">Added</ThemedText>
                        ) : (
                          <Button
                            label="Add"
                            variant="secondary"
                            disabled={follow.isPending}
                            onPress={() => follow.mutate(item.id)}
                          />
                        )
                      }
                    />
                  );
                })
              )
            ) : (
              <ThemedText variant="caption">
                Type at least 2 characters to find someone by @handle.
              </ThemedText>
            )}
          </View>
        ) : null}

        <View style={styles.card}>
          <ThemedText variant="sectionRail">Friend requests</ThemedText>
          {requests.isLoading ? (
            <ActivityIndicator color={colors.textMuted} />
          ) : requestRows.length === 0 ? (
            <ThemedText variant="metadata">
              No pending requests. When someone adds you, they’ll show up here.
            </ThemedText>
          ) : (
            requestRows.map((row: FollowerRow) => (
              <ProfileRow
                key={row.followerId}
                profile={row.profile}
                trailing={
                  <Button
                    label="Accept"
                    variant="secondary"
                    disabled={follow.isPending}
                    onPress={() => follow.mutate(row.followerId)}
                  />
                }
              />
            ))
          )}
        </View>

        <View style={styles.placeholder}>
          <ThemedText variant="cardTitle">{"Who's watching?"}</ThemedText>
          <ThemedText variant="caption">
            Solo / multi picker placeholder
          </ThemedText>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  content: {
    paddingHorizontal: spacing.inset,
    gap: spacing.rail,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  headerCopy: {
    flex: 1,
    gap: spacing.sm,
  },
  addFriendsButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  addFriendsButtonActive: {
    borderColor: colors.accent,
  },
  pressed: {
    opacity: 0.7,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderCurve: 'continuous',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.bg,
    borderWidth: 2,
    borderColor: colors.border,
  },
  rowBody: {
    flex: 1,
    gap: spacing.xs,
  },
  placeholder: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderCurve: 'continuous',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: spacing.xxl,
    gap: spacing.sm,
  },
});
