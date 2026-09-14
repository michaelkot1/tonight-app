/**
 * Category registry — single source of truth shared by the Browse grid and the
 * Story viewer. Each entry maps a URL slug to its feed request + presentation.
 */
import type { Ionicons } from '@expo/vector-icons';

/** Which `tmdb-popular` feed backs a category. */
export type CategoryFeed = 'trending' | 'new' | 'top_rated' | 'popular' | 'discover';

export interface BrowseCategory {
  /** URL param, e.g. 'trending-now'. */
  slug: string;
  /** Card + story header. */
  label: string;
  /** One-line muted subtitle on the card. */
  blurb: string;
  icon: keyof typeof Ionicons.glyphMap;
  feed: CategoryFeed;
  /** Media filter for the feed (default 'all'). */
  media?: 'movie' | 'tv' | 'all';
  /** TMDB genre id, for `feed === 'discover'`. */
  genreId?: number;
}

/** The eight Browse categories, in display order. */
export const BROWSE_CATEGORIES: BrowseCategory[] = [
  {
    slug: 'trending-now',
    label: 'Trending Now',
    blurb: "What everyone's watching",
    icon: 'flame',
    feed: 'trending',
    media: 'all',
  },
  {
    slug: 'new-releases',
    label: 'New Releases',
    blurb: 'Fresh this week',
    icon: 'sparkles',
    feed: 'new',
    media: 'all',
  },
  {
    slug: 'critically-acclaimed',
    label: 'Critically Acclaimed',
    blurb: 'Top rated of all time',
    icon: 'ribbon',
    feed: 'top_rated',
    media: 'all',
  },
  {
    slug: 'popular-now',
    label: 'Popular Now',
    blurb: 'Buzzing right now',
    icon: 'trending-up',
    feed: 'popular',
    media: 'all',
  },
  {
    slug: 'comedy-gold',
    label: 'Comedy Gold',
    blurb: 'Laugh-out-loud picks',
    icon: 'happy',
    feed: 'discover',
    media: 'movie',
    genreId: 35,
  },
  {
    slug: 'chills-thrills',
    label: 'Chills & Thrills',
    blurb: 'Horror to keep you up',
    icon: 'skull',
    feed: 'discover',
    media: 'movie',
    genreId: 27,
  },
  {
    slug: 'sci-fi-beyond',
    label: 'Sci-Fi & Beyond',
    blurb: 'Worlds beyond ours',
    icon: 'planet',
    feed: 'discover',
    media: 'movie',
    genreId: 878,
  },
  {
    slug: 'date-night',
    label: 'Date Night',
    blurb: 'Romance for two',
    icon: 'heart',
    feed: 'discover',
    media: 'movie',
    genreId: 10749,
  },
];

/** Resolve a category by its URL slug. */
export function getCategoryBySlug(slug: string): BrowseCategory | undefined {
  return BROWSE_CATEGORIES.find((category) => category.slug === slug);
}
