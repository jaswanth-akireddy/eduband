// EduBand design system — "Belo" (Airbnb-inspired).
// Clean white canvas, Foggy-grey secondary text, hairline borders, soft shadows,
// and a single confident Rausch-coral accent. Typeset in San Francisco (SF Pro)
// at a tighter, premium scale. Light, calm, trustworthy.

import { Platform } from 'react-native';
import { PillarId } from '@/types';

// Light palette (the app's original look — unchanged).
export const lightColors = {
  // Airy white canvas (kept as a near-flat "gradient" so the backdrop stays calm)
  bg: '#FFFFFF',
  bg2: '#F7F7F7',
  bg3: '#FAFAFA',
  bgGradient: ['#FFFFFF', '#FFFFFF', '#F7F7F7'] as [string, string, string],

  surface: '#FFFFFF',
  surfaceAlt: '#F7F7F7',
  // "glass" now reads as a clean white card — separated by border + soft shadow.
  glass: '#FFFFFF',
  glassStrong: '#FFFFFF',
  glassBorder: '#EBEBEB',

  text: '#222222', // Hof
  // NOTE: legacy screens use *OnDark tokens as their primary/secondary page text.
  // They map to the same ink as `text` per theme.
  textOnDark: '#222222',
  textMuted: '#717171', // Foggy
  textFaint: '#B0B0B0',
  textMutedOnDark: '#717171',
  line: '#EBEBEB',
  border: '#DDDDDD',

  // Rausch — the one bold accent
  blue: '#008489', // Babu (Airbnb teal) — kept for any cool-tone UI
  violet: '#FF385C',
  pink: '#E61E4D',
  primary: '#FF385C', // Rausch
  primaryDark: '#BD1E59',
  iridescent: ['#FF385C', '#E61E4D', '#BD1E59'] as [string, string, string],
  accent: '#008489',

  // Score bands (kind, never shaming)
  good: '#008A05',
  goodGradient: ['#1DBE6E', '#008A05'] as [string, string],
  mid: '#FFB400',
  midGradient: ['#FFB400', '#FF9500'] as [string, string],
  low: '#E0245E',
  lowGradient: ['#FF385C', '#C13515'] as [string, string],

  white: '#FFFFFF',
  glow: 'rgba(255, 56, 92, 0.28)',
  shadow: 'rgba(0, 0, 0, 0.12)',

  // ---- Back-compat aliases ----
  card: '#FFFFFF',
  cardMuted: '#F7F7F7',
  borderDark: '#DDDDDD',
  surfaceGlass: '#FFFFFF',
  surfaceGlassBorder: '#EBEBEB',
  primaryGradient: ['#FF385C', '#E61E4D', '#BD1E59'] as [string, string, string],
};

export type Palette = typeof lightColors;

// Dark palette — surfaces/text/lines flip; brand + score accents stay vivid so
// they read on a dark canvas. Spread guarantees every key exists.
export const darkColors: Palette = {
  ...lightColors,
  bg: '#0E0F12',
  bg2: '#16171B',
  bg3: '#121317',
  bgGradient: ['#0E0F12', '#0E0F12', '#16171B'],

  surface: '#191A1F',
  surfaceAlt: '#212229',
  glass: '#191A1F',
  glassStrong: '#1E2027',
  glassBorder: '#2C2F36',

  text: '#F2F3F5',
  textOnDark: '#F2F3F5',
  textMuted: '#A3A8B0',
  textFaint: '#6C7178',
  textMutedOnDark: '#A3A8B0',
  line: '#2C2F36',
  border: '#3A3E45',

  white: '#FFFFFF',
  shadow: 'rgba(0, 0, 0, 0.5)',

  card: '#191A1F',
  cardMuted: '#24262D',
  borderDark: '#3A3E45',
  surfaceGlass: '#191A1F',
  surfaceGlassBorder: '#2C2F36',
};

// Live default palette used by static `import { colors }` and by the score/
// gradient helpers below. Points at light; screens read the active palette via
// useTheme()/makeStyles so they re-render on toggle.
export const colors: Palette = lightColors;

// Each pillar keeps its own identity colour (reads cleanly on white).
export const pillarColors: Record<PillarId, readonly [string, string]> = {
  fluency: ['#FF385C', '#BD1E59'],
  clarity: ['#008489', '#006C70'],
  language: ['#5B5BD6', '#4A3FC4'],
  structure: ['#FFB400', '#FF9500'],
  confidence: ['#E61E4D', '#C13515'],
  interaction: ['#008A05', '#0A7C2F'],
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
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  pill: 999,
};

// San Francisco everywhere. On native iOS this resolves to the system SF face;
// on web we name the SF Pro stack explicitly and fall back gracefully.
export const fontFamily = Platform.select({
  ios: 'System',
  android: 'sans-serif',
  default:
    '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
}) as string;

// Slightly smaller, premium scale.
export const font = {
  hero: 32,
  h1: 26,
  h2: 21,
  h3: 17,
  body: 15,
  small: 13,
  tiny: 11,
};

export const weight = {
  regular: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
};

export const shadow = {
  // Airbnb's signature soft, low-contrast card shadow.
  card: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 3,
  },
  glow: {
    shadowColor: colors.glow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 18,
    elevation: 6,
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
