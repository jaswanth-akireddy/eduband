import React from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { CompositeScreenProps } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { RootStackParamList, TeacherTabsParamList } from '@/navigation/types';
import { colors, font, radius, scoreColor, spacing } from '@/theme';
import { DEMO_TEACHING_SESSIONS } from '@/data/teaching';
import GradientBackground from '@/components/GradientBackground';
import Card from '@/components/Card';
import Button from '@/components/Button';

type Props = CompositeScreenProps<
  BottomTabScreenProps<TeacherTabsParamList, 'TeacherHome'>,
  NativeStackScreenProps<RootStackParamList>
>;

export default function TeacherHomeScreen({ navigation }: Props) {
  const sessions = DEMO_TEACHING_SESSIONS;

  return (
    <GradientBackground>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxl }}>
          <Text style={styles.hi}>Hi, Ms. Rao</Text>
          <Text style={styles.sub}>Analyse a teaching session.</Text>

          <Button
            title="Record with phone mic"
            icon="🎙️"
            onPress={() => navigation.navigate('TeacherRecord')}
            style={{ marginTop: spacing.md }}
          />
          <Button
            title="Use EduBand band"
            icon="🎧"
            variant="secondary"
            onPress={() =>
              Alert.alert(
                'Capture with your band',
                'Wear your EduBand band during class. It records only you (speaker verification) and syncs the teaching transcript afterward — just like the student Language Lab. (Phase 2 hardware; demo.)'
              )
            }
            style={{ marginTop: spacing.sm }}
          />

          <Pressable
            onPress={() =>
              Alert.alert(
                'Attach materials',
                'Upload a lesson plan, slides, or topic list. EduBand compares what you planned against what you actually taught. (Demo)'
              )
            }
          >
            <Card style={styles.attachCard}>
              <Text style={styles.attachTitle}>📎  Attach teaching materials</Text>
              <Text style={styles.attachSub}>Lesson plan, slides, or topic list</Text>
            </Card>
          </Pressable>

          <Text style={styles.section}>Recent sessions</Text>
          {sessions.map((s) => (
            <Pressable
              key={s.id}
              onPress={() => navigation.navigate('TeacherReport', { sessionId: s.id })}
            >
              <Card style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowTitle} numberOfLines={1}>{s.title}</Text>
                  <Text style={styles.rowMeta}>
                    {timeAgo(s.date)} · coverage {s.analysis.coverage.coveragePct}%
                  </Text>
                </View>
                <View style={[styles.scorePill, { backgroundColor: scoreColor(s.analysis.ci) + '2E' }]}>
                  <Text style={[styles.scoreText, { color: scoreColor(s.analysis.ci) }]}>
                    {s.analysis.ci}
                  </Text>
                </View>
              </Card>
            </Pressable>
          ))}

          <Card style={{ marginTop: spacing.sm }}>
            <Text style={styles.weekLabel}>This week</Text>
            <Row label="Avg delivery" value="79" tint={colors.good} />
            <Row label="Avg topic coverage" value="88%" tint={colors.good} />
          </Card>
        </ScrollView>
      </SafeAreaView>
    </GradientBackground>
  );
}

function Row({ label, value, tint }: { label: string; value: string; tint: string }) {
  return (
    <View style={styles.statRow}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, { color: tint }]}>{value}</Text>
    </View>
  );
}

function timeAgo(ms: number): string {
  const h = Math.round((Date.now() - ms) / (1000 * 60 * 60));
  if (h < 1) return 'Just now';
  if (h < 24) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
}

const styles = StyleSheet.create({
  hi: { fontSize: font.h1, fontWeight: '800', color: colors.text, letterSpacing: -0.5 },
  sub: { fontSize: font.body, color: colors.textMuted, marginTop: 2, marginBottom: spacing.sm },
  attachCard: { borderStyle: 'dashed' as const, marginTop: spacing.md },
  attachTitle: { fontSize: font.body, fontWeight: '700', color: colors.text },
  attachSub: { fontSize: font.small, color: colors.textMuted, marginTop: 4 },
  section: { fontSize: font.h3, fontWeight: '700', color: colors.text, marginTop: spacing.lg, marginBottom: spacing.md },
  row: { flexDirection: 'row', alignItems: 'center' },
  rowTitle: { fontSize: font.body, fontWeight: '600', color: colors.text },
  rowMeta: { fontSize: font.small, color: colors.textMuted, marginTop: 2 },
  scorePill: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  scoreText: { fontSize: font.h3, fontWeight: '800' },
  weekLabel: { fontSize: font.small, color: colors.textMuted, fontWeight: '700', marginBottom: spacing.sm },
  statRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6 },
  statLabel: { fontSize: font.body, color: colors.text },
  statValue: { fontSize: font.h3, fontWeight: '800' },
});
