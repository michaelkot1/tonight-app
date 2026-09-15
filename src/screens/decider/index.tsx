import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  DECIDER_PREFETCH_THRESHOLD,
  invokeDeciderRank,
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
  const [exhausted, setExhausted] = useState(false);
  const [prefetching, setPrefetching] = useState(false);

  /** IDs ever appended to `allPicks` this Decide cycle. */
  const bufferIdsRef = useRef<Set<string>>(new Set());
  const allPicksRef = useRef<DeciderPick[]>([]);
  const pageOffsetRef = useRef(0);
  const exhaustedRef = useRef(false);
  const prefetchingRef = useRef(false);
  /** In-flight ensureBuffer promise so Shuffle can await instead of early-returning. */
  const prefetchPromiseRef = useRef<Promise<number> | null>(null);
  /** Consecutive fetches that added 0 rows while `total` still looked open. */
  const emptyStreakRef = useRef(0);
  /**
   * Titles already shown this Decider visit (hard-exclude on Find / prefetch).
   * Survives New setup + re-Find; cleared only on unmount.
   */
  const sessionSeenIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    return () => {
      sessionSeenIdsRef.current = new Set();
    };
  }, []);

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

  const hasLocalNext = pageOffset + DECIDER_PAGE_SIZE < allPicks.length;
  const canShuffle = hasLocalNext || !exhausted;

  const toggleMember = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const markPageSeen = useCallback((picks: DeciderPick[], offset: number) => {
    const page = picks.slice(offset, offset + DECIDER_PAGE_SIZE);
    if (page.length === 0) return;
    for (const pick of page) {
      sessionSeenIdsRef.current.add(pick.id);
    }
  }, []);

  /** Hard-exclude: current buffer ∪ titles shown earlier this Decider visit. */
  const collectExcludeIds = useCallback((): string[] => {
    const ids = new Set(bufferIdsRef.current);
    for (const id of sessionSeenIdsRef.current) {
      ids.add(id);
    }
    return [...ids];
  }, []);

  const appendPicks = useCallback((incoming: DeciderPick[]): number => {
    const fresh = incoming.filter(
      (pick) =>
        !bufferIdsRef.current.has(pick.id) &&
        !sessionSeenIdsRef.current.has(pick.id),
    );
    if (fresh.length === 0) return 0;
    for (const pick of fresh) {
      bufferIdsRef.current.add(pick.id);
    }
    const next = [...allPicksRef.current, ...fresh];
    allPicksRef.current = next;
    setAllPicks(next);
    return fresh.length;
  }, []);

  const ensureBuffer = useCallback(
    async (opts?: { force?: boolean }): Promise<number> => {
      if (exhaustedRef.current) {
        return allPicksRef.current.length;
      }

      // Await in-flight prefetch — Shuffle must not early-return while prefetchingRef is set.
      if (prefetchPromiseRef.current) {
        await prefetchPromiseRef.current;
        if (exhaustedRef.current) {
          return allPicksRef.current.length;
        }
      }

      const remaining =
        allPicksRef.current.length - (pageOffsetRef.current + DECIDER_PAGE_SIZE);
      if (!opts?.force && remaining >= DECIDER_PREFETCH_THRESHOLD) {
        return allPicksRef.current.length;
      }

      // Another caller may have started a fetch while we awaited; join it.
      if (prefetchPromiseRef.current) {
        return prefetchPromiseRef.current;
      }

      if (!selfProfile || memberIds.length === 0) {
        return allPicksRef.current.length;
      }

      prefetchingRef.current = true;
      setPrefetching(true);

      const run = (async (): Promise<number> => {
        try {
          // Direct invoke so background prefetch does not flip mutation `isPending`.
          const result = await invokeDeciderRank({
            member_ids: memberIds,
            media,
            genre_id: genreId,
            exclude_ids: collectExcludeIds(),
            demote_ids: [],
            offset: 0,
            limit: DECIDER_FETCH_LIMIT,
          });
          if (result.error) {
            // Soft error — keep Shuffle retryable; do not mark exhausted.
            return allPicksRef.current.length;
          }

          const serverTotal = typeof result.total === 'number' ? result.total : null;
          const added = appendPicks(result.picks ?? []);

          // `total` is eligible remaining after exclude_ids — authoritative pool size.
          if (serverTotal === 0) {
            exhaustedRef.current = true;
            setExhausted(true);
            emptyStreakRef.current = 0;
          } else if (added === 0) {
            emptyStreakRef.current += 1;
            // Repeated empty after exclude → treat as done (covers missing `total`).
            if (emptyStreakRef.current >= 2) {
              exhaustedRef.current = true;
              setExhausted(true);
            }
          } else {
            emptyStreakRef.current = 0;
          }

          return allPicksRef.current.length;
        } catch {
          // Leave exhausted false so Shuffle can retry.
          return allPicksRef.current.length;
        } finally {
          prefetchingRef.current = false;
          setPrefetching(false);
          prefetchPromiseRef.current = null;
        }
      })();

      prefetchPromiseRef.current = run;
      return run;
    },
    [appendPicks, collectExcludeIds, genreId, media, memberIds, selfProfile],
  );

  async function runDecide() {
    if (!selfProfile) return;

    // Fresh Top-N page buffer only — keep sessionSeen hard-exclude across re-Find.
    const sessionExclude = [...sessionSeenIdsRef.current];
    bufferIdsRef.current = new Set();
    allPicksRef.current = [];
    pageOffsetRef.current = 0;
    exhaustedRef.current = false;
    prefetchingRef.current = false;
    prefetchPromiseRef.current = null;
    emptyStreakRef.current = 0;

    setAllPicks([]);
    setPageOffset(0);
    setExhausted(false);
    setPrefetching(false);
    setEmptyNote(null);

    try {
      const result = await rank.mutateAsync({
        member_ids: memberIds,
        media,
        genre_id: genreId,
        exclude_ids: sessionExclude,
        demote_ids: [],
        offset: 0,
        limit: DECIDER_FETCH_LIMIT,
      });

      setColdStart(result.cold_start);
      const picks = result.picks ?? [];
      appendPicks(picks);
      setStep('results');
      markPageSeen(allPicksRef.current, 0);

      if (picks.length === 0) {
        setEmptyNote(
          result.note ??
            'No eligible picks yet. Rate more titles, add services, or invite friends.',
        );
        // Authoritative empty pool from the initial Decide response.
        if (typeof result.total === 'number' && result.total === 0) {
          exhaustedRef.current = true;
          setExhausted(true);
        }
      } else {
        void ensureBuffer({ force: true });
      }
    } catch {
      bufferIdsRef.current = new Set();
      allPicksRef.current = [];
      setStep('results');
      setAllPicks([]);
      setEmptyNote("Couldn't find picks right now. Try again in a moment.");
    }
  }

  async function handleShuffle() {
    const localNext = pageOffsetRef.current + DECIDER_PAGE_SIZE < allPicksRef.current.length;
    if (!localNext && exhaustedRef.current) return;

    markPageSeen(allPicksRef.current, pageOffsetRef.current);
    const next = pageOffsetRef.current + DECIDER_PAGE_SIZE;

    if (next < allPicksRef.current.length) {
      pageOffsetRef.current = next;
      setPageOffset(next);
      markPageSeen(allPicksRef.current, next);
      void ensureBuffer();
      return;
    }

    // No local next — await any in-flight prefetch first, then force only if still short.
    if (prefetchPromiseRef.current) {
      await prefetchPromiseRef.current;
    }
    if (next < allPicksRef.current.length) {
      pageOffsetRef.current = next;
      setPageOffset(next);
      markPageSeen(allPicksRef.current, next);
      void ensureBuffer();
      return;
    }

    await ensureBuffer({ force: true });
    if (next < allPicksRef.current.length) {
      pageOffsetRef.current = next;
      setPageOffset(next);
      markPageSeen(allPicksRef.current, next);
      void ensureBuffer();
    }
    // If still no page, ensureBuffer already set exhausted when total / repeated empty said so.
  }

  function openTitle(id: string) {
    router.push(routes.title(id));
  }

  function backToSetup() {
    // Clear page buffer / UI only — keep sessionSeen so next Find hard-excludes
    // titles already shown this Decider visit.
    bufferIdsRef.current = new Set();
    allPicksRef.current = [];
    pageOffsetRef.current = 0;
    exhaustedRef.current = false;
    prefetchingRef.current = false;
    prefetchPromiseRef.current = null;
    emptyStreakRef.current = 0;

    setAllPicks([]);
    setPageOffset(0);
    setEmptyNote(null);
    setExhausted(false);
    setPrefetching(false);
    setStep('setup');
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
              onPress={() => void runDecide()}
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
                <Button label="Try again" variant="secondary" onPress={() => void runDecide()} />
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
                    disabled={!canShuffle || rank.isPending}
                    loading={prefetching && !hasLocalNext}
                    onPress={() => void handleShuffle()}
                  />
                  {!canShuffle ? (
                    <ThemedText variant="caption" style={styles.shuffleHint}>
                      No more fresh picks — try new filters, invite friends, or rate more titles.
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
