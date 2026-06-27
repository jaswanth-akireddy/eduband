import React from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '@/theme';

// Clean, airy light canvas. A barely-there warm wash at the top keeps it from
// feeling clinical; no heavy blobs — the content does the talking.
export default function GradientBackground({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: ViewStyle;
}) {
  return (
    <LinearGradient
      colors={colors.bgGradient}
      start={{ x: 0.5, y: 0 }}
      end={{ x: 0.5, y: 1 }}
      style={[styles.fill, style]}
    >
      <View style={styles.wash} pointerEvents="none" />
      {children}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: colors.bg },
  // a soft coral halo, almost imperceptible, anchored top-right
  wash: {
    position: 'absolute',
    width: 360,
    height: 360,
    borderRadius: 999,
    top: -180,
    right: -120,
    backgroundColor: colors.primary,
    opacity: 0.05,
  },
});
