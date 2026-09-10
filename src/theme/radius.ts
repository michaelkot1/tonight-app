export const radius = {
  sm: 8,
  md: 12,
  /** Poster rail image well */
  poster: 16,
  /** Hero pick card */
  hero: 24,
  /** Decider FAB diameter / circle */
  fab: 64,
  full: 9999,
} as const;

export type RadiusToken = keyof typeof radius;
