import React from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { RootStackParamList } from '@/navigation/types';
import { colors, font, radius, scoreColor, shadow, spacing } from '@/theme';
import { clearRole } from '@/storage/store';
import GradientBackground from '@/components/GradientBackground';
import Card from '@/components/Card';
import Button from '@/components/Button';

type Props = NativeStackScreenProps<RootStackParamList, 'ProfessionalHome'>;

const MODULES = [
  { emoji: '🎤', title: 'Interview prep', sub: 'Answer like a pro, on the spot', tint: colors.blue },
  { emoji: '📊', title: 'Presentations', sub: 'Open strong, land your points', tint: colors.violet },
  { emoji: '💬', title: 'Workplace English', sub: 'Clear, confident day-to-day', tint: colors.accent },
  { emoji: '🤝', title: 'Client conversations', sub: 'Persuade with warmth', tint: colors.pink },
];

export default function ProfessionalHomeScreen({ navigation }: Props) {
  async function switchRole() {
    await clearRole();
    navigation.reset({ index: 0, routes: [{ name: 'RoleSelect' }] });
  }

  return (
    <GradientBackground>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxl }}>
          <Text style={styles.hi}>Good evening, Sam</Text>
          <Text style={styles.sub}>Sharpen your professional voice.</Text>

          <Text style={styles.section}>Practice modules</Text>
          <View style={styles.grid}>
            {MODULES.map((m) => (
              <Pressable
                key={m.title}
                style={({ pressed }) => [styles.module, shadow.card, pressed && { opacity: 0.85 }]}
                onPress={() => Alert.alert(m.title, 'Module practice (demo).')}
              >
                <View style={[styles.iconCircle, { backgroundColor: m.tint + '2E' }]}>
                  <Text style={{ fontSize: 20 }}>{m.emoji}</Text>
                </View>
                <Text style={styles.modTitle}>{m.title}</Text>
                <Text style={styles.modSub}>{m.sub}</Text>
              </Pressable>
            ))}
          </View>

          <Card style={styles.latest}>
            <View style={{ flex: 1 }}>
              <Text style={styles.latestTitle}>Latest: Mock interview</Text>
              <Text style={styles.latestSub}>Strong structure · reduce fillers (12)</Text>
            </View>
            <Text style={[styles.latestScore, { color: scoreColor(79) }]}>79</Text>
          </Card>

          <Button
            title="Start a practice session"
            icon="🎙️"
            onPress={() => Alert.alert('Practice', 'Recording flow (demo).')}
          />
          <Button title="Switch role" variant="ghost" onPress={switchRole} style={{ marginTop: spacing.xs }} />
        </ScrollView>
      </SafeAreaView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  hi: { fontSize: font.h1, fontWeight: '800', color: colors.text, letterSpacing: -0.5 },
  sub: { fontSize: font.body, color: colors.textMuted, marginTop: 2 },
  section: { fontSize: font.h3, fontWeight: '700', color: colors.text, marginTop: spacing.lg, marginBottom: spacing.md },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: spacing.md },
  module: {
    width: '47%',
    backgroundColor: colors.glass,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  iconCircle: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.md },
  modTitle: { fontSize: font.body, fontWeight: '700', color: colors.text },
  modSub: { fontSize: font.tiny, color: colors.textMuted, marginTop: 2 },
  latest: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.lg },
  latestTitle: { fontSize: font.body, fontWeight: '700', color: colors.text },
  latestSub: { fontSize: font.small, color: colors.textMuted, marginTop: 2 },
  latestScore: { fontSize: font.h1, fontWeight: '800', marginLeft: spacing.md },
});
