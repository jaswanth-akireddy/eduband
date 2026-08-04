import React from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { makeStyles, radius, shadow, spacing } from '@/theme';

interface Props {
  children: React.ReactNode;
  style?: ViewStyle;
  // 'glass' (default) = elevated surface card; 'solid' = flat tonal surface.
  variant?: 'glass' | 'solid';
}

// Grouped-canvas card: borderless white surface floating on a whisper of
// shadow (Apple Health register). A hairline keeps edges crisp on low-DPI.
export default function Card({ children, style, variant = 'glass' }: Props) {
  const styles = useStyles();
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

const useStyles = makeStyles((colors) => ({
  base: {
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  elevated: {
    backgroundColor: colors.surface,
    borderColor: colors.glassBorder,
  },
  solid: {
    backgroundColor: colors.surfaceAlt,
    borderColor: 'transparent',
  },
}));
