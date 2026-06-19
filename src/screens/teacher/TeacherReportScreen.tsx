import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { RootStackParamList } from '@/navigation/types';
import { colors, font, radius, scoreColor, spacing } from '@/theme';
import { teachingSessionById } from '@/data/teaching';
import GradientBackground from '@/components/GradientBackground';
import Card from '@/components/Card';
import Button from '@/components/Button';

type Props = NativeStackScreenProps<RootStackParamList, 'TeacherReport'>;

export default function TeacherReportScreen({ route, navigation }: Props) {
  const session = teachingSessionById(route.params.sessionId);
  if (!session) {
    return (
      <GradientBackground>
        <View style={styles.loading}>
          <Text style={{ color: colors.textMuted }}>Session not found.</Text>
        </View>
      </GradientBackground>
    );
  }

  const { analysis } = session;
  const { coverage } = analysis;

  return (
    <GradientBackground>
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxl }}>
        <Text style={styles.title}>{session.title}</Text>
        <Text style={styles.meta}>
          {new Date(session.date).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })} ·{' '}
          {Math.round(session.durationSec / 60)} min · plan attached ✓
        </Text>

        {/* Two headline scores */}
        <View style={styles.scoreRow}>
          <Card style={styles.scoreCard}>
            <Text style={styles.scoreLabel}>DELIVERY</Text>
            <Text style={[styles.bigScore, { color: scoreColor(analysis.ci) }]}>{analysis.ci}</Text>
            <Text style={styles.scoreHint}>clear & well paced</Text>
          </Card>
          <Card style={styles.scoreCard}>
            <Text style={styles.scoreLabel}>COVERAGE</Text>
            <Text style={[styles.bigScore, { color: scoreColor(coverage.coveragePct) }]}>
              {coverage.coveragePct}%
            </Text>
            <Text style={styles.scoreHint}>of planned topics</Text>
          </Card>
        </View>

        {/* Covered well */}
        <Card>
          <Text style={[styles.cardHead, { color: colors.good }]}>✓ Covered well</Text>
          {coverage.coveredWell.map((t, i) => (
            <Text key={i} style={styles.item}>•  {t}</Text>
          ))}
        </Card>

        {/* Missed / skipped */}
        <Card>
          <Text style={[styles.cardHead, { color: colors.mid }]}>⚠ Missed / skipped</Text>
          {coverage.missedOrSkipped.map((t, i) => (
            <Text key={i} style={styles.item}>•  {t}</Text>
          ))}
          {coverage.rushedOrUnclear.map((t, i) => (
            <Text key={`r${i}`} style={styles.item}>•  {t}</Text>
          ))}
        </Card>

        {/* Delivery pillars */}
        <Card>
          <Text style={styles.cardHead}>Delivery breakdown</Text>
          {analysis.pillars.map((p) => (
            <View key={p.id} style={styles.pillarRow}>
              <Text style={styles.pillarName}>{p.label.split(' ')[0]}</Text>
              <View style={styles.barTrack}>
                <View style={[styles.barFill, { width: `${p.score}%`, backgroundColor: scoreColor(p.score) }]} />
              </View>
              <Text style={[styles.pillarScore, { color: scoreColor(p.score) }]}>{p.score}</Text>
            </View>
          ))}
        </Card>

        {/* Next session plan */}
        <Card style={{ borderColor: colors.violet + '55' }}>
          <Text style={[styles.cardHead, { color: colors.violet }]}>📋 Plan for next session</Text>
          {coverage.nextSessionPlan.map((t, i) => (
            <Text key={i} style={styles.planItem}>{i + 1}.  {t}</Text>
          ))}
        </Card>

        <Button title="Back to sessions" variant="ghost" onPress={() => navigation.goBack()} />
      </ScrollView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: font.h2, fontWeight: '800', color: colors.text, marginTop: spacing.sm, letterSpacing: -0.5 },
  meta: { fontSize: font.small, color: colors.textMuted, marginTop: 4, marginBottom: spacing.md },
  scoreRow: { flexDirection: 'row', gap: spacing.md },
  scoreCard: { flex: 1 },
  scoreLabel: { fontSize: font.tiny, fontWeight: '800', color: colors.textMuted, letterSpacing: 0.5 },
  bigScore: { fontSize: 40, fontWeight: '800', marginTop: 4, letterSpacing: -1 },
  scoreHint: { fontSize: font.tiny, color: colors.textMuted, marginTop: 2 },
  cardHead: { fontSize: font.h3, fontWeight: '700', color: colors.text, marginBottom: spacing.sm },
  item: { fontSize: font.small, color: colors.textMuted, lineHeight: 24 },
  planItem: { fontSize: font.body, color: colors.text, lineHeight: 28, fontWeight: '500' },
  pillarRow: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm },
  pillarName: { width: 80, fontSize: font.small, color: colors.text, fontWeight: '600' },
  barTrack: { flex: 1, height: 8, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: radius.pill, marginHorizontal: spacing.sm, overflow: 'hidden' },
  barFill: { height: 8, borderRadius: radius.pill },
  pillarScore: { width: 28, textAlign: 'right', fontWeight: '800', fontSize: font.small },
});
