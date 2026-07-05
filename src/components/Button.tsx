import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { font, fontFamily, makeStyles, radius, shadow, spacing, useColors, weight } from '@/theme';

interface Props {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost';
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  icon?: string; // optional leading glyph/emoji
}

export default function Button({
  title,
  onPress,
  variant = 'primary',
  disabled,
  loading,
  style,
  icon,
}: Props) {
  const isPrimary = variant === 'primary';
  const isGhost = variant === 'ghost';
  const colors = useColors();
  const styles = useStyles();

  const content = (
    <>
      {loading ? (
        <ActivityIndicator color={isPrimary ? colors.white : colors.primary} />
      ) : (
        <View style={styles.row}>
          {icon ? <Text style={styles.icon}>{icon}</Text> : null}
          <Text
            style={[
              styles.text,
              isPrimary ? styles.textPrimary : styles.textSecondary,
              isGhost && styles.textGhost,
            ]}
          >
            {title}
          </Text>
        </View>
      )}
    </>
  );

  if (isPrimary) {
    return (
      <Pressable
        onPress={onPress}
        disabled={disabled || loading}
        style={({ pressed }) => [
          styles.shadowWrap,
          shadow.glow,
          (disabled || loading) && styles.disabled,
          pressed && styles.pressed,
          style,
        ]}
      >
        <LinearGradient
          colors={colors.iridescent}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.base}
        >
          {content}
        </LinearGradient>
      </Pressable>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.base,
        variant === 'secondary' && styles.secondary,
        isGhost && styles.ghost,
        (disabled || loading) && styles.disabled,
        pressed && styles.pressed,
        style,
      ]}
    >
      {content}
    </Pressable>
  );
}

const useStyles = makeStyles((colors) => ({
  shadowWrap: { borderRadius: radius.md },
  base: {
    minHeight: 48,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  row: { flexDirection: 'row', alignItems: 'center' },
  icon: { fontSize: font.body, marginRight: spacing.sm },
  // Airbnb's bordered secondary: white fill, near-black hairline border.
  secondary: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.text,
  },
  ghost: { backgroundColor: 'transparent', minHeight: 44 },
  disabled: { opacity: 0.4 },
  pressed: { opacity: 0.92, transform: [{ scale: 0.985 }] },
  text: {
    fontFamily,
    fontSize: font.body,
    fontWeight: weight.semibold,
    letterSpacing: 0.1,
  },
  textPrimary: { color: colors.white },
  textSecondary: { color: colors.text },
  textGhost: { color: colors.primary },
}));
