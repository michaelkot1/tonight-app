/** Spacing rhythm from design.md + 4pt grid helpers. */
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 28,
  /** Page horizontal inset */
  inset: 20,
  /** Header top padding */
  header: 24,
  /** Hero top under header */
  hero: 20,
  /** Gap between rail sections */
  rail: 28,
  /** Gap between cards */
  card: 12,
  /** Bottom content padding above nav */
  navContent: 112,
  navPadTop: 8,
  navPadBottom: 20,
  navPadX: 12,
} as const;

export type SpacingToken = keyof typeof spacing;
