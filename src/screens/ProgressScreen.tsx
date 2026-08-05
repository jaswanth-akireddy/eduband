import React, { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { CompositeScreenProps } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { RootStackParamList, TabsParamList } from '@/navigation/types';
import { font, makeStyles, scoreColor, spacing, useColors, weight } from '@/theme';
import { getSessions } from '@/storage/store';
import { Session } from '@/types';
import Card from '@/components/Card';
import Icon from '@/components/Icon';
import TrendChart from '@/components/TrendChart';

type Props = CompositeScreenProps<
  BottomTabScreenProps<TabsParamList, 'Progress'>,
  NativeStackScreenProps<RootStackParamList>
>;

export default function ProgressScreen({ navigation }: Props) {
  const colors = useColors();
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
        <Text style={styles.cardLabel}>COMMUNICATION INDEX OVER TIME</Text>
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

      <Text style={styles.subhead}>HISTORY</Text>
      {sessions.length === 0 && (
        <Text style={styles.empty}>
          No sessions yet. Record one from the Home tab to begin.
        </Text>
      )}
      {sessions.length > 0 && (
        <Card style={styles.histGroup}>
          {sessions.map((s, i) => (
            <View key={s.id}>
              {i > 0 && <View style={styles.histDivider} />}
              <Pressable
                onPress={() => navigation.navigate('Report', { sessionId: s.id })}
                style={({ pressed }) => [styles.histRow, pressed && styles.histPressed]}
              >
                <View style={{ flex: 1, paddingRight: spacing.md }}>
                  <Text style={styles.histTask} numberOfLines={1}>
                    {s.taskPrompt}
                  </Text>
                  <Text style={styles.histDate}>{formatDate(s.createdAt)}</Text>
                </View>
                <Text style={[styles.histScoreText, { color: scoreColor(s.analysis.ci) }]}>
                  {s.analysis.ci}
                </Text>
                <Icon name="chevronRight" size={15} color={colors.textFaint} />
              </Pressable>
            </View>
          ))}
        </Card>
      )}
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
  title: {
    fontSize: font.h1,
    fontWeight: weight.bold,
    color: colors.text,
    letterSpacing: -0.6,
    marginBottom: spacing.md,
  },
  cardLabel: {
    fontSize: font.tiny,
    color: colors.textMuted,
    fontWeight: weight.semibold,
    letterSpacing: 1,
    marginBottom: spacing.sm,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    paddingTop: spacing.md,
  },
  stat: { alignItems: 'center' },
  statValue: {
    fontSize: font.h2,
    fontWeight: weight.semibold,
    color: colors.text,
    letterSpacing: -0.4,
    fontVariant: ['tabular-nums'],
  },
  statLabel: { fontSize: font.tiny, color: colors.textMuted, marginTop: 3 },
  subhead: {
    fontSize: font.tiny,
    fontWeight: weight.semibold,
    letterSpacing: 1,
    color: colors.textMuted,
    marginTop: spacing.lg,
    marginBottom: 10,
    marginLeft: 4,
  },
  empty: { color: colors.textMuted, fontSize: font.body },
  histGroup: { padding: 0, overflow: 'hidden' },
  histRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  histPressed: { backgroundColor: colors.surfaceAlt },
  histDivider: { height: 1, backgroundColor: colors.line, marginLeft: 16 },
  histTask: {
    fontSize: font.body,
    fontWeight: weight.medium,
    color: colors.text,
    letterSpacing: -0.1,
  },
  histDate: { fontSize: font.small, color: colors.textMuted, marginTop: 2 },
  histScoreText: {
    fontSize: font.h3,
    fontWeight: weight.semibold,
    marginRight: 6,
    fontVariant: ['tabular-nums'],
  },
}));
