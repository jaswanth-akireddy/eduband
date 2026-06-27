import React from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { colors, radius, shadow, spacing } from '@/theme';

interface Props {
  children: React.ReactNode;
  style?: ViewStyle;
  // 'glass' (default) = elevated white card; 'solid' = flat off-white surface.
  variant?: 'glass' | 'solid';
}

// Airbnb-style card: clean white, hairline border, soft low-contrast shadow.
export default function Card({ children, style, variant = 'glass' }: Props) {
  return (
    <View
      style={[
        styles.base,
        variant === 'glass' ? styles.elevated : styles.solid,
        variant === 'glass' && shadow.card,
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
  elevated: {
    backgroundColor: colors.surface,
    borderColor: colors.line,
  },
  solid: {
    backgroundColor: colors.surfaceAlt,
    borderColor: colors.line,
  },
});
