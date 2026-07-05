import React, { useEffect, useRef } from 'react';
import { Animated, ViewStyle } from 'react-native';
import { makeStyles, radius } from '@/theme';

// Shimmering placeholder block for loading states (Airbnb-style skeletons).
export default function Skeleton({
  width,
  height = 16,
  round,
  style,
}: {
  width?: number | string;
  height?: number;
  round?: boolean;
  style?: ViewStyle;
}) {
  const opacity = useRef(new Animated.Value(0.45)).current;
  const styles = useStyles();

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 750, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.45, duration: 750, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        styles.base,
        { height, borderRadius: round ? 999 : radius.md, opacity },
        width !== undefined ? { width: width as ViewStyle['width'] } : null,
        style,
      ]}
    />
  );
}

const useStyles = makeStyles((colors) => ({
  base: { backgroundColor: colors.cardMuted, width: '100%' as const },
}));
