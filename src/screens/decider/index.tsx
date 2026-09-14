import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { SaveControl } from '@/components/bookmark-button';
import { Chip } from '@/components/chip';
import { FriendPile } from '@/components/friend-pile';
import { HeroCard } from '@/components/hero-card';
import { PosterCard } from '@/components/poster-card';
import { ThemedText } from '@/components/themed-text';
import { useDeciderRank } from '@/hooks/use-decider';
import {
  useFollowing,
  type ProfileSummary,
} from '@/hooks/use-friends';
import { useProfile } from '@/hooks/use-profile';
import {
  DECIDER_FETCH_LIMIT,
  DECIDER_GENRE_CHIPS,
  DECIDER_PAGE_SIZE,
  type DeciderMediaFilter,
  type DeciderPick,
} from '@/lib/decider';
import { routes } from '@/lib/routes';
import {
  buildTitleSocialProof,
  type FriendTitleRating,
} from '@/lib/social';
import { displayRating, releaseYear } from '@/lib/titles';
import { colors, motion, radius, spacing } from '@/theme';

type Step = 'setup' | 'results';

function profileLabel(profile: ProfileSummary): string {
  if (profile.handle) return `@${profile.handle}`;
  return profile.display_name ?? 'You';
}

function initialFor(profile: ProfileSummary): string {
  const label = profile.display_name?.trim() || profile.handle || '?';
  return label.replace(/^@/, '').charAt(0).toUpperCase() || '?';
}

function ScoreChips({ pick }: { pick: DeciderPick }) {
  const chips: { label: string; value: string }[] = [];
  if (typeof pick.imdb_rating === 'number') {
    chips.push({ label: 'IMDb', value: pick.imdb_rating.toFixed(1) });
  }
  if (typeof pick.rt_rating === 'number') {
    chips.push({ label: 'RT', value: `${pick.rt_rating}%` });
  }
  if (chips.length === 0 && typeof pick.tmdb_rating === 'number') {
    chips.push({ label: 'TMDB', value: pick.tmdb_rating.toFixed(1) });
  }
  if (chips.length === 0) return null;

  return (
    <View style={styles.scoreRow}>
      {chips.map((chip) => (
        <View key={chip.label} style={styles.scoreChip}>
          <ThemedText variant="caption" style={styles.scoreLabel}>
            {chip.label}
          </ThemedText>
          <ThemedText variant="pill" style={styles.scoreValue}>
            {chip.value}
          </ThemedText>
        </View>
      ))}
    </View>
  );
}

function ServiceBadges({ pick }: { pick: DeciderPick }) {
  if (pick.services.length === 0) return null;
  return (
    <View style={styles.serviceRow}>
      {pick.services.slice(0, 3).map((s) => (
        <View key={s.service} style={styles.serviceBadge}>
          <ThemedText variant="caption" style={styles.serviceBadgeText}>
            {s.display_name}
          </ThemedText>
        </View>
      ))}
    </View>
  );
}

function pickSocial(pick: DeciderPick) {
  const ratings: FriendTitleRating[] = pick.friend_ratings.map((r) => ({
    titleId: pick.id,
    verdict: r.verdict,
    profile: {
      id: r.user_id,
      handle: r.handle,
      display_name: r.display_name,
      avatar_url: r.avatar_url,
    },
  }));
  return buildTitleSocialProof(ratings);
}

function AvatarSelect({
  profile,
  selected,
  onToggle,
  isSelf,
}: {
  profile: ProfileSummary;
  selected: boolean;
  onToggle: () => void;
  isSelf?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={`${selected ? 'Deselect' : 'Select'} ${profileLabel(profile)}`}
      onPress={isSelf ? undefined : onToggle}
      disabled={isSelf}
      style={styles.avatarItem}
    >
      <View
        style={[
          styles.avatarRing,
          selected ? styles.avatarRingSelected : styles.avatarRingIdle,
        ]}
      >
        {profile.avatar_url ? (
          <Image
            source={{ uri: profile.avatar_url }}
            style={styles.avatarImage}
            contentFit="cover"
            transition={150}
          />
        ) : (
          <View style={styles.avatarFallback}>
            <ThemedText variant="pill">{initialFor(profile)}</ThemedText>
          </View>
        )}
        {selected ? (
          <View style={styles.avatarCheck}>
            <Ionicons name="checkmark" size={12} color={colors.ctaText} />
          </View>
        ) : null}
      </View>
      <ThemedText variant="caption" numberOfLines={1} style={styles.avatarName}>
        {isSelf ? 'You' : profileLabel(profile)}
      </ThemedText>
    </Pressable>
  );
}

