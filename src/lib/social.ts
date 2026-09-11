import type { ProfileSummary } from '@/hooks/use-friends';
import type { Verdict } from '@/lib/titles';

export interface FriendTitleRating {
  titleId: string;
  verdict: Verdict;
  profile: ProfileSummary;
}

export interface TitleSocialProof {
  /** Up to 3 friends, loved-first. */
  pile: ProfileSummary[];
  /** Short ambient line, e.g. `Alex & 2 friends loved this`. */
  socialLine: string;
}

const VERDICT_RANK: Record<Verdict, number> = {
  loved: 0,
  liked: 1,
  meh: 2,
};

const MAX_PILE = 3;

/** First name / handle for social copy. */
export function friendFirstName(profile: ProfileSummary): string {
  const display = profile.display_name?.trim();
  if (display) {
    const first = display.split(/\s+/)[0];
    if (first) return first;
  }
  if (profile.handle) return `@${profile.handle}`;
  return 'A friend';
}

/** Loved-first sort for ambient piles. */
export function sortFriendRatingsLovedFirst(
  ratings: FriendTitleRating[],
): FriendTitleRating[] {
  return [...ratings].sort((a, b) => {
    const rankDiff = VERDICT_RANK[a.verdict] - VERDICT_RANK[b.verdict];
    if (rankDiff !== 0) return rankDiff;
    return friendFirstName(a.profile).localeCompare(friendFirstName(b.profile));
  });
}

/**
 * Build pile + social line for one title.
 * Prefer Loved; fall back to Liked, then Meh. Max ~3 avatars.
 */
export function buildTitleSocialProof(
  ratings: FriendTitleRating[],
): TitleSocialProof | null {
  if (ratings.length === 0) return null;

  const sorted = sortFriendRatingsLovedFirst(ratings);
  const pile = sorted.slice(0, MAX_PILE).map((row) => row.profile);

  const loved = sorted.filter((row) => row.verdict === 'loved');
  const liked = sorted.filter((row) => row.verdict === 'liked');
  const pool = loved.length > 0 ? loved : liked.length > 0 ? liked : sorted;
  const verb =
    loved.length > 0 ? 'loved' : liked.length > 0 ? 'liked' : 'rated';

  const names = pool.map((row) => friendFirstName(row.profile));
  let socialLine: string;
  if (names.length === 1) {
    socialLine = `${names[0]} ${verb} this`;
  } else if (names.length === 2) {
    socialLine = `${names[0]} & ${names[1]} ${verb} this`;
  } else {
    socialLine = `${names[0]} & ${names.length - 1} friends ${verb} this`;
  }

  return { pile, socialLine };
}

/** Aggregate friend ratings into a map keyed by title id. */
export function aggregateSocialByTitle(
  ratings: FriendTitleRating[],
): Map<string, TitleSocialProof> {
  const byTitle = new Map<string, FriendTitleRating[]>();
  for (const row of ratings) {
    const list = byTitle.get(row.titleId) ?? [];
    list.push(row);
    byTitle.set(row.titleId, list);
  }

  const result = new Map<string, TitleSocialProof>();
  for (const [titleId, list] of byTitle) {
    // Dedupe by profile id (keep best verdict).
    const bestByUser = new Map<string, FriendTitleRating>();
    for (const row of sortFriendRatingsLovedFirst(list)) {
      if (!bestByUser.has(row.profile.id)) {
        bestByUser.set(row.profile.id, row);
      }
    }
    const proof = buildTitleSocialProof([...bestByUser.values()]);
    if (proof) result.set(titleId, proof);
  }
  return result;
}
