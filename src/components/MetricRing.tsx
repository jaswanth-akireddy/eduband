import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { makeStyles, scoreColor, useColors } from '@/theme';

interface Props {
  value: number; // 0-100
  label: string;
  size?: number;
}

// A single Whoop-style full-circle progress ring: value in the centre, coloured
// by score band, with a label beneath. Composed in a row for the dashboard.
export default function MetricRing({ value, label, size = 96 }: Props) {
  const colors = useColors();
  const styles = useStyles();
  const v = Math.max(0, Math.min(100, Math.round(value)));
  const stroke = 9;
  const r = (100 - stroke) / 2;
  const c = 2 * Math.PI * r;
  const dash = (c * v) / 100;
  const color = scoreColor(v);

  return (
    <View style={styles.item}>
      <View style={{ width: size, height: size }}>
        <Svg width={size} height={size} viewBox="0 0 100 100">
          <Circle cx={50} cy={50} r={r} stroke={colors.cardMuted} strokeWidth={stroke} fill="none" />
          <Circle
            cx={50}
            cy={50}
            r={r}
            stroke={color}
            strokeWidth={stroke}
            strokeLinecap="round"
            fill="none"
            strokeDasharray={`${dash} ${c - dash}`}
            transform="rotate(-90 50 50)"
          />
        </Svg>
        <View style={[StyleSheet.absoluteFill, styles.center]}>
          <Text style={[styles.value, { fontSize: Math.round(size * 0.3) }]}>{v}</Text>
        </View>
      </View>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  item: { alignItems: 'center' as const },
  center: { alignItems: 'center', justifyContent: 'center' },
  value: {
    color: colors.text,
    fontWeight: '800',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  label: {
    marginTop: 8,
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '700',
  },
}));
