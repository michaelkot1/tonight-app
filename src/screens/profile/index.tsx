import { useRouter } from 'expo-router';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { ThemedText } from '@/components/themed-text';
import { useProfile } from '@/hooks/use-profile';
import { useUserServices } from '@/hooks/use-user-services';
import { routes } from '@/lib/routes';
import { SERVICE_CATALOG } from '@/lib/services';
import { useAuth } from '@/providers/auth-provider';
import { colors, radius, spacing } from '@/theme';

const SERVICE_LABELS = new Map(
  SERVICE_CATALOG.map(({ service, displayName }) => [service, displayName]),
);

export function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, signOut, deleteAccount } = useAuth();
  const { data: profile } = useProfile();
  const { data: services } = useUserServices();

  const handleLabel = profile?.handle ? `@${profile.handle}` : 'No handle yet';
  const displayName = profile?.display_name ?? user?.email ?? 'Your profile';

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
        {services && services.length > 0 ? (
          <View style={styles.serviceList}>
            {services.map((service) => (
              <View key={service} style={styles.servicePill}>
                <ThemedText variant="caption" style={styles.servicePillText}>
                  {SERVICE_LABELS.get(service) ?? service}
                </ThemedText>
              </View>
            ))}
          </View>
        ) : (
          <ThemedText variant="caption">No services selected yet.</ThemedText>
        )}
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
  serviceList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  servicePill: {
    backgroundColor: colors.shell,
    borderRadius: radius.full,
    borderCurve: 'continuous',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  servicePillText: {
    color: colors.textPrimary,
  },
  actions: {
    gap: spacing.sm,
  },
});
