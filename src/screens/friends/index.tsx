import { Ionicons } from '@expo/vector-icons';
import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import { useMemo, useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  Share,
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
  useMyInvite,
  useSearchProfiles,
  useUnfollow,
  type FollowingRow,
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

export function FriendsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [query, setQuery] = useState('');

  const invite = useMyInvite();
  const following = useFollowing();
  const search = useSearchProfiles(query);
  const follow = useFollow();
  const unfollow = useUnfollow();

  const inviteUrl = useMemo(() => {
    if (!invite.data) return null;
    return Linking.createURL(`/invite/${invite.data}`);
  }, [invite.data]);

  const followingIds = useMemo(() => {
    const set = new Set<string>();
    for (const row of following.data ?? []) {
      set.add(row.followingId);
    }
    return set;
  }, [following.data]);

  async function handleShare() {
    if (!inviteUrl) return;
    try {
      await Share.share({
        message: `Join me on Tonight — we'll decide what to watch in 60 seconds. ${inviteUrl}`,
      });
    } catch {
      // dismissed
    }
  }

  const trimmed = query.trim().replace(/^@+/, '');
  const isSearching = trimmed.length >= 2;
  const searchResults = search.data ?? [];
  const followingRows = following.data ?? [];

  const listHeader = (
    <View style={styles.listHeader}>
      <View style={styles.card}>
        <ThemedText variant="sectionRail">Your invite</ThemedText>
        {invite.isLoading ? (
          <ActivityIndicator color={colors.textMuted} />
        ) : invite.isError ? (
          <ThemedText variant="caption">
            Couldn’t load your invite. Try again in a moment.
          </ThemedText>
        ) : (
          <>
            <ThemedText variant="cardTitle" numberOfLines={2}>
              {inviteUrl ?? '—'}
            </ThemedText>
            <Button
              label="Share invite link"
              variant="secondary"
              onPress={handleShare}
              disabled={!inviteUrl}
            />
          </>
        )}
      </View>

      <TextInput
        label="Find friends"
        value={query}
        onChangeText={setQuery}
        placeholder="@handle"
        autoCapitalize="none"
        autoCorrect={false}
        clearButtonMode="while-editing"
      />

      <ThemedText variant="sectionRail">
        {isSearching ? 'Results' : 'Following'}
      </ThemedText>

      {isSearching && search.isFetching ? (
        <ActivityIndicator color={colors.textMuted} />
      ) : null}
      {!isSearching && following.isFetching ? (
        <ActivityIndicator color={colors.textMuted} />
      ) : null}
    </View>
  );

  return (
    <View style={[styles.root, { paddingTop: insets.top + spacing.sm }]}>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back"
          onPress={() => router.back()}
          hitSlop={12}
          style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
        >
          <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
        </Pressable>
        <ThemedText variant="screenTitle">Friends</ThemedText>
      </View>

      {isSearching ? (
        <FlatList
          data={searchResults}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => {
            const isFollowing = followingIds.has(item.id);
            return (
              <ProfileRow
                profile={item}
                trailing={
                  isFollowing ? (
                    <ThemedText variant="caption">Following</ThemedText>
                  ) : (
                    <Button
                      label="Follow"
                      variant="secondary"
                      disabled={follow.isPending}
                      onPress={() => follow.mutate(item.id)}
                    />
                  )
                }
              />
            );
          }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: insets.bottom + spacing.navContent },
          ]}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={listHeader}
          ListEmptyComponent={
            search.isFetching ? null : (
              <ThemedText variant="metadata" style={styles.empty}>
                {search.isError
                  ? 'Search failed. Try again.'
                  : `No profiles matching “${trimmed}”.`}
              </ThemedText>
            )
          }
        />
      ) : (
        <FlatList
          data={followingRows}
          keyExtractor={(item: FollowingRow) => item.followingId}
          renderItem={({ item }) => (
            <ProfileRow
              profile={item.profile}
              trailing={
                <Button
                  label="Unfollow"
                  variant="ghost"
                  disabled={unfollow.isPending}
                  onPress={() => unfollow.mutate(item.followingId)}
                />
              }
            />
          )}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: insets.bottom + spacing.navContent },
          ]}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={listHeader}
          ListEmptyComponent={
            following.isFetching ? null : (
              <ThemedText variant="metadata" style={styles.empty}>
                You’re not following anyone yet. Share your invite or search a
                handle.
              </ThemedText>
            )
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.inset,
    paddingBottom: spacing.md,
  },
  backButton: {
    minHeight: 44,
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.7,
  },
  listContent: {
    paddingHorizontal: spacing.inset,
    flexGrow: 1,
  },
  listHeader: {
    gap: spacing.lg,
    paddingBottom: spacing.md,
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
    paddingVertical: spacing.sm,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.border,
  },
  rowBody: {
    flex: 1,
    gap: spacing.xs,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
  },
  empty: {
    textAlign: 'center',
    paddingTop: spacing.xl,
  },
});
