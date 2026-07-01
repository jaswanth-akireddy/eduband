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
const PALETTE = [
  '#FF385C', '#008489', '#7B61FF', '#F0714F',
  '#3FB16D', '#E0568A', '#5B8DEF', '#E8A33B',
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

  return (
    <View
      style={[
        styles.wrap,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: bg },
      ]}
    >
      <Text style={[styles.text, { fontSize: Math.round(size * 0.42) }]}>{initials}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center' },
  text: { color: '#FFFFFF', fontWeight: '800', letterSpacing: 0.5 },
});
