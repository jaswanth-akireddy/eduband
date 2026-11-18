import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { RootStackParamList } from '@/navigation/types';
import { Role } from '@/types';
import { font, makeStyles, radius, shadow, spacing, useColors } from '@/theme';
import { saveRole } from '@/storage/store';
import GradientBackground from '@/components/GradientBackground';
import Icon, { IconName } from '@/components/Icon';

type Props = NativeStackScreenProps<RootStackParamList, 'RoleSelect'>;

interface RoleCard {
  role: Role;
  icon: IconName;
  title: string;
  subtitle: string;
  tintKey: 'roleStudent' | 'roleTeacher' | 'roleParent' | 'rolePro';
}

// Subtitles are kept to one line at 390pt on purpose. When one of the four
// wrapped and the others did not, that card came out visibly shorter and the
// list lost its rhythm.
//
// Icons name the person, not the action: `waveform` used to mark Teacher, but
// it means "recording" on every other screen, and students record too.
const ROLES: RoleCard[] = [
  {
    role: 'student',
    icon: 'book',
    title: 'Student',
    subtitle: 'Practise and track your speaking',
    tintKey: 'roleStudent',
  },
  {
    role: 'teacher',
    icon: 'doc',
    title: 'Teacher',
    subtitle: 'Analyse your teaching and content',
    tintKey: 'roleTeacher',
  },
  {
    role: 'parent',
    icon: 'person',
    title: 'Parent',
    subtitle: "Follow your child's progress",
    tintKey: 'roleParent',
  },
  {
    role: 'professional',
    icon: 'target',
    title: 'Professional',
    subtitle: 'Interview and presentation prep',
    tintKey: 'rolePro',
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
          <Text style={styles.subtitle}>How will you be using it?</Text>

          <View style={styles.cards}>
            {ROLES.map((r) => {
              // Resolved here, not at module scope: ROLES used to bake in the
              // static light palette, so the tiles kept their light tints in
              // dark mode.
              const tint = colors[r.tintKey];
              return (
              <Pressable
                key={r.role}
                onPress={() => pick(r.role)}
                accessibilityRole="button"
                accessibilityLabel={`Continue as ${r.title}. ${r.subtitle}`}
                style={({ pressed }) => [
                  styles.card,
                  shadow.card,
                  pressed && styles.pressed,
                ]}
              >
                <View style={[styles.iconCircle, { backgroundColor: tint + '16' }]}>
                  <Icon name={r.icon} size={22} color={tint} strokeWidth={1.9} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle}>{r.title}</Text>
                  <Text style={styles.cardSub}>{r.subtitle}</Text>
                </View>
                <Icon name="chevronRight" size={16} color={colors.textFaint} />
              </Pressable>
              );
            })}
          </View>

          <Text style={styles.footer}>
            You can switch roles anytime from your profile.
          </Text>
          {/* Shipped builds should not offer an API-key screen to a student. */}
          {__DEV__ ? (
            <Pressable
              onPress={() => navigation.navigate('ApiKeys')}
              accessibilityRole="button"
              accessibilityLabel="Developer settings"
              hitSlop={12}
              style={styles.devLinkHit}
            >
              <Text style={styles.devLink}>Developer settings</Text>
            </Pressable>
          ) : null}
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
  logoText: { color: colors.white, fontSize: 34, fontWeight: '700', letterSpacing: -0.5 },
  title: {
    fontSize: font.h1,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
    marginTop: spacing.lg,
    letterSpacing: -0.25,
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
  cardTitle: { fontSize: font.h3, fontWeight: '600', color: colors.text, letterSpacing: -0.1 },
  cardSub: { fontSize: font.small, color: colors.textMuted, marginTop: 2 },
  footer: {
    color: colors.textFaint,
    fontSize: font.tiny,
    textAlign: 'center',
    marginTop: spacing.xl,
  },
  devLinkHit: { alignSelf: 'center', minHeight: 44, justifyContent: 'center' },
  devLink: {
    color: colors.textMuted,
    fontSize: font.small,
    fontWeight: '500',
    textAlign: 'center',
  },
}));
