import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Text, View } from 'react-native';
import { font, makeStyles, spacing } from '@/theme';

// Branded app-open launcher. Shown while the app boots (loads credentials,
// restores session, decides the first screen) so opening EduBand feels
// intentional instead of flashing straight onto a raw screen.
export default function LaunchScreen() {
  const styles = useStyles();
  const fade = useRef(new Animated.Value(0)).current;
  const rise = useRef(new Animated.Value(16)).current;
  const pulse = useRef(new Animated.Value(0.85)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade, {
        toValue: 1,
        duration: 600,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(rise, {
        toValue: 0,
        duration: 600,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();

    // gentle, continuous "listening" pulse on the mark
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 900,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0.85,
          duration: 900,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [fade, rise, pulse]);

  return (
    <View style={styles.root}>
      <Animated.View
        style={[styles.center, { opacity: fade, transform: [{ translateY: rise }] }]}
      >
        <Animated.View style={[styles.mark, { transform: [{ scale: pulse }] }]}>
          {/* three bars = a tiny equaliser, echoing "voice made visible" */}
          <View style={[styles.bar, { height: 16 }]} />
          <View style={[styles.bar, { height: 34 }]} />
          <View style={[styles.bar, { height: 24 }]} />
        </Animated.View>

        <Text style={styles.wordmark}>EduBand</Text>
        <Text style={styles.tagline}>Speaking is a skill.</Text>
      </Animated.View>

      <Animated.Text style={[styles.footer, { opacity: fade }]}>
        Measuring how you actually speak
      </Animated.Text>
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: { alignItems: 'center' },
  mark: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    height: 80,
    width: 80,
    justifyContent: 'center',
    borderRadius: 24,
    backgroundColor: 'rgba(255,56,92,0.08)',
    marginBottom: spacing.lg,
  },
  bar: {
    width: 8,
    borderRadius: 6,
    backgroundColor: colors.primary,
  },
  wordmark: {
    fontSize: 40,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -1,
  },
  tagline: {
    fontSize: font.body,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  footer: {
    position: 'absolute',
    bottom: spacing.xxl,
    fontSize: font.tiny,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: colors.textFaint,
  },
}));
