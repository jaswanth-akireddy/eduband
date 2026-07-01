import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';

// Lightweight "listening" waveform: a row of bars that pulse on staggered loops
// while recording. Purely decorative (driven by Animated, not real mic level —
// device metering is unreliable on Android), but it makes the record state feel
// alive the way voice apps do.
const BAR_COUNT = 7;

export default function RecordingWave({
  color,
  active,
}: {
  color: string;
  active: boolean;
}) {
  const values = useRef(
    Array.from({ length: BAR_COUNT }, () => new Animated.Value(0.35))
  ).current;

  useEffect(() => {
    if (!active) return;
    const loops = values.map((v, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(v, {
            toValue: 1,
            duration: 260 + (i % 3) * 90,
            delay: i * 70,
            useNativeDriver: true,
          }),
          Animated.timing(v, {
            toValue: 0.35,
            duration: 260 + (i % 3) * 90,
            useNativeDriver: true,
          }),
        ])
      )
    );
    loops.forEach((l) => l.start());
    return () => loops.forEach((l) => l.stop());
  }, [active, values]);

  if (!active) return null;

  return (
    <View style={styles.row} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {values.map((v, i) => (
        <Animated.View
          key={i}
          style={[styles.bar, { backgroundColor: color, transform: [{ scaleY: v }] }]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', height: 40, gap: 5 },
  bar: { width: 4, height: 36, borderRadius: 2 },
});
