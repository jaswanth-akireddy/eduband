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
import { colors, font, radius, shadow, spacing } from '@/theme';

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

const styles = StyleSheet.create({
  shadowWrap: { borderRadius: radius.md },
  base: {
    minHeight: 56,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  row: { flexDirection: 'row', alignItems: 'center' },
  icon: { fontSize: font.body, marginRight: spacing.sm },
  secondary: {
    backgroundColor: colors.glass,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  ghost: { backgroundColor: 'transparent', minHeight: 48 },
  disabled: { opacity: 0.45 },
  pressed: { opacity: 0.9, transform: [{ scale: 0.985 }] },
  text: { fontSize: font.body, fontWeight: '700', letterSpacing: 0.2 },
  textPrimary: { color: colors.white },
  textSecondary: { color: colors.text },
  textGhost: { color: colors.primary },
});
