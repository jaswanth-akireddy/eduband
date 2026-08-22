import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { makeStyles, scoreColor, useColors } from '@/theme';
import { useReducedMotion } from '@/hooks/useReducedMotion';

interface Props {
  value: number; // 0-100
  label: string;
  size?: number;
  delay?: number; // stagger offset for entrance
}

// A single Whoop-style full-circle progress ring: value in the centre, coloured
// by score band, with a label beneath. Sweeps from 0 to its value on entrance
// (the number counts up in sync), staggered per ring via `delay`.
export default function MetricRing({ value, label, size = 96, delay = 0 }: Props) {
  const colors = useColors();
  const styles = useStyles();
  const target = Math.max(0, Math.min(100, Math.round(value)));
  const reduceMotion = useReducedMotion();
  const anim = useRef(new Animated.Value(0)).current;
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (reduceMotion) {
      setProgress(target);
      return;
    }
    const id = anim.addListener(({ value: v }) => setProgress(v));
    Animated.timing(anim, {
      toValue: target,
      duration: 900,
      delay,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false, // drives SVG props via state
    }).start();
    return () => anim.removeListener(id);
  }, [target, delay, anim, reduceMotion]);

  const stroke = 7.5;
  const r = (100 - stroke) / 2;
  const c = 2 * Math.PI * r;
  const dash = (c * progress) / 100;
  const color = scoreColor(target);

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
          <Text style={[styles.value, { fontSize: Math.round(size * 0.3) }]}>
            {Math.round(progress)}
          </Text>
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
    fontWeight: '600',
    letterSpacing: -0.25,
    includeFontPadding: false,
    textAlignVertical: 'center',
    fontVariant: ['tabular-nums'],
  },
  label: {
    marginTop: 8,
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '500',
  },
}));
