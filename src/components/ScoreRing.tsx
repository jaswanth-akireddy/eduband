import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import { colors, font, scoreBand, scoreColor, scoreGradient } from '@/theme';

interface Props {
  score: number; // 0-100
  size?: number;
  label?: string;
  onDark?: boolean;
}

// Premium circular gauge for the Communication Index, with a gradient arc.
export default function ScoreRing({
  score,
  size = 180,
  label = 'Communication Index',
  onDark = false,
}: Props) {
  const stroke = 14;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, score)) / 100;
  const dash = c * pct;
  const [g0, g1] = scoreGradient(score);
  const color = scoreColor(score);

  return (
    <View style={{ alignItems: 'center' }}>
      <Svg width={size} height={size}>
        <Defs>
          <LinearGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={g0} />
            <Stop offset="1" stopColor={g1} />
          </LinearGradient>
        </Defs>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={onDark ? 'rgba(255,255,255,0.12)' : colors.cardMuted}
          strokeWidth={stroke}
          fill="none"
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke="url(#ringGrad)"
          strokeWidth={stroke}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={`${dash} ${c - dash}`}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <View style={styles.center}>
        <Text style={[styles.score, { color: onDark ? colors.white : color }]}>
          {score}
        </Text>
        <View style={[styles.bandPill, { backgroundColor: color + '22' }]}>
          <Text style={[styles.band, { color }]}>{scoreBand(score)}</Text>
        </View>
      </View>
      <Text style={[styles.label, onDark && { color: colors.textMutedOnDark }]}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    position: 'absolute',
    top: 0,
    bottom: 26,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  score: { fontSize: 50, fontWeight: '800', letterSpacing: -1 },
  bandPill: {
    paddingHorizontal: 12,
    paddingVertical: 3,
    borderRadius: 999,
    marginTop: 2,
  },
  band: { fontSize: font.tiny, fontWeight: '800', letterSpacing: 0.5 },
  label: { marginTop: 10, fontSize: font.small, color: colors.textMuted, fontWeight: '600' },
});
