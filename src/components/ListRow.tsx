import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { font, makeStyles, useColors, weight } from '@/theme';
import Icon, { IconName } from '@/components/Icon';

interface Props {
  icon: IconName;
  tint: string; // icon tile colour
  label: string;
  hint?: string;
  onPress?: () => void;
  destructive?: boolean;
  right?: React.ReactNode; // custom trailing element (replaces chevron)
}

// Settings-style row: tinted icon tile, label + optional hint, chevron.
// Compose inside a Card with <RowDivider/> between rows.
export default function ListRow({ icon, tint, label, hint, onPress, destructive, right }: Props) {
  const colors = useColors();
  const styles = useStyles();
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <View style={[styles.tile, { backgroundColor: tint + '1A' }]}>
        <Icon name={icon} size={18} color={tint} strokeWidth={1.9} />
      </View>
      <View style={styles.body}>
        <Text style={[styles.label, destructive && { color: colors.low }]}>{label}</Text>
        {hint ? <Text style={styles.hint}>{hint}</Text> : null}
      </View>
      {right ?? (onPress ? <Icon name="chevronRight" size={16} color={colors.textFaint} /> : null)}
    </Pressable>
  );
}

export function RowDivider() {
  const styles = useStyles();
  return <View style={styles.divider} />;
}

const useStyles = makeStyles((colors) => ({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
    paddingHorizontal: 16,
  },
  pressed: { backgroundColor: colors.surfaceAlt },
  tile: {
    width: 32,
    height: 32,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  body: { flex: 1 },
  label: { fontSize: font.body, fontWeight: weight.medium, color: colors.text, letterSpacing: -0.1 },
  hint: { fontSize: font.small, color: colors.textMuted, marginTop: 1 },
  divider: { height: 1, backgroundColor: colors.line, marginLeft: 60 },
}));
