import { colors, type ColorToken } from './colors';
import { motion, type MotionToken } from './motion';
import { radius, type RadiusToken } from './radius';
import { shadows, type ShadowToken } from './shadows';
import { spacing, type SpacingToken } from './spacing';
import { fonts, type, type TypeToken } from './typography';

export type {
  ColorToken,
  MotionToken,
  RadiusToken,
  ShadowToken,
  SpacingToken,
  TypeToken,
};
export { colors, fonts, motion, radius, shadows, spacing, type };

export const theme = {
  colors,
  spacing,
  radius,
  fonts,
  type,
  shadows,
  motion,
} as const;

export type Theme = typeof theme;
