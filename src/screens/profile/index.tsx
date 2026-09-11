import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { ServiceGrid } from '@/components/service-grid';
import { ThemedText } from '@/components/themed-text';
import { useProfile } from '@/hooks/use-profile';
import { useSetUserServices, useUserServices } from '@/hooks/use-user-services';
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

  // `null` until the user interacts — display derives from the saved selection.
  const [edited, setEdited] = useState<StreamingService[] | null>(null);
  const [minServiceHint, setMinServiceHint] = useState(false);
  const selected = edited ?? existing ?? [];

  const handleLabel = profile?.handle ? `@${profile.handle}` : 'No handle yet';
  const displayName = profile?.display_name ?? user?.email ?? 'Your profile';

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
        <View style={styles.avatar} />
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
            Couldn't save your services. Please try again.
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
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.border,
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
});