export function DeciderScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { data: profile } = useProfile();
  const following = useFollowing();
  const rank = useDeciderRank();

  const [step, setStep] = useState<Step>('setup');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [media, setMedia] = useState<DeciderMediaFilter>('both');
  const [genreId, setGenreId] = useState<number | null>(null);
  const [allPicks, setAllPicks] = useState<DeciderPick[]>([]);
  const [pageOffset, setPageOffset] = useState(0);
  const [coldStart, setColdStart] = useState(false);
  const [emptyNote, setEmptyNote] = useState<string | null>(null);

  const selfProfile: ProfileSummary | null = useMemo(() => {
    if (!profile) return null;
    return {
      id: profile.id,
      handle: profile.handle,
      display_name: profile.display_name,
      avatar_url: profile.avatar_url,
    };
  }, [profile]);

  // Self is always included; selectedIds holds additional following members.
  const memberIds = useMemo(() => {
    if (!selfProfile) return [];
    return [selfProfile.id, ...[...selectedIds].filter((id) => id !== selfProfile.id)];
  }, [selfProfile, selectedIds]);

  const followingList = following.data ?? [];
  const hasFollowing = followingList.length > 0;

  const pagePicks = useMemo(
    () => allPicks.slice(pageOffset, pageOffset + DECIDER_PAGE_SIZE),
    [allPicks, pageOffset],
  );

  const canShuffle = pageOffset + DECIDER_PAGE_SIZE < allPicks.length;

  const toggleMember = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  async function runDecide(offset = 0) {
    if (!selfProfile) return;
    setEmptyNote(null);

    try {
      const result = await rank.mutateAsync({
        member_ids: memberIds,
        media,
        genre_id: genreId,
        offset: 0,
        limit: DECIDER_FETCH_LIMIT,
      });

      setColdStart(result.cold_start);
      setAllPicks(result.picks ?? []);
      setPageOffset(offset);
      setStep('results');

      if ((result.picks ?? []).length === 0) {
        setEmptyNote(
          result.note ??
            'No eligible picks yet. Rate more titles, add services, or invite friends.',
        );
      }
    } catch {
      setStep('results');
      setAllPicks([]);
      setEmptyNote("Couldn't find picks right now. Try again in a moment.");
    }
  }

  function handleShuffle() {
    if (!canShuffle) return;
    setPageOffset((prev) => prev + DECIDER_PAGE_SIZE);
  }

  function openTitle(id: string) {
    router.push(routes.title(id));
  }

  function backToSetup() {
    setStep('setup');
    setAllPicks([]);
    setPageOffset(0);
    setEmptyNote(null);
  }

  const hero = pagePicks[0];
  const supporting = pagePicks.slice(1, 3);

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={['#121018', colors.bg, colors.bg]}
        locations={[0, 0.35, 1]}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />

      {step === 'setup' ? (
        <>
          <ScrollView
            style={styles.setupScroll}
            contentContainerStyle={[
              styles.content,
              {
                paddingTop: insets.top + spacing.header,
                paddingBottom: spacing.xxl,
              },
            ]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Animated.View entering={FadeIn.duration(motion.base)} style={styles.setup}>
              <View style={styles.heroCopy}>
                <ThemedText variant="caption" style={styles.brand}>
                  Tonight
                </ThemedText>
                <ThemedText variant="screenTitle">Decide</ThemedText>
                <ThemedText variant="metadata">
                  Pick who&apos;s watching. We&apos;ll find three titles everyone can stream.
                </ThemedText>
              </View>

              <View style={styles.section}>
                <ThemedText variant="sectionRail">Who&apos;s watching</ThemedText>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.avatarRow}
                >
                  {selfProfile ? (
                    <AvatarSelect
                      profile={selfProfile}
                      selected
                      isSelf
                      onToggle={() => undefined}
                    />
                  ) : null}
                  {followingList.map((row) => (
                    <AvatarSelect
                      key={row.followingId}
                      profile={row.profile}
                      selected={selectedIds.has(row.followingId)}
                      onToggle={() => toggleMember(row.followingId)}
                    />
                  ))}
                </ScrollView>
                {!hasFollowing ? (
                  <View style={styles.softCta}>
                    <ThemedText variant="caption">
                      Solo works tonight. Add friends anytime from Profile.
                    </ThemedText>
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => router.push(routes.friends)}
                      hitSlop={8}
                    >
                      <ThemedText variant="pill" style={styles.link}>
                        Go to Friends
                      </ThemedText>
                    </Pressable>
                  </View>
                ) : null}
              </View>

              <View style={styles.section}>
                <ThemedText variant="sectionRail">Type</ThemedText>
                <View style={styles.chipRow}>
                  {(
                    [
                      { id: 'both' as const, label: 'Both' },
                      { id: 'movie' as const, label: 'Movie' },
                      { id: 'tv' as const, label: 'TV' },
                    ] as const
                  ).map((opt) => (
                    <Chip
                      key={opt.id}
                      label={opt.label}
                      selected={media === opt.id}
                      onPress={() => setMedia(opt.id)}
                    />
                  ))}
                </View>
              </View>

              <View style={styles.section}>
                <ThemedText variant="sectionRail">Genre</ThemedText>
                <View style={styles.chipRow}>
                  {DECIDER_GENRE_CHIPS.map((g) => (
                    <Chip
                      key={g.label}
                      label={g.label}
                      selected={genreId === g.id}
                      onPress={() => setGenreId(g.id)}
                    />
                  ))}
                </View>
              </View>
            </Animated.View>
          </ScrollView>

          <View style={styles.setupFooter}>
            <Button
              label="Find tonight's picks"
              loading={rank.isPending}
              disabled={!selfProfile || rank.isPending}
              onPress={() => void runDecide(0)}
            />
          </View>
        </>
      ) : (
        <ScrollView
          contentContainerStyle={[
            styles.content,
            {
              paddingTop: insets.top + spacing.header,
              paddingBottom: spacing.navContent + spacing.xxl,
            },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Animated.View entering={FadeInDown.duration(motion.slow)} style={styles.results}>
            <View style={styles.resultsHeader}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Back to setup"
                onPress={backToSetup}
                hitSlop={12}
                style={styles.backBtn}
              >
                <Ionicons name="chevron-back" size={22} color={colors.textPrimary} />
              </Pressable>
              <View style={styles.resultsHeaderCopy}>
                <ThemedText variant="caption" style={styles.brand}>
                  Tonight
                </ThemedText>
                <ThemedText variant="sectionRail">Your Top 3</ThemedText>
              </View>
            </View>

            {rank.isPending ? (
              <View style={styles.stateBlock}>
                <ThemedText variant="cardTitle">Reading the room…</ThemedText>
                <ThemedText variant="metadata">
                  Matching taste, services, and what you haven&apos;t watched yet.
                </ThemedText>
              </View>
            ) : null}

            {!rank.isPending && emptyNote ? (
              <View style={styles.stateBlock}>
                <ThemedText variant="cardTitle">Nothing queued</ThemedText>
                <ThemedText variant="metadata">{emptyNote}</ThemedText>
                {coldStart ? (
                  <ThemedText variant="caption">
                    Cold start tip: rate a few Loved titles and keep services up to date.
                  </ThemedText>
                ) : null}
                <Button label="Try again" variant="secondary" onPress={() => void runDecide(0)} />
                <Button label="Adjust filters" variant="ghost" onPress={backToSetup} />
              </View>
            ) : null}

            {!rank.isPending && hero ? (
              <View style={styles.picks}>
                {(() => {
                  const social = pickSocial(hero);
                  const year = releaseYear(hero.release_date);
                  const mediaLabel = hero.media_type === 'tv' ? 'TV' : 'Movie';
                  const meta = [year, mediaLabel, hero.why_picked].filter(Boolean).join(' · ');
                  return (
                    <View style={styles.heroBlock}>
                      <HeroCard
                        title={hero.title}
                        posterPath={hero.poster_path}
                        backdropPath={hero.backdrop_path}
                        meta={meta}
                        chipLabel="#1 tonight"
                        socialLine={social?.socialLine}
                        friendPile={
                          social ? <FriendPile friends={social.pile} /> : undefined
                        }
                        action={<SaveControl titleId={hero.id} size="sm" chip />}
                        onPress={() => openTitle(hero.id)}
                        onWatch={() => openTitle(hero.id)}
                      />
                      <ThemedText variant="caption" style={styles.whyLine}>
                        {hero.why_picked}
                      </ThemedText>
                      <ScoreChips pick={hero} />
                      <ServiceBadges pick={hero} />
                    </View>
                  );
                })()}

                {supporting.length > 0 ? (
                  <View style={styles.supportingRow}>
                    {supporting.map((pick, index) => {
                      const social = pickSocial(pick);
                      return (
                        <View key={pick.id} style={styles.supportingItem}>
                          <ThemedText variant="caption" style={styles.rankLabel}>
                            #{index + 2}
                          </ThemedText>
                          <PosterCard
                            title={pick.title}
                            posterPath={pick.poster_path}
                            genres={pick.genres}
                            rating={displayRating({
                              imdb_rating: pick.imdb_rating,
                              tmdb_rating: pick.tmdb_rating,
                            })}
                            friendPile={
                              social ? <FriendPile friends={social.pile} /> : undefined
                            }
                            action={<SaveControl titleId={pick.id} size="sm" chip />}
                            onPress={() => openTitle(pick.id)}
                          />
                          <ThemedText variant="caption" numberOfLines={2} style={styles.whyLine}>
                            {pick.why_picked}
                          </ThemedText>
                          <ServiceBadges pick={pick} />
                        </View>
                      );
                    })}
                  </View>
                ) : null}

                <View style={styles.actions}>
                  <Button
                    label="Shuffle"
                    variant="secondary"
                    disabled={!canShuffle}
                    onPress={handleShuffle}
                  />
                  {!canShuffle ? (
                    <ThemedText variant="caption" style={styles.shuffleHint}>
                      End of this list — adjust filters for a fresh batch.
                    </ThemedText>
                  ) : null}
                  <Button label="New setup" variant="ghost" onPress={backToSetup} />
                </View>
              </View>
            ) : null}
          </Animated.View>
        </ScrollView>
      )}
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
  setupScroll: {
    flex: 1,
  },
  setup: {
    gap: spacing.rail,
  },
  setupFooter: {
    paddingHorizontal: spacing.inset,
    paddingTop: spacing.lg,
    paddingBottom: spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    backgroundColor: colors.shell,
  },
  results: {
    gap: spacing.rail,
  },
  heroCopy: {
    gap: spacing.sm,
    paddingBottom: spacing.sm,
  },
  brand: {
    color: colors.accent,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  section: {
    gap: spacing.md,
  },
  avatarRow: {
    gap: spacing.md,
    paddingVertical: spacing.xs,
  },
  avatarItem: {
    width: 72,
    alignItems: 'center',
    gap: spacing.xs,
  },
  avatarRing: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarRingIdle: {
    borderColor: colors.border,
  },
  avatarRingSelected: {
    borderColor: colors.accent,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarFallback: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  avatarCheck: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarName: {
    textAlign: 'center',
    color: colors.textMuted,
    width: '100%',
  },
  softCta: {
    gap: spacing.sm,
  },
  link: {
    color: colors.accent,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  resultsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  resultsHeaderCopy: {
    flex: 1,
    gap: spacing.xs,
  },
  stateBlock: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderCurve: 'continuous',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: spacing.xxl,
    gap: spacing.md,
  },
  picks: {
    gap: spacing.rail,
  },
  heroBlock: {
    gap: spacing.sm,
  },
  whyLine: {
    color: colors.textMuted,
  },
  scoreRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  scoreChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.surface,
    borderRadius: radius.full,
    borderCurve: 'continuous',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  scoreLabel: {
    color: colors.textMuted,
  },
  scoreValue: {
    color: colors.rating,
  },
  serviceRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  serviceBadge: {
    backgroundColor: colors.shell,
    borderRadius: radius.sm,
    borderCurve: 'continuous',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  serviceBadgeText: {
    color: colors.textPrimary,
  },
  supportingRow: {
    flexDirection: 'row',
    gap: spacing.md,
    justifyContent: 'space-between',
  },
  supportingItem: {
    flex: 1,
    gap: spacing.xs,
    maxWidth: '48%',
  },
  rankLabel: {
    color: colors.accent,
  },
  actions: {
    gap: spacing.sm,
    paddingTop: spacing.md,
  },
  shuffleHint: {
    textAlign: 'center',
  },
});
