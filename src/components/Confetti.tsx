import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Dimensions, StyleSheet, View } from 'react-native';

// Lightweight confetti burst — no native dependency. One shared Animated.Value
// drives every piece via interpolation, so it's cheap. Fires once each time
// `trigger` flips to true (e.g. Communication Index improved).
const PIECES = 42;
const PALETTE = ['#FF385C', '#008489', '#FFB400', '#7B61FF', '#00A699', '#FC642D', '#12B886'];
const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

export default function Confetti({ trigger }: { trigger: boolean }) {
  const progress = useRef(new Animated.Value(0)).current;
  const [visible, setVisible] = useState(false);

  const pieces = useMemo(
    () =>
      Array.from({ length: PIECES }, () => ({
        startX: SCREEN_W / 2 + (Math.random() - 0.5) * 120,
        endX: SCREEN_W * Math.random(),
        size: 7 + Math.random() * 7,
        color: PALETTE[Math.floor(Math.random() * PALETTE.length)],
        rotateTo: `${(Math.random() > 0.5 ? 1 : -1) * (180 + Math.random() * 540)}deg`,
        drift: -30 - Math.random() * 40, // initial upward pop before falling
      })),
    []
  );

  useEffect(() => {
    if (!trigger) return;
    setVisible(true);
    progress.setValue(0);
    Animated.timing(progress, {
      toValue: 1,
      duration: 2600,
      useNativeDriver: true,
    }).start(() => setVisible(false));
  }, [trigger, progress]);

  if (!visible) return null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {pieces.map((p, i) => {
        const translateY = progress.interpolate({
          inputRange: [0, 0.15, 1],
          outputRange: [0, p.drift, SCREEN_H * 0.95],
        });
        const translateX = progress.interpolate({
          inputRange: [0, 1],
          outputRange: [p.startX, p.endX],
        });
        const rotate = progress.interpolate({
          inputRange: [0, 1],
          outputRange: ['0deg', p.rotateTo],
        });
        const opacity = progress.interpolate({
          inputRange: [0, 0.75, 1],
          outputRange: [1, 1, 0],
        });
        return (
          <Animated.View
            key={i}
            style={[
              styles.piece,
              {
                width: p.size,
                height: p.size * 0.6,
                backgroundColor: p.color,
                opacity,
                transform: [{ translateX }, { translateY }, { rotate }],
              },
            ]}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  piece: { position: 'absolute', top: 0, left: 0, borderRadius: 2 },
});
