import React, { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { CompositeScreenProps } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { RootStackParamList, TabsParamList } from '@/navigation/types';
import { colors, font, pillarColor, spacing } from '@/theme';
import { getProfile, getSessions } from '@/storage/store';
import { Session, StudentProfile } from '@/types';
import { pillarDef } from '@/analysis/framework';
import GradientBackground from '@/components/GradientBackground';
import Card from '@/components/Card';
import Button from '@/components/Button';
import ScoreGauge from '@/components/ScoreGauge';
import Avatar from '@/components/Avatar';
import Skeleton from '@/components/Skeleton';

type Props = CompositeScreenProps<
  BottomTabScreenProps<TabsParamList, 'Home'>,
  NativeStackScreenProps<RootStackParamList>
>;

export default function HomeScreen({ navigation }: Props) {
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

  const latest = sessions[0];

  return (
    <GradientBackground>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxl }}>
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.hello}>Hi {profile?.name?.split(' ')[0] ?? 'there'}</Text>
              <Text style={styles.sub}>Let's grow your voice today.</Text>
            </View>
            <Pressable
              onPress={() => navigation.navigate('Profile')}
              accessibilityRole="button"
              accessibilityLabel="Open profile"
              style={({ pressed }) => [styles.avatar, pressed && { opacity: 0.85 }]}
            >
              <Avatar gender={profile?.gender} seed={profile?.name} size={48} />
            </Pressable>
          </View>

          {!loaded ? (
            <Card variant="glass" style={{ alignItems: 'center', paddingVertical: spacing.xl }}>
              <Skeleton width={172} height={172} round />
              <Skeleton width={'55%'} height={14} style={{ marginTop: spacing.lg }} />
              <Skeleton width={'80%'} height={44} style={{ marginTop: spacing.lg }} />
            </Card>
          ) : latest ? (
            <Card variant="glass" style={{ alignItems: 'center', paddingVertical: spacing.xl }}>
              <Text style={styles.cardTitle}>Communication Index</Text>
              <ScoreGauge score={latest.analysis.ci} size={248} />
              <Text style={styles.trendText}>{trendText(sessions)}</Text>
              {latest.analysis.focusAreas[0] && (
                <View
                  style={[
                    styles.focusChip,
                    { backgroundColor: pillarColor(latest.analysis.focusAreas[0]) + '33' },
                  ]}
                >
                  <View
                    style={[
                      styles.focusDot,
                      { backgroundColor: pillarColor(latest.analysis.focusAreas[0]) },
                    ]}
                  />
                  <Text style={styles.focusChipText}>
                    Focus: {pillarDef(latest.analysis.focusAreas[0]).short}
                  </Text>
                </View>
              )}
              <Button
                title="View full report"
                variant="secondary"
                onPress={() => navigation.navigate('Report', { sessionId: latest.id })}
                style={{ marginTop: spacing.lg, alignSelf: 'stretch' }}
              />
            </Card>
          ) : (
            <Card variant="glass" style={{ alignItems: 'center', paddingVertical: spacing.xl }}>
              <View style={styles.emptyBadge}>
                <Text style={styles.emptyBadgeIcon}>🎙️</Text>
              </View>
              <Text style={styles.emptyTitle}>Your first session awaits</Text>
              <Text style={[styles.emptyText, { textAlign: 'center' }]}>
                Record a short 2-minute speaking task and get a friendly,
                growth-focused report across five communication skills.
              </Text>
            </Card>
          )}

          <Button
            title="Record a session"
            icon="🎙️"
            onPress={() => navigation.navigate('Record', { taskId: null })}
            style={{ marginTop: spacing.sm }}
          />
          <Button
            title="Choose a guided task"
            variant="secondary"
            onPress={() => navigation.navigate('Practice')}
            style={{ marginTop: spacing.sm }}
          />

          {sessions.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>Recent sessions</Text>
              {sessions.slice(0, 3).map((s) => (
                <Card key={s.id} variant="glass" style={styles.recentRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.recentTask} numberOfLines={1}>
                      {s.taskPrompt}
                    </Text>
                    <Text style={styles.recentDate}>{formatDate(s.createdAt)}</Text>
                  </View>
                  <Text style={styles.recentScore}>{s.analysis.ci}</Text>
                </Card>
              ))}
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </GradientBackground>
  );
}

function trendText(sessions: Session[]): string {
  if (sessions.length < 2) return 'Record again to start tracking your growth.';
  const diff = sessions[0].analysis.ci - sessions[1].analysis.ci;
  if (diff > 0) return `Up ${diff} points since last session — nice work.`;
  if (diff < 0) return `Down ${Math.abs(diff)} — your next session can turn it around.`;
  return 'Holding steady since last session.';
}

function formatDate(ms: number): string {
  return new Date(ms).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
    marginTop: spacing.sm,
  },
  hello: { fontSize: font.hero, fontWeight: '800', color: colors.textOnDark, letterSpacing: -0.5 },
  sub: { fontSize: font.body, color: colors.textMutedOnDark, marginTop: 2 },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.surfaceGlassBorder,
  },
  avatarText: { color: colors.white, fontSize: font.h3, fontWeight: '800' },
  cardTitle: {
    color: colors.textOnDark,
    fontSize: font.h3,
    fontWeight: '800',
    marginBottom: spacing.sm,
  },
  trendText: {
    color: colors.textMutedOnDark,
    fontSize: font.small,
    marginTop: spacing.md,
    textAlign: 'center',
  },
  focusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: 7,
    borderRadius: 999,
    marginTop: spacing.md,
  },
  focusDot: { width: 8, height: 8, borderRadius: 4, marginRight: spacing.sm },
  focusChipText: { color: colors.textOnDark, fontSize: font.small, fontWeight: '700' },
  emptyBadge: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.primary + '22',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  emptyBadgeIcon: { fontSize: 34 },
  emptyTitle: { fontSize: font.h3, fontWeight: '800', color: colors.textOnDark, marginBottom: spacing.sm },
  emptyText: { color: colors.textMutedOnDark, fontSize: font.body, lineHeight: 22 },
  sectionTitle: {
    fontSize: font.h3,
    fontWeight: '800',
    color: colors.textOnDark,
    marginTop: spacing.xl,
    marginBottom: spacing.md,
  },
  recentRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.md },
  recentTask: { color: colors.textOnDark, fontSize: font.body, fontWeight: '600' },
  recentDate: { color: colors.textMutedOnDark, fontSize: font.small, marginTop: 2 },
  recentScore: { color: colors.accent, fontSize: font.h2, fontWeight: '800', marginLeft: spacing.md },
});
