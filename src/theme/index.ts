// EduBand design system — "Belo 2.0".
// Grouped-canvas layout (Apple Health / iOS Settings pattern): a soft neutral
// background with borderless white cards floating on a whisper of shadow.
// Typography carries the hierarchy (700 titles → 600 headlines → 400 body →
// muted captions); colour is used with restraint — neutrals dominate and the
// Rausch coral appears only on primary actions and active states.

import { Platform } from 'react-native';
import { PillarId } from '@/types';

// Light palette (default).
export const lightColors = {
  // Grouped canvas: soft cool gray so white cards read as elevated surfaces.
  bg: '#F6F6F8',
  bg2: '#FFFFFF',
  bg3: '#FAFAFB',
  bgGradient: ['#F7F7F9', '#F6F6F8', '#F2F2F6'] as [string, string, string],

  surface: '#FFFFFF',
  surfaceAlt: '#F1F1F4', // tonal fill (secondary buttons, inputs, tracks)
  glass: '#FFFFFF',
  glassStrong: '#FFFFFF',
  glassBorder: 'rgba(17, 17, 26, 0.04)', // near-invisible hairline

  text: '#1B1B1F', // near-black ink, slightly cool
  // Legacy alias: older screens use *OnDark tokens as their page text.
  textOnDark: '#1B1B1F',
  textMuted: '#71717A', // secondary label
  textFaint: '#AFAFB8', // tertiary label
  textMutedOnDark: '#71717A',
  line: 'rgba(17, 17, 26, 0.06)', // hairline separators
  border: '#E4E4E9',

  // Rausch — the one bold accent. Used sparingly.
  blue: '#0E8488',
  violet: '#FF385C',
  pink: '#F1244D',
  primary: '#FF385C',
  primaryDark: '#E0284C',
  iridescent: ['#FF455F', '#FF385C', '#F1244D'] as [string, string, string],
  accent: '#0E8488',

  // Score bands — calm, legible semantics (never neon, never shaming).
  good: '#188A4C',
  goodGradient: ['#2BB673', '#188A4C'] as [string, string],
  mid: '#E8930C',
  midGradient: ['#F5A623', '#E8930C'] as [string, string],
  low: '#E5484D',
  lowGradient: ['#F2555A', '#D93036'] as [string, string],

  white: '#FFFFFF',
  glow: 'rgba(255, 56, 92, 0.22)',
  shadow: 'rgba(17, 17, 26, 0.08)',

  // ---- Back-compat aliases ----
  card: '#FFFFFF',
  cardMuted: '#F1F1F4',
  borderDark: '#E4E4E9',
  surfaceGlass: '#FFFFFF',
  surfaceGlassBorder: 'rgba(17, 17, 26, 0.04)',
  primaryGradient: ['#FF455F', '#FF385C', '#F1244D'] as [string, string, string],
};

export type Palette = typeof lightColors;

// Dark palette — iOS-dark grouped: true-dark canvas, raised graphite cards.
// Brand + score accents stay vivid; surfaces/text/lines flip.
export const darkColors: Palette = {
  ...lightColors,
  bg: '#0C0C10',
  bg2: '#141419',
  bg3: '#101015',
  bgGradient: ['#0C0C10', '#0C0C10', '#101016'],

  surface: '#1A1A20',
  surfaceAlt: '#232329',
  glass: '#1A1A20',
  glassStrong: '#1F1F26',
  glassBorder: 'rgba(255, 255, 255, 0.06)',

  text: '#F4F4F6',
  textOnDark: '#F4F4F6',
  textMuted: '#9E9EA7',
  textFaint: '#5E5E67',
  textMutedOnDark: '#9E9EA7',
  line: 'rgba(255, 255, 255, 0.07)',
  border: '#33333B',

  good: '#34C77B',
  mid: '#F5A623',
  low: '#F2555A',

  white: '#FFFFFF',
  shadow: 'rgba(0, 0, 0, 0.55)',

  card: '#1A1A20',
  cardMuted: '#26262E',
  borderDark: '#33333B',
  surfaceGlass: '#1A1A20',
  surfaceGlassBorder: 'rgba(255, 255, 255, 0.06)',
};

// Live default palette for static imports; screens read the active palette via
// useTheme()/makeStyles so they re-render on toggle.
export const colors: Palette = lightColors;

// Each pillar keeps its own identity colour (reads cleanly on light and dark).
export const pillarColors: Record<PillarId, readonly [string, string]> = {
  fluency: ['#FF385C', '#E0284C'],
  clarity: ['#0E8488', '#0B6B6E'],
  language: ['#6366F1', '#4F46E5'],
  structure: ['#E8930C', '#C97B06'],
  confidence: ['#E11D48', '#BE123C'],
  interaction: ['#188A4C', '#136F3D'],
};

export function pillarColor(id: PillarId): string {
  return pillarColors[id]?.[0] ?? colors.primary;
}

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const radius = {
  sm: 10,
  md: 14,
  lg: 20,
  xl: 28,
  pill: 999,
};

// San Francisco on iOS; Roboto on Android; SF stack on web.
export const fontFamily = Platform.select({
  ios: 'System',
  android: 'sans-serif',
  default:
    '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
}) as string;

// Apple-HIG-adjacent scale. One hero/large-title per screen; everything else
// steps down decisively so hierarchy comes from type, not from boldness.
export const font = {
  hero: 34, // large title
  h1: 28, // screen title
  h2: 22, // card/section hero
  h3: 17, // headline
  body: 15,
  small: 13, // footnote / secondary
  tiny: 11, // caption / overline
};

export const weight = {
  regular: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
};

export const shadow = {
  // Barely-there elevation: cards float, they don't pop.
  card: {
    shadowColor: '#111116',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 24,
    elevation: 2,
  },
  glow: {
    shadowColor: colors.glow,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 1,
    shadowRadius: 14,
    elevation: 4,
  },
};

export function scoreGradient(score: number): readonly [string, string] {
  if (score >= 75) return colors.goodGradient;
  if (score >= 50) return colors.midGradient;
  return colors.lowGradient;
}

export function scoreColor(score: number): string {
  if (score >= 75) return colors.good;
  if (score >= 50) return colors.mid;
  return colors.low;
}

export function scoreBand(score: number): string {
  if (score >= 85) return 'Strong';
  if (score >= 70) return 'Solid';
  if (score >= 55) return 'Developing';
  if (score >= 40) return 'Emerging';
  return 'Early';
}

// Theme context / hooks / makeStyles (re-exported so everything is `@/theme`).
export {
  ThemeProvider,
  useTheme,
  useColors,
  makeStyles,
  type ThemeScheme,
} from './ThemeProvider';
