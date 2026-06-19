// EduBand design system — "Obsidian & Iridescent".
// Near-black mesh backgrounds, glassmorphic cards, blue→violet→pink gradients,
// and glow for depth. Premium, modern, calm-but-confident.

import { PillarId } from '@/types';

export const colors = {
  // Obsidian background story (used with mesh gradient + blurred blobs)
  bg: '#0A0A0F',
  bg2: '#16131F',
  bg3: '#0E0C16',
  bgGradient: ['#0A0A0F', '#16131F', '#0E0C16'] as const,

  surface: '#16131F',
  surfaceAlt: '#1C1830',
  // glass = translucent white over the dark mesh
  glass: 'rgba(255,255,255,0.05)',
  glassStrong: 'rgba(255,255,255,0.08)',
  glassBorder: 'rgba(255,255,255,0.10)',

  text: '#F4F5FA',
  textOnDark: '#F4F5FA',
  textMuted: '#B8C0D9',
  textFaint: '#6E748C',
  textMutedOnDark: '#B8C0D9',
  line: '#262335',
  border: '#262335',

  // Iridescent brand spectrum
  blue: '#5B8DEF',
  violet: '#8B7CFF',
  pink: '#E879C7',
  primary: '#8B7CFF',
  primaryDark: '#6D5DF6',
  iridescent: ['#5B8DEF', '#8B7CFF', '#E879C7'] as const,
  accent: '#3FD0E0',

  // Score bands (kind, never shaming)
  good: '#34D399',
  goodGradient: ['#34D399', '#10B981'] as const,
  mid: '#FBBF4C',
  midGradient: ['#FBBF4C', '#F59E0B'] as const,
  low: '#FB7185',
  lowGradient: ['#FB7185', '#EF4444'] as const,

  white: '#FFFFFF',
  glow: 'rgba(139, 124, 255, 0.45)',
  shadow: 'rgba(0, 0, 0, 0.45)',

  // ---- Back-compat aliases (older screens map onto the dark theme) ----
  card: 'rgba(255,255,255,0.05)',
  cardMuted: 'rgba(255,255,255,0.08)',
  borderDark: '#262335',
  surfaceGlass: 'rgba(255,255,255,0.05)',
  surfaceGlassBorder: 'rgba(255,255,255,0.10)',
  primaryGradient: ['#5B8DEF', '#8B7CFF', '#E879C7'] as const,
};

// Each pillar keeps its own identity colour.
export const pillarColors: Record<PillarId, readonly [string, string]> = {
  fluency: ['#5B8DEF', '#3B6FE0'],
  clarity: ['#3FD0E0', '#22B8CC'],
  language: ['#8B7CFF', '#6D5DF6'],
  structure: ['#FBBF4C', '#F59E0B'],
  confidence: ['#E879C7', '#D858B0'],
  interaction: ['#34D399', '#10B981'],
};

export function pillarColor(id: PillarId): string {
  return pillarColors[id]?.[0] ?? colors.violet;
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
  md: 16,
  lg: 22,
  xl: 30,
  pill: 999,
};

export const font = {
  hero: 38,
  h1: 30,
  h2: 24,
  h3: 19,
  body: 16,
  small: 14,
  tiny: 12,
};

export const shadow = {
  card: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.45,
    shadowRadius: 28,
    elevation: 6,
  },
  glow: {
    shadowColor: colors.glow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 24,
    elevation: 10,
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
