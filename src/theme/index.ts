// EduBand design system — "Belo" (Airbnb-inspired).
// Clean white canvas, Foggy-grey secondary text, hairline borders, soft shadows,
// and a single confident Rausch-coral accent. Typeset in San Francisco (SF Pro)
// at a tighter, premium scale. Light, calm, trustworthy.

import { Platform } from 'react-native';
import { PillarId } from '@/types';

export const colors = {
  // Airy white canvas (kept as a near-flat "gradient" so the backdrop stays calm)
  bg: '#FFFFFF',
  bg2: '#F7F7F7',
  bg3: '#FAFAFA',
  bgGradient: ['#FFFFFF', '#FFFFFF', '#F7F7F7'] as const,

  surface: '#FFFFFF',
  surfaceAlt: '#F7F7F7',
  // "glass" now reads as a clean white card — separated by border + soft shadow.
  glass: '#FFFFFF',
  glassStrong: '#FFFFFF',
  glassBorder: '#EBEBEB',

  text: '#222222', // Hof
  // NOTE: legacy screens use *OnDark tokens as their primary/secondary page text
  // (this app's canvas was formerly all-dark). On the new light canvas they map
  // to the same dark ink. Text on coloured fills uses `white` instead.
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
  iridescent: ['#FF385C', '#E61E4D', '#BD1E59'] as const,
  accent: '#008489',

  // Score bands (kind, never shaming) — tuned for a light canvas
  good: '#008A05',
  goodGradient: ['#1DBE6E', '#008A05'] as const,
  mid: '#FFB400',
  midGradient: ['#FFB400', '#FF9500'] as const,
  low: '#E0245E',
  lowGradient: ['#FF385C', '#C13515'] as const,

  white: '#FFFFFF',
  glow: 'rgba(255, 56, 92, 0.28)',
  shadow: 'rgba(0, 0, 0, 0.12)',

  // ---- Back-compat aliases (older screens map onto the light theme) ----
  card: '#FFFFFF',
  cardMuted: '#F7F7F7',
  borderDark: '#DDDDDD',
  surfaceGlass: '#FFFFFF',
  surfaceGlassBorder: '#EBEBEB',
  primaryGradient: ['#FF385C', '#E61E4D', '#BD1E59'] as const,
};

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
