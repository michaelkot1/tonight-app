/** Brand palette from design.md — dark-only cinematic canvas. */
export const colors = {
  bg: '#050506',
  shell: '#0C0C0F',
  surface: '#16161B',
  border: '#22222A',
  textPrimary: '#F4F4F6',
  textMuted: '#8C8C98',
  accent: '#FF5C49',
  rating: '#F5C95B',
  ctaFill: '#FFFFFF',
  ctaText: '#050506',
  badgeBg: 'rgba(5,5,6,0.7)',
  scrim: '#050506',
  ambientGreen: '#2FBF71',
  ambientPurple: 'rgba(79,57,246,0.1)',
  navIdle: '#8C8C98',
  navActive: '#F4F4F6',
  navBar: 'rgba(12,12,15,0.9)',
} as const;

export type ColorToken = keyof typeof colors;
