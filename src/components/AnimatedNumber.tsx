import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Text, TextStyle } from 'react-native';
import { useReducedMotion } from '@/hooks/useReducedMotion';

interface Props {
  value: number;
  duration?: number;
  delay?: number;
  style?: TextStyle | TextStyle[];
}

// Count-up number: rolls from 0 to `value` with an ease-out, the way scores
// land in Apple Fitness / Duolingo. Re-rolls when `value` changes.
export default function AnimatedNumber({ value, duration = 900, delay = 0, style }: Props) {
  const reduceMotion = useReducedMotion();
  const anim = useRef(new Animated.Value(0)).current;
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (reduceMotion) {
      setDisplay(value);
      return;
    }
    const id = anim.addListener(({ value: v }) => setDisplay(Math.round(v)));
    Animated.timing(anim, {
      toValue: value,
      duration,
      delay,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false, // drives a JS listener, not a transform
    }).start();
    return () => anim.removeListener(id);
  }, [value, duration, delay, anim, reduceMotion]);

  return <Text style={style}>{display}</Text>;
}
