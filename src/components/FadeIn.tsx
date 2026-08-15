import React, { useEffect, useRef } from 'react';
import { Animated, Easing, ViewStyle } from 'react-native';
import { useReducedMotion } from '@/hooks/useReducedMotion';

interface Props {
  children: React.ReactNode;
  delay?: number; // stagger offset — 60-80ms between siblings reads best
  distance?: number; // how far it rises
  style?: ViewStyle;
}

// Content settles in rather than snapping: a short fade + rise on mount.
// Native-driven (opacity/transform only), so it stays on the UI thread.
export default function FadeIn({ children, delay = 0, distance = 12, style }: Props) {
  const reduceMotion = useReducedMotion();
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (reduceMotion) {
      anim.setValue(1); // show instantly, no rise
      return;
    }
    Animated.timing(anim, {
      toValue: 1,
      duration: 420,
      delay,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [anim, delay, reduceMotion]);

  return (
    <Animated.View
      style={[
        style,
        {
          opacity: anim,
          transform: [
            {
              translateY: anim.interpolate({
                inputRange: [0, 1],
                outputRange: [distance, 0],
              }),
            },
          ],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}
