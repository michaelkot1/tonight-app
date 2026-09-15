/**
 * Decider ranking client — types + invoke for the `decider-rank` Edge Function.
 * Scoring weights live on the server (plan.md Q1); the client never invents them.
 */
import { invokeEdgeFunction } from '@/lib/edge';
import type { StreamingService } from '@/lib/services';
import type { MediaType, TitleGenre, Verdict } from '@/lib/titles';

export type DeciderMediaFilter = 'movie' | 'tv' | 'both';

export interface DeciderRankRequest {
  member_ids: string[];
  media?: DeciderMediaFilter;
  /** TMDB genre id, or omit / null for All. */
  genre_id?: number | null;
  offset?: number;
  limit?: number;
  /** Hard-skip: buffer + titles shown this Decider visit (Find / prefetch). */
  exclude_ids?: string[];
  /** Soft-decay (unused for session-seen; hard exclude is the source of truth). */
  demote_ids?: string[];
}

export interface DeciderServiceBadge {
  service: StreamingService;
  display_name: string;
}

export interface DeciderFriendRating {
  user_id: string;
  verdict: Verdict;
  handle: string | null;
  display_name: string | null;
  avatar_url: string | null;
}

export interface DeciderPick {
  id: string;
  title: string;
  media_type: MediaType;
  poster_path: string | null;
  backdrop_path: string | null;
  release_date: string | null;
  genres: TitleGenre[];
  why_picked: string;
  score: number;
  imdb_rating: number | null;
  rt_rating: number | null;
  tmdb_rating: number | null;
  services: DeciderServiceBadge[];
  friend_ratings: DeciderFriendRating[];
  member_verdicts: DeciderFriendRating[];
}

export interface DeciderMember {
  id: string;
  handle: string | null;
  display_name: string | null;
  avatar_url: string | null;
}

export interface DeciderRankResponse {
  picks: DeciderPick[];
  total: number;
  offset: number;
  limit?: number;
  cold_start: boolean;
  members?: DeciderMember[];
  empty_reason?: 'no_services' | 'no_eligible' | null;
  note?: string | null;
  error?: string;
}

/** Common TMDB genres for Decider chips (compact; not a full wall). */
export const DECIDER_GENRE_CHIPS: { id: number | null; label: string }[] = [
  { id: null, label: 'All' },
  { id: 28, label: 'Action' },
  { id: 35, label: 'Comedy' },
  { id: 18, label: 'Drama' },
  { id: 27, label: 'Horror' },
  { id: 10749, label: 'Romance' },
  { id: 878, label: 'Sci-Fi' },
  { id: 53, label: 'Thriller' },
  { id: 16, label: 'Animation' },
];

export const DECIDER_PAGE_SIZE = 3;
/** How many picks to ask for on each fetch / prefetch. */
export const DECIDER_FETCH_LIMIT = 12;
/** Prefetch when fewer than this many picks remain after the current page. */
export const DECIDER_PREFETCH_THRESHOLD = 6;

/** Invoke server-side ranking for the selected watching group + filters. */
export async function invokeDeciderRank(
  request: DeciderRankRequest,
): Promise<DeciderRankResponse> {
  return invokeEdgeFunction<DeciderRankResponse, DeciderRankRequest>('decider-rank', {
    member_ids: request.member_ids,
    media: request.media ?? 'both',
    genre_id: request.genre_id ?? null,
    offset: request.offset ?? 0,
    limit: request.limit ?? DECIDER_FETCH_LIMIT,
    ...(request.exclude_ids != null ? { exclude_ids: request.exclude_ids } : {}),
    ...(request.demote_ids != null ? { demote_ids: request.demote_ids } : {}),
  });
}
