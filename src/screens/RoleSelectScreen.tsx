import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { RootStackParamList } from '@/navigation/types';
import { Role } from '@/types';
import { colors, font, makeStyles, radius, shadow, spacing, useColors } from '@/theme';
import { saveRole } from '@/storage/store';
import GradientBackground from '@/components/GradientBackground';
import Icon, { IconName } from '@/components/Icon';

type Props = NativeStackScreenProps<RootStackParamList, 'RoleSelect'>;

interface RoleCard {
  role: Role;
  icon: IconName;
  title: string;
  subtitle: string;
  tint: string;
}

const ROLES: RoleCard[] = [
  {
    role: 'student',
    icon: 'book',
    title: 'Student',
    subtitle: 'Record, practise & track your speaking',
    tint: colors.blue,
  },
  {
    role: 'teacher',
    icon: 'waveform',
    title: 'Teacher',
    subtitle: 'Analyse your teaching & content',
    tint: colors.violet,
  },
  {
    role: 'parent',
    icon: 'person',
    title: 'Parent',
    subtitle: "See your child's communication insights",
    tint: colors.pink,
  },
  {
    role: 'professional',
    icon: 'target',
    title: 'Professional',
    subtitle: 'Interview, presentation & workplace prep',
    tint: colors.accent,
  },
];

export default function RoleSelectScreen({ navigation }: Props) {
  const colors = useColors();
  const styles = useStyles();
  async function pick(role: Role) {
    await saveRole(role);
    // Go through auth (real login when Supabase is configured; the Auth screen
    // offers a local "continue" when it isn't).
    navigation.navigate('Auth', { role });
  }

  return (
    <GradientBackground>
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
        <ScrollView contentContainerStyle={styles.container}>
          <View style={styles.logoWrap}>
            <LinearGradient
              colors={colors.iridescent}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.logo, shadow.glow]}
            >
              <Text style={styles.logoText}>EB</Text>
            </LinearGradient>
          </View>

          <Text style={styles.title}>Welcome to EduBand</Text>
          <Text style={styles.subtitle}>How will you be using EduBand?</Text>

          <View style={styles.cards}>
            {ROLES.map((r) => (
              <Pressable
                key={r.role}
                onPress={() => pick(r.role)}
                style={({ pressed }) => [
                  styles.card,
                  shadow.card,
                  pressed && styles.pressed,
                ]}
              >
                <View style={[styles.iconCircle, { backgroundColor: r.tint + '16' }]}>
                  <Icon name={r.icon} size={22} color={r.tint} strokeWidth={1.9} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle}>{r.title}</Text>
                  <Text style={styles.cardSub}>{r.subtitle}</Text>
                </View>
                <Icon name="chevronRight" size={16} color={colors.textFaint} />
              </Pressable>
            ))}
          </View>

          <Text style={styles.footer}>
            You can switch roles anytime from your profile.
          </Text>
          <Text style={styles.devLink} onPress={() => navigation.navigate('ApiKeys')}>
            Developer settings
          </Text>
        </ScrollView>
      </SafeAreaView>
    </GradientBackground>
  );
}

const useStyles = makeStyles((colors) => ({
  container: { padding: spacing.lg, flexGrow: 1 },
  logoWrap: { alignItems: 'center', marginTop: spacing.xl },
  logo: {
    width: 88,
    height: 88,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: { color: colors.white, fontSize: 34, fontWeight: '700', letterSpacing: -1 },
  title: {
    fontSize: font.h1,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
    marginTop: spacing.lg,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: font.body,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.xs,
    marginBottom: spacing.xl,
  },
  cards: { gap: spacing.md },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.glass,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  pressed: { opacity: 0.85, transform: [{ scale: 0.99 }] },
  iconCircle: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  cardTitle: { fontSize: font.h3, fontWeight: '600', color: colors.text, letterSpacing: -0.2 },
  cardSub: { fontSize: font.small, color: colors.textMuted, marginTop: 2 },
  footer: {
    color: colors.textFaint,
    fontSize: font.tiny,
    textAlign: 'center',
    marginTop: spacing.xl,
  },
  devLink: {
    color: colors.textMuted,
    fontSize: font.small,
    fontWeight: '500',
    textAlign: 'center',
    marginTop: spacing.md,
  },
}));
