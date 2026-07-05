import React, { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { CompositeScreenProps } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { RootStackParamList, TabsParamList } from '@/navigation/types';
import { font, makeStyles, radius, scoreColor, spacing } from '@/theme';
import { getSessions } from '@/storage/store';
import { Session } from '@/types';
import Card from '@/components/Card';
import TrendChart from '@/components/TrendChart';

type Props = CompositeScreenProps<
  BottomTabScreenProps<TabsParamList, 'Progress'>,
  NativeStackScreenProps<RootStackParamList>
>;

export default function ProgressScreen({ navigation }: Props) {
  const styles = useStyles();
  const [sessions, setSessions] = useState<Session[]>([]);

  useFocusEffect(
    useCallback(() => {
      (async () => {
        setSessions(await getSessions());
      })();
    }, [])
  );

  // chronological for the chart (oldest -> newest)
  const chrono = [...sessions].sort((a, b) => a.createdAt - b.createdAt);
  const ciValues = chrono.map((s) => s.analysis.ci);
  const streak = computeStreak(sessions);

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={{ padding: spacing.lg }}
    >
      <Text style={styles.title}>Your progress</Text>

      <Card>
        <Text style={styles.cardLabel}>Communication Index over time</Text>
        <TrendChart values={ciValues} />
        <View style={styles.statsRow}>
          <Stat label="Sessions" value={`${sessions.length}`} />
          <Stat
            label="Best"
            value={ciValues.length ? `${Math.max(...ciValues)}` : '—'}
          />
          <Stat label="Streak" value={`${streak} day${streak === 1 ? '' : 's'}`} />
        </View>
      </Card>

      <Text style={styles.subhead}>History</Text>
      {sessions.length === 0 && (
        <Text style={styles.empty}>
          No sessions yet. Record one from the Home tab to begin.
        </Text>
      )}
      {sessions.map((s) => (
        <Pressable
          key={s.id}
          onPress={() => navigation.navigate('Report', { sessionId: s.id })}
        >
          <Card style={styles.histCard}>
            <View style={{ flex: 1 }}>
              <Text style={styles.histTask} numberOfLines={1}>
                {s.taskPrompt}
              </Text>
              <Text style={styles.histDate}>{formatDate(s.createdAt)}</Text>
            </View>
            <View
              style={[
                styles.histScore,
                { backgroundColor: scoreColor(s.analysis.ci) + '22' },
              ]}
            >
              <Text style={[styles.histScoreText, { color: scoreColor(s.analysis.ci) }]}>
                {s.analysis.ci}
              </Text>
            </View>
          </Card>
        </Pressable>
      ))}
    </ScrollView>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  const styles = useStyles();
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function computeStreak(sessions: Session[]): number {
  if (sessions.length === 0) return 0;
  const days = new Set(
    sessions.map((s) => new Date(s.createdAt).toDateString())
  );
  let streak = 0;
  const d = new Date();
  // count consecutive days ending today (or yesterday) with a session
  for (;;) {
    if (days.has(d.toDateString())) {
      streak++;
      d.setDate(d.getDate() - 1);
    } else {
      break;
    }
  }
  return streak;
}

function formatDate(ms: number): string {
  return new Date(ms).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
  });
}

const useStyles = makeStyles((colors) => ({
  screen: { flex: 1, backgroundColor: colors.bg },
  title: { fontSize: font.h1, fontWeight: '800', color: colors.text, marginBottom: spacing.md },
  cardLabel: {
    fontSize: font.small,
    color: colors.textMuted,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.md,
  },
  stat: { alignItems: 'center' },
  statValue: { fontSize: font.h2, fontWeight: '800', color: colors.text },
  statLabel: { fontSize: font.tiny, color: colors.textMuted, marginTop: 2 },
  subhead: {
    fontSize: font.h3,
    fontWeight: '700',
    color: colors.text,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  empty: { color: colors.textMuted, fontSize: font.body },
  histCard: { flexDirection: 'row', alignItems: 'center' },
  histTask: { fontSize: font.body, fontWeight: '600', color: colors.text },
  histDate: { fontSize: font.small, color: colors.textMuted, marginTop: 2 },
  histScore: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  histScoreText: { fontSize: font.h3, fontWeight: '800' },
}));
