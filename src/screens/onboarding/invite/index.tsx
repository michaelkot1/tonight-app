import { useRouter } from 'expo-router';
import * as Linking from 'expo-linking';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Share, StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { OnboardingScaffold } from '@/components/onboarding-scaffold';
import { ThemedText } from '@/components/themed-text';
import {
  useFollow,
  useFollowing,
  useMatchContacts,
  useMyInvite,
  type ProfileSummary,
} from '@/hooks/use-friends';
import { loadContactEmails } from '@/lib/contacts';
import { routes } from '@/lib/routes';
import { colors, radius, spacing } from '@/theme';

type ContactsPhase = 'idle' | 'busy' | 'denied' | 'ready' | 'error';

function profileLabel(profile: ProfileSummary): string {
  if (profile.handle) return `@${profile.handle}`;
  return profile.display_name ?? 'Friend';
}

export function InviteScreen() {
  const router = useRouter();
  const invite = useMyInvite();
  const follow = useFollow();
  const following = useFollowing();
  const [contactEmails, setContactEmails] = useState<string[]>([]);
  const [contactsPhase, setContactsPhase] = useState<ContactsPhase>('idle');
  const contactMatches = useMatchContacts(contactEmails);

  const inviteUrl = invite.data
    ? Linking.createURL(`/invite/${invite.data}`)
    : null;

  const followingIds = new Set(
    (following.data ?? []).map((row) => row.followingId),
  );
  const matchResults = (contactMatches.data ?? []).filter(
    (profile) => !followingIds.has(profile.id),
  );

  function goNext() {
    router.push(routes.onboarding.notifications);
  }

  async function handleShare() {
    if (!inviteUrl) return;
    try {
      await Share.share({
        message: `Join me on Tonight — we'll decide what to watch in 60 seconds. ${inviteUrl}`,
      });
    } catch {
      // User dismissed or share failed — no-op.
    }
  }

  const handleFindContacts = useCallback(async () => {
    setContactsPhase('busy');
    try {
      const { status, emails } = await loadContactEmails();
      if (status !== 'granted') {
        setContactEmails([]);
        setContactsPhase('denied');
        return;
      }
      setContactEmails(emails);
      setContactsPhase('ready');
    } catch {
      setContactsPhase('error');
    }
  }, []);

  const contactsBusy =
    contactsPhase === 'busy' ||
    (contactEmails.length > 0 && contactMatches.isFetching);

  return (
    <OnboardingScaffold
      step={5}
      totalSteps={6}
      title="Bring a friend"
      subtitle="Tonight is better with friends — their ratings power your picks."
      primaryLabel="Continue"
      onPrimary={goNext}
      onSkip={goNext}
    >
      <View style={styles.card}>
        <ThemedText variant="caption">Your invite link</ThemedText>
        {invite.isLoading ? (
          <ActivityIndicator color={colors.textMuted} />
        ) : invite.isError || !inviteUrl ? (
          <ThemedText variant="metadata">
            Invite link unavailable right now — you can share from Friends
            later.
          </ThemedText>
        ) : (
          <ThemedText variant="cardTitle" numberOfLines={2}>
            {inviteUrl}
          </ThemedText>
        )}
      </View>
      <Button
        label="Share invite link"
        variant="secondary"
        onPress={handleShare}
        disabled={!inviteUrl}
        loading={invite.isLoading}
      />

      <View style={styles.card}>
        <ThemedText variant="caption">Optional · From contacts</ThemedText>
        <ThemedText variant="metadata">
          Find friends already on Tonight. We only match emails and never store
          your address book.
        </ThemedText>
        {contactsPhase === 'idle' || contactsPhase === 'denied' ? (
          <Button
            label={
              contactsPhase === 'denied'
                ? 'Try contacts again'
                : 'Find friends in contacts'
            }
            variant="ghost"
            onPress={handleFindContacts}
          />
        ) : null}
        {contactsBusy ? <ActivityIndicator color={colors.textMuted} /> : null}
        {contactsPhase === 'denied' ? (
          <ThemedText variant="metadata">
            Contacts access is off — you can skip and invite later.
          </ThemedText>
        ) : null}
        {contactsPhase === 'error' || contactMatches.isError ? (
          <ThemedText variant="metadata">
            Couldn’t match contacts right now. Skip for now.
          </ThemedText>
        ) : null}
        {contactsPhase === 'ready' &&
        !contactMatches.isFetching &&
        matchResults.length === 0 ? (
          <ThemedText variant="metadata">
            No contacts on Tonight yet — share your link instead.
          </ThemedText>
        ) : null}
        {contactsPhase === 'ready' && matchResults.length > 0
          ? matchResults.slice(0, 5).map((profile) => (
              <View key={profile.id} style={styles.matchRow}>
                <ThemedText variant="cardTitle" numberOfLines={1} style={styles.matchLabel}>
                  {profileLabel(profile)}
                </ThemedText>
                <Button
                  label="Follow"
                  variant="secondary"
                  disabled={follow.isPending}
                  onPress={() => follow.mutate(profile.id)}
                />
              </View>
            ))
          : null}
      </View>
    </OnboardingScaffold>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderCurve: 'continuous',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  matchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingTop: spacing.sm,
  },
  matchLabel: {
    flex: 1,
  },
});
