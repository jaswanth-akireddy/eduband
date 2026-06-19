import React from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { colors, radius, shadow, spacing } from '@/theme';

interface Props {
  children: React.ReactNode;
  style?: ViewStyle;
  // 'glass' (default) = frosted card on the obsidian bg; 'solid' = opaque surface
  variant?: 'glass' | 'solid';
}

// Glassmorphic card: translucent white over the dark mesh, thin light border.
export default function Card({ children, style, variant = 'glass' }: Props) {
  return (
    <View
      style={[
        styles.base,
        variant === 'glass' ? styles.glass : styles.solid,
        shadow.card,
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
  },
  glass: {
    backgroundColor: colors.glass,
    borderColor: colors.glassBorder,
  },
  solid: {
    backgroundColor: colors.surface,
    borderColor: colors.line,
  },
});
