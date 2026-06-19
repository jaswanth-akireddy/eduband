import React, { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { RootStackParamList } from '@/navigation/types';
import {
  colors,
  font,
  radius,
  scoreColor,
  scoreBand,
  spacing,
  pillarColor,
} from '@/theme';
import { getSession, getSessions } from '@/storage/store';
import { PillarScore, Session } from '@/types';
import { taskById } from '@/data/tasks';
import { pillarDef } from '@/analysis/framework';
import GradientBackground from '@/components/GradientBackground';
import ScoreRing from '@/components/ScoreRing';
import PillarRadar from '@/components/PillarRadar';
import Card from '@/components/Card';
import Button from '@/components/Button';

type Props = NativeStackScreenProps<RootStackParamList, 'Report'>;

export default function ReportScreen({ route, navigation }: Props) {
  const [session, setSession] = useState<Session | null>(null);
  const [prevCi, setPrevCi] = useState<number | null>(null);

  useFocusEffect(
    useCallback(() => {
      (async () => {
        const s = await getSession(route.params.sessionId);
        setSession(s);
        if (s) {
          const all = await getSessions();
          const older = all.filter((x) => x.createdAt < s.createdAt);
          setPrevCi(older.length ? older[0].analysis.ci : null);
        }
      })();
    }, [route.params.sessionId])
  );

  if (!session) {
    return (
      <View style={styles.loading}>
        <Text style={{ color: colors.textMuted }}>Loading report…</Text>
      </View>
    );
  }

  const { analysis } = session;
  const trend =
    prevCi != null ? analysis.ci - prevCi : null;
  const suggested = taskById(analysis.practiceSuggestionTaskId);
  const focusPillars = analysis.focusAreas
    .map((id) => analysis.pillars.find((p) => p.id === id))
    .filter(Boolean) as PillarScore[];

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={{ padding: spacing.lg }}
    >
      {/* Header */}
      <Text style={styles.task}>{session.taskPrompt}</Text>
      <Text style={styles.meta}>
        {formatDate(session.createdAt)} · {formatDuration(session.durationSec)}
      </Text>

      {/* Communication Index */}
      <Card style={{ alignItems: 'center', paddingVertical: spacing.xl }}>
        <ScoreRing score={analysis.ci} />
        {trend != null && (
          <Text
            style={[
              styles.trend,
              { color: trend >= 0 ? colors.good : colors.low },
            ]}
          >
            {trend > 0 ? '▲' : trend < 0 ? '▼' : '▬'}{' '}
            {trend === 0
              ? 'Same as last session'
              : `${Math.abs(trend)} points ${trend > 0 ? 'up' : 'down'} from last session`}
          </Text>
        )}
      </Card>

      {/* Pillar radar */}
      <Card>
        <Text style={styles.sectionTitle}>Your five pillars</Text>
        <PillarRadar pillars={analysis.pillars} />
        <View style={styles.pillarList}>
          {analysis.pillars.map((p) => (
            <View key={p.id} style={styles.pillarRow}>
              <Text style={styles.pillarName}>{p.label}</Text>
              <View style={styles.barTrack}>
                <View
                  style={[
                    styles.barFill,
                    { width: `${p.score}%`, backgroundColor: scoreColor(p.score) },
                  ]}
                />
              </View>
              <Text style={[styles.pillarScore, { color: scoreColor(p.score) }]}>
                {p.score}
              </Text>
            </View>
          ))}
        </View>
      </Card>

      {/* Strengths */}
      <Card>
        <Text style={styles.sectionTitle}>What's working</Text>
        {analysis.strengths.map((s, i) => (
          <View key={i} style={styles.bulletRow}>
            <Text style={styles.check}>✓</Text>
            <Text style={styles.bulletText}>{s}</Text>
          </View>
        ))}
      </Card>

      {/* Focus areas with evidence + next step */}
      <Text style={styles.focusHeading}>Your focus areas</Text>
      {focusPillars.map((p) => (
        <Card key={p.id}>
          <View style={styles.focusHeader}>
            <Text style={styles.focusTitle}>{p.label}</Text>
            <Text style={[styles.focusBand, { color: scoreColor(p.score) }]}>
              {scoreBand(p.score)} · {p.score}
            </Text>
          </View>
          {!!p.why && <Text style={styles.why}>{p.why}</Text>}
          <View style={styles.evidenceBox}>
            <Text style={styles.evidenceLabel}>From your speech</Text>
            <Text style={styles.evidenceText}>"{p.evidence}"</Text>
          </View>
          <View style={styles.tipBox}>
            <Text style={styles.tipLabel}>Try this next</Text>
            <Text style={styles.tipText}>{p.tip}</Text>
          </View>
        </Card>
      ))}

      {/* Practice suggestion */}
      {suggested && (
        <Card style={{ backgroundColor: colors.surface }}>
          <Text style={[styles.sectionTitle, { color: colors.textOnDark }]}>
            Recommended next task
          </Text>
          <Text style={styles.suggestPrompt}>{suggested.prompt}</Text>
          <Button
            title="Practise this"
            onPress={() =>
              navigation.replace('Record', { taskId: suggested.id })
            }
            style={{ marginTop: spacing.md }}
          />
        </Card>
      )}

      <Button
        title="Back to home"
        variant="ghost"
        onPress={() => navigation.navigate('Tabs', { screen: 'Home' })}
        style={{ marginBottom: spacing.xl }}
      />

      <Text style={styles.version}>
        Framework v{analysis.frameworkVersion} · Model {analysis.modelVersion}
      </Text>
    </ScrollView>
  );
}

