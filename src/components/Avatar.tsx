import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Gender } from '@/types';

interface Props {
  gender?: Gender; // accepted for call-site compatibility; no longer used
  seed?: string; // usually the user's name — drives the initials + colour
  size?: number;
}

// Initials monogram avatar (Gmail/Notion style). Deterministic: the same name
// always gets the same letters and colour. On-device, no network.
// Curated palette — reads well with white text and against both the dark score
// ring and white surfaces.
const PALETTE = [
  '#4263EB', '#0CA678', '#F76707', '#E64980', '#7048E8',
  '#1098AD', '#F59F00', '#D6336C', '#2F9E44', '#3B5BDB',
];

function hashOf(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'E';
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function Avatar({ seed = 'EduBand', size = 64 }: Props) {
  const { initials, bg } = useMemo(() => {
    const s = seed || 'EduBand';
    return { initials: initialsOf(s), bg: PALETTE[hashOf(s) % PALETTE.length] };
  }, [seed]);

  // Single initials read larger; two fit a touch smaller.
  const fontSize = Math.round(size * (initials.length > 1 ? 0.4 : 0.46));

  return (
    <View
      style={[
        styles.wrap,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: bg },
      ]}
    >
      <Text
        allowFontScaling={false}
        style={[styles.text, { fontSize, lineHeight: fontSize }]}
      >
        {initials}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  // includeFontPadding:false + no letterSpacing keeps the glyphs optically
  // centred (Android adds top/bottom padding; trailing letter-spacing shifts
  // two-letter monograms right).
  text: {
    color: '#FFFFFF',
    fontWeight: '800',
    textAlign: 'center',
    textAlignVertical: 'center',
    includeFontPadding: false,
  },
});
