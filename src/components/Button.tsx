import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  Text,
  View,
  ViewStyle,
} from 'react-native';
import { fontFamily, makeStyles, radius, useColors, weight } from '@/theme';
import Icon, { IconName } from '@/components/Icon';

interface Props {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost';
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  icon?: IconName; // optional leading icon from the in-house set
}

// One confident primary (solid Rausch), a quiet tonal secondary, and a text
// ghost. 52pt targets, gentle press scale — no gradients, no glow.
export default function Button({
  title,
  onPress,
  variant = 'primary',
  disabled,
  loading,
  style,
  icon,
}: Props) {
  const colors = useColors();
  const styles = useStyles();
  const isPrimary = variant === 'primary';
  const isGhost = variant === 'ghost';

  const contentColor = isPrimary
    ? colors.white
    : isGhost
      ? colors.primary
      : colors.text;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.base,
        isPrimary && styles.primary,
        variant === 'secondary' && styles.secondary,
        isGhost && styles.ghost,
        (disabled || loading) && styles.disabled,
        pressed && styles.pressed,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={contentColor} />
      ) : (
        <View style={styles.row}>
          {icon ? (
            <View style={styles.iconWrap}>
              <Icon name={icon} size={19} color={contentColor} strokeWidth={2} />
            </View>
          ) : null}
          <Text style={[styles.text, { color: contentColor }]}>{title}</Text>
        </View>
      )}
    </Pressable>
  );
}

const useStyles = makeStyles((colors) => ({
  base: {
    minHeight: 52,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  primary: { backgroundColor: colors.primary },
  secondary: { backgroundColor: colors.surfaceAlt },
  ghost: { backgroundColor: 'transparent', minHeight: 44 },
  disabled: { opacity: 0.35 },
  pressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
  row: { flexDirection: 'row', alignItems: 'center' },
  iconWrap: { marginRight: 8 },
  text: {
    fontFamily,
    fontSize: 16,
    fontWeight: weight.semibold,
    letterSpacing: -0.2,
  },
}));