function formatDate(ms: number): string {
  return new Date(ms).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  task: { fontSize: font.h3, fontWeight: '700', color: colors.text, lineHeight: 26 },
  meta: { fontSize: font.small, color: colors.textMuted, marginTop: 4, marginBottom: spacing.md },
  trend: { marginTop: spacing.md, fontSize: font.small, fontWeight: '700' },
  sectionTitle: {
    fontSize: font.h3,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.md,
  },
  pillarList: { marginTop: spacing.lg },
  pillarRow: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md },
  pillarName: { width: 92, fontSize: font.tiny, color: colors.text, fontWeight: '600' },
  barTrack: {
    flex: 1,
    height: 10,
    backgroundColor: colors.cardMuted,
    borderRadius: radius.pill,
    marginHorizontal: spacing.sm,
    overflow: 'hidden',
  },
  barFill: { height: 10, borderRadius: radius.pill },
  pillarScore: { width: 28, textAlign: 'right', fontWeight: '800', fontSize: font.small },
  bulletRow: { flexDirection: 'row', marginBottom: spacing.sm },
  check: { color: colors.good, fontWeight: '800', marginRight: spacing.sm },
  bulletText: { flex: 1, color: colors.text, fontSize: font.body, lineHeight: 22 },
  focusHeading: {
    fontSize: font.h3,
    fontWeight: '800',
    color: colors.text,
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  focusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  focusTitle: { fontSize: font.h3, fontWeight: '700', color: colors.text },
  focusBand: { fontSize: font.small, fontWeight: '800' },
  why: { color: colors.textMuted, fontSize: font.small, marginBottom: spacing.md, lineHeight: 20 },
  evidenceBox: {
    backgroundColor: colors.cardMuted,
    borderRadius: radius.md,
    padding: spacing.md,
    borderLeftWidth: 3,
    borderLeftColor: colors.accent,
  },
  evidenceLabel: {
    fontSize: font.tiny,
    fontWeight: '700',
    color: colors.textMuted,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  evidenceText: { color: colors.text, fontSize: font.small, fontStyle: 'italic', lineHeight: 20 },
  tipBox: { marginTop: spacing.md },
  tipLabel: {
    fontSize: font.tiny,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  tipText: { color: colors.text, fontSize: font.body, lineHeight: 22 },
  suggestPrompt: { color: colors.textOnDark, fontSize: font.body, lineHeight: 24 },
  version: {
    color: colors.textMuted,
    fontSize: font.tiny,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
});
