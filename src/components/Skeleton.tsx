import React, { useEffect, useRef, useState } from 'react';
import { Animated, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { makeStyles, radius, useTheme } from '@/theme';

// Shimmering placeholder: a soft highlight sweeps across the block (the
// Facebook/LinkedIn loading register), not just an opacity pulse.
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
  const { isDark } = useTheme();
  const styles = useStyles();
  const sweep = useRef(new Animated.Value(0)).current;
  const [w, setW] = useState(0);

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(sweep, { toValue: 1, duration: 1300, useNativeDriver: true })
    );
    loop.start();
    return () => loop.stop();
  }, [sweep]);

  const translateX = sweep.interpolate({
    inputRange: [0, 1],
    outputRange: [-Math.max(w, 60), Math.max(w, 60)],
  });
  const highlight = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.85)';

  return (
    <Animated.View
      onLayout={(e) => setW(e.nativeEvent.layout.width)}
      style={[
        styles.base,
        { height, borderRadius: round ? 999 : radius.md, overflow: 'hidden' },
        width !== undefined ? { width: width as ViewStyle['width'] } : null,
        style,
      ]}
    >
      <Animated.View style={{ flex: 1, transform: [{ translateX }] }}>
        <LinearGradient
          colors={['transparent', highlight, 'transparent']}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={{ flex: 1, width: '100%' }}
        />
      </Animated.View>
    </Animated.View>
  );
}

const useStyles = makeStyles((colors) => ({
  base: { backgroundColor: colors.cardMuted, width: '100%' as const },
}));
