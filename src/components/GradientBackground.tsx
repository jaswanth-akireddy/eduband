import React from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '@/theme';

// Obsidian mesh backdrop with blurred iridescent "blobs" for depth.
// (RN has no blur fill, so we use large, soft, low-opacity radial-ish circles.)
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
      start={{ x: 0.1, y: 0 }}
      end={{ x: 0.9, y: 1 }}
      style={[styles.fill, style]}
    >
      <View style={[styles.blob, styles.blobTop]} />
      <View style={[styles.blob, styles.blobBottom]} />
      <View style={[styles.blob, styles.blobPink]} />
      {children}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: colors.bg },
  blob: {
    position: 'absolute',
    borderRadius: 999,
    opacity: 0.22,
  },
  blobTop: {
    width: 320,
    height: 320,
    top: -120,
    right: -80,
    backgroundColor: colors.violet,
  },
  blobBottom: {
    width: 300,
    height: 300,
    bottom: 40,
    left: -120,
    backgroundColor: colors.blue,
    opacity: 0.18,
  },
  blobPink: {
    width: 240,
    height: 240,
    bottom: -60,
    right: -60,
    backgroundColor: colors.pink,
    opacity: 0.14,
  },
});
