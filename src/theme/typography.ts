import type { TextStyle } from 'react-native';

import { colors } from './colors';

/** Font family names registered via expo-font in root layout. */
export const fonts = {
  display: {
    bold: 'BricolageGrotesque_700Bold',
    extraBold: 'BricolageGrotesque_800ExtraBold',
    semiBold: 'BricolageGrotesque_600SemiBold',
  },
  body: {
    regular: 'Inter_400Regular',
    medium: 'Inter_500Medium',
    semiBold: 'Inter_600SemiBold',
  },
} as const;

export const type = {
  screenTitle: {
    fontFamily: fonts.display.bold,
    fontSize: 24,
    letterSpacing: -0.6,
    color: colors.textPrimary,
  },
  heroTitle: {
    fontFamily: fonts.display.extraBold,
    fontSize: 36,
    letterSpacing: -0.9,
    color: colors.textPrimary,
  },
  sectionRail: {
    fontFamily: fonts.display.semiBold,
    fontSize: 18,
    letterSpacing: -0.45,
    color: colors.textPrimary,
  },
  cardTitle: {
    fontFamily: fonts.body.medium,
    fontSize: 16,
    color: colors.textPrimary,
  },
  body: {
    fontFamily: fonts.body.regular,
    fontSize: 14,
    color: colors.textPrimary,
  },
  metadata: {
    fontFamily: fonts.body.regular,
    fontSize: 14,
    color: colors.textMuted,
  },
  caption: {
    fontFamily: fonts.body.regular,
    fontSize: 12,
    color: colors.textMuted,
  },
  pill: {
    fontFamily: fonts.body.semiBold,
    fontSize: 14,
    color: colors.ctaText,
  },
  tabLabel: {
    fontFamily: fonts.body.medium,
    fontSize: 10,
    color: colors.textMuted,
  },
} as const satisfies Record<string, TextStyle>;

export type TypeToken = keyof typeof type;
