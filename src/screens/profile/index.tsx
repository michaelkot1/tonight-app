import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AvatarPicker } from '@/components/avatar-picker';
import { Button } from '@/components/button';
import { ServiceGrid } from '@/components/service-grid';
import { ThemedText } from '@/components/themed-text';
import { UserAvatar } from '@/components/user-avatar';
import { useProfile, useUpdateAvatar } from '@/hooks/use-profile';
import { useSetUserServices, useUserServices } from '@/hooks/use-user-services';
import {
  avatarUrlForSelection,
  selectionFromAvatarUrl,
  type AvatarSelection,
} from '@/lib/avatar';
import { routes } from '@/lib/routes';
import type { StreamingService } from '@/lib/services';
import { useAuth } from '@/providers/auth-provider';
import { colors, radius, spacing } from '@/theme';

export function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, signOut, deleteAccount } = useAuth();
  const { data: profile } = useProfile();
  const { data: existing } = useUserServices();
  const setServices = useSetUserServices();
  const updateAvatar = useUpdateAvatar();

  // `null` until the user interacts — display derives from the saved selection.
  const [edited, setEdited] = useState<StreamingService[] | null>(null);
  const [minServiceHint, setMinServiceHint] = useState(false);
  const selected = edited ?? existing ?? [];

  const [avatarSheetOpen, setAvatarSheetOpen] = useState(false);
  const [avatarSelection, setAvatarSelection] = useState<AvatarSelection>({
    kind: 'letter',
  });
  const [avatarError, setAvatarError] = useState<string | null>(null);

  const handleLabel = profile?.handle ? `@${profile.handle}` : 'No handle yet';
  const displayName = profile?.display_name ?? user?.email ?? 'Your profile';
  const avatarLabel = profile?.handle ?? displayName;
  const seedSource = profile?.handle ?? displayName;

  function openAvatarPicker() {
    setAvatarError(null);
    setAvatarSelection(
      selectionFromAvatarUrl(profile?.avatar_url, seedSource),
    );
    setAvatarSheetOpen(true);
  }

  function closeAvatarPicker() {
    if (updateAvatar.isPending) return;
    setAvatarSheetOpen(false);
    setAvatarError(null);
  }

  async function saveAvatar() {
    setAvatarError(null);
    try {
      const avatarUrl = avatarUrlForSelection(avatarSelection, seedSource);
      await updateAvatar.mutateAsync(avatarUrl);
      setAvatarSheetOpen(false);
    } catch (e) {
      setAvatarError(
        e instanceof Error ? e.message : "Couldn't save your avatar. Try again.",
      );
    }
  }

  function toggle(service: StreamingService) {
    const base = edited ?? existing ?? [];
    const next = base.includes(service)
      ? base.filter((s) => s !== service)
      : [...base, service];

    if (next.length === 0) {
      setMinServiceHint(true);
      return;
    }

    setMinServiceHint(false);
    setEdited(next);
    setServices.mutate(next, {
      onError: () => {
        setEdited(existing ?? []);
      },
    });
  }

  function confirmDelete() {
    Alert.alert(
      'Delete account',
      'This permanently deletes your account and all your data. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const { error } = await deleteAccount();
            if (error) {
              Alert.alert('Delete failed', error);
            }
          },
        },
      ],
    );
  }

  return (
    <>
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
      >
        <View style={styles.headerRow}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Change avatar"
            hitSlop={12}
            onPress={openAvatarPicker}
            disabled={updateAvatar.isPending}
          >
            <UserAvatar
              uri={profile?.avatar_url}
              label={avatarLabel}
              size={40}
            />
          </Pressable>
          <View style={styles.headerCopy}>
            <ThemedText variant="screenTitle">{displayName}</ThemedText>
            <ThemedText variant="metadata">{handleLabel}</ThemedText>
          </View>
        </View>

        <View style={styles.card}>
          <ThemedText variant="sectionRail">Streaming services</ThemedText>
          <ThemedText variant="caption">
            Tap to add or remove. Keep at least one so we can recommend something tonight.
          </ThemedText>
          <ServiceGrid
            selected={selected}
            onToggle={toggle}
            disabled={setServices.isPending}
          />
          {minServiceHint ? (
            <ThemedText variant="caption">
              Keep at least one streaming service selected.
            </ThemedText>
          ) : null}
          {setServices.isError ? (
            <ThemedText variant="caption">
              {"Couldn't save your services. Please try again."}
            </ThemedText>
          ) : null}
        </View>

        <View style={styles.actions}>
          <Button
            label="Friends"
            variant="secondary"
            onPress={() => router.push(routes.friends)}
          />
          <Button label="Sign out" variant="secondary" onPress={signOut} />
          <Button label="Delete account" variant="ghost" onPress={confirmDelete} />
        </View>
      </ScrollView>

      <Modal
        visible={avatarSheetOpen}
        transparent
        animationType="slide"
        onRequestClose={closeAvatarPicker}
      >
        <View style={styles.sheetRoot}>
          <Pressable
            style={styles.sheetBackdrop}
            onPress={closeAvatarPicker}
            disabled={updateAvatar.isPending}
            accessibilityRole="button"
            accessibilityLabel="Dismiss avatar picker"
          />
          <View
            style={[
              styles.sheetCard,
              { paddingBottom: insets.bottom + spacing.xxl },
            ]}
          >
            <View style={styles.sheetBody}>
              <ThemedText variant="sectionRail">Choose avatar</ThemedText>
              <ThemedText variant="caption">
                Letter monogram or a glass style. Same options as onboarding.
              </ThemedText>
              <AvatarPicker
                handle={seedSource}
                selection={avatarSelection}
                onSelect={setAvatarSelection}
              />
              {avatarError ? (
                <ThemedText variant="caption">{avatarError}</ThemedText>
              ) : null}
              <View style={styles.sheetActions}>
                <View style={styles.sheetSaveWrap}>
                  <Button
                    label="Save"
                    loading={updateAvatar.isPending}
                    disabled={updateAvatar.isPending}
                    onPress={saveAvatar}
                  />
                </View>
                <Button
                  label="Cancel"
                  variant="ghost"
                  disabled={updateAvatar.isPending}
                  onPress={closeAvatarPicker}
                />
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </>
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
    alignItems: 'center',
    gap: spacing.md,
  },
  headerCopy: {
    flex: 1,
    gap: spacing.xs,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.poster,
    borderCurve: 'continuous',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: spacing.xxl,
    gap: spacing.md,
  },
  actions: {
    gap: spacing.sm,
  },
  sheetRoot: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheetBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.scrim,
    opacity: 0.6,
  },
  sheetCard: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.poster,
    borderTopRightRadius: radius.poster,
    borderCurve: 'continuous',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    paddingHorizontal: spacing.inset,
    paddingTop: spacing.xxl,
  },
  sheetBody: {
    gap: spacing.md,
  },
  sheetActions: {
    gap: spacing.sm,
    marginTop: spacing.sm,
    alignItems: 'center',
  },
  sheetSaveWrap: {
    alignSelf: 'stretch',
  },
});
