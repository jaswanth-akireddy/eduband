import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { CompositeScreenProps } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { RootStackParamList, TabsParamList } from '@/navigation/types';
import { font, makeStyles, pillarColor, scoreBand, scoreColor, spacing, useColors, weight } from '@/theme';
import { getProfile, getSessions } from '@/storage/store';
import { currentUserId, subscribeSessions } from '@/services/sessionsSync';
import { PillarId, Session, StudentProfile } from '@/types';
import { pillarDef } from '@/analysis/framework';
import GradientBackground from '@/components/GradientBackground';
import Card from '@/components/Card';
import Button from '@/components/Button';
import MetricRing from '@/components/MetricRing';
import Avatar from '@/components/Avatar';
import Skeleton from '@/components/Skeleton';
import Icon from '@/components/Icon';

type Props = CompositeScreenProps<
  BottomTabScreenProps<TabsParamList, 'Home'>,
  NativeStackScreenProps<RootStackParamList>
>;

export default function HomeScreen({ navigation }: Props) {
  const colors = useColors();
  const styles = useStyles();
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loaded, setLoaded] = useState(false);

  useFocusEffect(
    useCallback(() => {
      (async () => {
        const [p, s] = await Promise.all([getProfile(), getSessions()]);
        setProfile(p);
        setSessions(s);
        setLoaded(true);
      })();
    }, [])
  );

  // Live updates: when signed in, refresh sessions the moment Supabase reports
  // an insert/update/delete for this user (e.g. a session recorded elsewhere).
  useEffect(() => {
    let active = true;
    let unsub = () => {};
    (async () => {
      const uid = await currentUserId();
      if (uid && active) {
        unsub = subscribeSessions(uid, () => {
          getSessions().then((s) => {
            if (active) setSessions(s);
          });
        });
      }
    })();
    return () => {
      active = false;
      unsub();
    };
  }, []);

  const latest = sessions[0];
  const trend = trendOf(sessions);

  return (
    <GradientBackground>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <ScrollView
          contentContainerStyle={{ padding: 20, paddingBottom: spacing.xxl }}
          showsVerticalScrollIndicator={false}
        >
          {/* Large-title header */}
          <View style={styles.headerRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.eyebrow}>{greeting()}</Text>
              <Text style={styles.hello} numberOfLines={1}>
                {profile?.name?.split(' ')[0] ?? 'there'}
              </Text>
            </View>
            <Pressable
              onPress={() => navigation.navigate('Profile')}
              accessibilityRole="button"
              accessibilityLabel="Open profile"
              style={({ pressed }) => [pressed && { opacity: 0.8 }]}
            >
              <Avatar gender={profile?.gender} seed={profile?.name} size={40} />
            </Pressable>
          </View>

          {!loaded ? (
            <Card variant="glass" style={{ paddingVertical: spacing.lg }}>
              <Skeleton width={'50%'} height={14} />
              <View style={styles.ringsRow}>
                <Skeleton width={88} height={88} round />
                <Skeleton width={88} height={88} round />
                <Skeleton width={88} height={88} round />
              </View>
            </Card>
          ) : latest ? (
            <Card variant="glass" style={{ paddingVertical: spacing.lg }}>
              <View style={styles.ciHeader}>
                <View>
                  <Text style={styles.overline}>COMMUNICATION INDEX</Text>
                  <View style={styles.ciScoreRow}>
                    <Text style={styles.ciNumber}>{latest.analysis.ci}</Text>
                    <View
                      style={[
                        styles.bandPill,
                        { backgroundColor: scoreColor(latest.analysis.ci) + '16' },
                      ]}
                    >
                      <Text style={[styles.bandText, { color: scoreColor(latest.analysis.ci) }]}>
                        {scoreBand(latest.analysis.ci)}
                      </Text>
                    </View>
                  </View>
                </View>
                {latest.analysis.focusAreas[0] && (
                  <View style={styles.focusChip}>
                    <View
                      style={[
                        styles.focusDot,
                        { backgroundColor: pillarColor(latest.analysis.focusAreas[0]) },
                      ]}
                    />
                    <Text style={styles.focusChipText}>
                      {pillarDef(latest.analysis.focusAreas[0]).short}
                    </Text>
                  </View>
                )}
              </View>

              <View style={styles.ringsRow}>
                <MetricRing value={pillarScore(latest, 'fluency')} label="Fluency" size={88} />
                <MetricRing value={pillarScore(latest, 'clarity')} label="Clarity" size={88} />
                <MetricRing value={pillarScore(latest, 'confidence')} label="Confidence" size={88} />
              </View>

              <View style={styles.hairline} />

              <Pressable
                onPress={() => navigation.navigate('Report', { sessionId: latest.id })}
                style={({ pressed }) => [styles.trendRow, pressed && { opacity: 0.7 }]}
              >
                {trend != null && trend !== 0 ? (
                  <Icon
                    name={trend > 0 ? 'trendUp' : 'trendDown'}
                    size={15}
                    color={trend > 0 ? colors.good : colors.textMuted}
                    strokeWidth={2}
                  />
                ) : null}
                <Text style={styles.trendText}>{trendText(sessions)}</Text>
                <Icon name="chevronRight" size={14} color={colors.textFaint} />
              </Pressable>
            </Card>
          ) : (
            <Card variant="glass" style={{ alignItems: 'center', paddingVertical: spacing.xl }}>
              <View style={styles.emptyBadge}>
                <Icon name="waveform" size={26} color={colors.primary} strokeWidth={2} />
              </View>
              <Text style={styles.emptyTitle}>Your first session awaits</Text>
              <Text style={styles.emptyText}>
                Record two minutes of speaking and get a growth-focused report
                across five communication skills.
              </Text>
            </Card>
          )}

          <Button
            title="Record a session"
            icon="mic"
            onPress={() => navigation.navigate('Record', { taskId: null })}
            style={{ marginTop: spacing.sm }}
          />
          <Button
            title="Guided tasks"
            variant="secondary"
            onPress={() => navigation.navigate('Practice')}
            style={{ marginTop: 10 }}
          />

          {sessions.length > 0 && (
            <>
              <Text style={styles.sectionLabel}>RECENT</Text>
              <Card variant="glass" style={styles.recentCard}>
                {sessions.slice(0, 3).map((s, i) => (
                  <View key={s.id}>
                    {i > 0 && <View style={styles.rowDivider} />}
                    <Pressable
                      onPress={() => navigation.navigate('Report', { sessionId: s.id })}
                      style={({ pressed }) => [styles.recentRow, pressed && styles.rowPressed]}
                    >
                      <View style={{ flex: 1, paddingRight: spacing.md }}>
                        <Text style={styles.recentTask} numberOfLines={1}>
                          {s.taskPrompt}
                        </Text>
                        <Text style={styles.recentDate}>{formatDate(s.createdAt)}</Text>
                      </View>
                      <Text style={[styles.recentScore, { color: scoreColor(s.analysis.ci) }]}>
                        {s.analysis.ci}
                      </Text>
                      <Icon name="chevronRight" size={15} color={colors.textFaint} />
                    </Pressable>
                  </View>
                ))}
              </Card>
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </GradientBackground>
  );
}

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function pillarScore(session: Session, id: PillarId): number {
  return session.analysis.pillars.find((p) => p.id === id)?.score ?? 0;
}

function trendOf(sessions: Session[]): number | null {
  if (sessions.length < 2) return null;
  return sessions[0].analysis.ci - sessions[1].analysis.ci;
}

function trendText(sessions: Session[]): string {
  const diff = trendOf(sessions);
  if (diff == null) return 'Record again to start tracking your growth';
  if (diff > 0) return `Up ${diff} points since your last session`;
  if (diff < 0) return `Down ${Math.abs(diff)} — your next session can turn it around`;
  return 'Holding steady since your last session';
}

function formatDate(ms: number): string {
  return new Date(ms).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}

const useStyles = makeStyles((colors) => ({
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
    marginTop: spacing.sm,
  },
  eyebrow: {
    fontSize: font.small,
    color: colors.textMuted,
    fontWeight: weight.medium,
    marginBottom: 2,
  },
  hello: {
    fontSize: font.hero,
    fontWeight: weight.bold,
    color: colors.text,
    letterSpacing: -0.8,
  },

  overline: {
    fontSize: font.tiny,
    fontWeight: weight.semibold,
    letterSpacing: 1,
    color: colors.textMuted,
  },
  ciHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  ciScoreRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6 },
  ciNumber: {
    fontSize: 32,
    fontWeight: weight.bold,
    color: colors.text,
    letterSpacing: -1,
    lineHeight: 36,
  },
  bandPill: {
    marginLeft: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  bandText: { fontSize: font.tiny, fontWeight: weight.bold, letterSpacing: 0.3 },

  focusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceAlt,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  focusDot: { width: 6, height: 6, borderRadius: 3, marginRight: 6 },
  focusChipText: { color: colors.textMuted, fontSize: font.tiny, fontWeight: weight.semibold },

  ringsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.lg,
  },
  hairline: { height: 1, backgroundColor: colors.line, marginTop: spacing.lg },
  trendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingTop: 14,
  },
  trendText: {
    flex: 1,
    color: colors.textMuted,
    fontSize: font.small,
    fontWeight: weight.medium,
  },

  emptyBadge: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: colors.primary + '14',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  emptyTitle: {
    fontSize: font.h3,
    fontWeight: weight.semibold,
    color: colors.text,
    marginBottom: 6,
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: font.body,
    lineHeight: 21,
    textAlign: 'center',
    paddingHorizontal: spacing.md,
  },

  sectionLabel: {
    fontSize: font.tiny,
    fontWeight: weight.semibold,
    letterSpacing: 1,
    color: colors.textMuted,
    marginTop: spacing.xl,
    marginBottom: 10,
    marginLeft: 4,
  },
  recentCard: { padding: 0, overflow: 'hidden' },
  recentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  rowPressed: { backgroundColor: colors.surfaceAlt },
  rowDivider: { height: 1, backgroundColor: colors.line, marginLeft: 16 },
  recentTask: {
    color: colors.text,
    fontSize: font.body,
    fontWeight: weight.medium,
    letterSpacing: -0.1,
  },
  recentDate: { color: colors.textMuted, fontSize: font.small, marginTop: 2 },
  recentScore: {
    fontSize: font.h3,
    fontWeight: weight.semibold,
    marginRight: 6,
    fontVariant: ['tabular-nums'],
  },
}));
