import React, { useCallback, useRef, useState } from 'react';
import { Alert, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { RootStackParamList } from '@/navigation/types';
import {
  font,
  makeStyles,
  radius,
  scoreColor,
  scoreBand,
  scoreTextColor,
  spacing,
  useColors,
} from '@/theme';
import { getSession, getSessions } from '@/storage/store';
import { PillarScore, Session } from '@/types';
import { taskById } from '@/data/tasks';
import { pillarDef } from '@/analysis/framework';
import GradientBackground from '@/components/GradientBackground';
import ScoreGauge from '@/components/ScoreGauge';
import Icon from '@/components/Icon';
import Card from '@/components/Card';
import Button from '@/components/Button';
import Confetti from '@/components/Confetti';
import Skeleton from '@/components/Skeleton';
import FadeIn from '@/components/FadeIn';
import { logError, logEvent, logInfo } from '@/services/logger';
import { notifySuccess } from '@/services/haptics';

type Props = NativeStackScreenProps<RootStackParamList, 'Report'>;

export default function ReportScreen({ route, navigation }: Props) {
  const colors = useColors();
  const styles = useStyles();
  const [session, setSession] = useState<Session | null>(null);
  const [prevCi, setPrevCi] = useState<number | null>(null);
  const [celebrate, setCelebrate] = useState(false);
  const fired = useRef(false);

  useFocusEffect(
    useCallback(() => {
      (async () => {
        const s = await getSession(route.params.sessionId);
        setSession(s);
        if (s) {
          const all = await getSessions();
          const older = all.filter((x) => x.createdAt < s.createdAt);
          const prev = older.length ? older[0].analysis.ci : null;
          setPrevCi(prev);
          // Reward the moment once per open: a success tap, plus confetti when
          // the Communication Index beat the previous session.
          if (!fired.current) {
            fired.current = true;
            notifySuccess();
            if (prev != null && s.analysis.ci > prev) setCelebrate(true);
          }
        }
      })();
    }, [route.params.sessionId])
  );

  if (!session) {
    return (
      <View style={styles.skeletonScreen}>
        <Skeleton width="70%" height={22} />
        <Skeleton width="45%" height={14} style={{ marginTop: spacing.sm }} />
        <Skeleton width={180} height={180} round style={{ alignSelf: 'center', marginTop: spacing.xl }} />
        <Skeleton height={90} style={{ marginTop: spacing.xl }} />
        <Skeleton height={64} style={{ marginTop: spacing.md }} />
        <Skeleton height={64} style={{ marginTop: spacing.md }} />
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

  // Save the full transcript as a .txt file the student can keep and re-read.
  async function onExportTranscript() {
    if (!session) return;
    const body = buildTranscriptText(session);
    logInfo('Exporting transcript…');
    try {
      const fileName = `eduband-transcript-${session.id}.txt`;
      const uri = FileSystem.cacheDirectory + fileName;
      await FileSystem.writeAsStringAsync(uri, body, {
        encoding: FileSystem.EncodingType.UTF8,
      });
      logEvent('Transcript .txt file created', { fileName, bytes: body.length });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: 'text/plain',
          dialogTitle: 'Save your transcript',
          UTI: 'public.plain-text',
        });
        logEvent('Transcript shared');
      } else {
        await Share.share({ message: body });
        logEvent('Transcript shared (text fallback)');
      }
    } catch (e) {
      // Fall back to a plain text share if writing the file fails.
      logError('Transcript file export failed, trying text share', e);
      try {
        await Share.share({ message: body });
      } catch (e2) {
        logError('Transcript export failed', e2);
        Alert.alert('Could not export', 'Unable to export the transcript right now.');
      }
    }
  }

  return (
    <View style={{ flex: 1 }}>
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
      <FadeIn>
      <Card style={{ alignItems: 'center', paddingVertical: spacing.lg }}>
        <Text style={styles.indexTitle}>Communication Index</Text>
        <ScoreGauge score={analysis.ci} size={240} />
        {trend != null && (
          <View style={styles.trendRow}>
            {trend !== 0 && (
              <Icon
                name={trend > 0 ? 'trendUp' : 'trendDown'}
                size={15}
                color={trend > 0 ? colors.goodText : colors.textMuted}
                strokeWidth={2}
              />
            )}
            <Text
              style={[styles.trend, { color: trend > 0 ? colors.goodText : colors.textMuted }]}
            >
              {trend === 0
                ? 'Same as last session'
                : `${Math.abs(trend)} points ${trend > 0 ? 'up' : 'down'} from last session`}
            </Text>
          </View>
        )}
      </Card>
      </FadeIn>

      {/* The lesson first: what the student said, and the one thing to try next.
          This is the most useful part of the report, so it comes straight after
          the score instead of below the chart and the strengths. */}
      {focusPillars.length > 0 && <Text style={styles.focusHeading}>Your focus</Text>}
      {focusPillars.map((p) => (
        <Card key={p.id}>
          <View style={styles.focusHeader}>
            <Text style={styles.focusTitle}>{p.label}</Text>
            <Text style={[styles.focusBand, { color: scoreTextColor(p.score, colors) }]}>
              {scoreBand(p.score)} · {p.score}
            </Text>
          </View>
          {!!p.why && <Text style={styles.why}>{p.why}</Text>}
          <View style={styles.evidenceBox}>
            <Icon name="quote" size={16} color={colors.textFaint} />
            <View style={{ flex: 1 }}>
              <Text style={styles.evidenceLabel}>From your speech</Text>
              <Text style={styles.evidenceText}>"{p.evidence}"</Text>
            </View>
          </View>
          <View style={styles.tipBox}>
            <Text style={styles.tipLabel}>Try this next</Text>
            <Text style={styles.tipText}>{p.tip}</Text>
          </View>
        </Card>
      ))}

      {/* Five pillars as labelled bars. This replaces a radar that repeated
          these same five numbers and clipped its side labels; bars are the
          clearer chart for comparing a few scores. */}
      <Card>
        <Text style={styles.sectionTitle}>Your five pillars</Text>
        {analysis.pillars.map((p) => {
          const isFocus = analysis.focusAreas.includes(p.id);
          return (
            <View
              key={p.id}
              style={styles.pillarRow}
              accessible
              accessibilityLabel={`${p.label}: ${p.score}, ${scoreBand(p.score)}${isFocus ? ', focus area' : ''}`}
            >
              <View style={styles.pillarNameWrap}>
                <Text style={styles.pillarName} numberOfLines={1}>
                  {pillarDef(p.id).short}
                </Text>
                {isFocus && (
                  <View style={styles.focusTag}>
                    <Text style={styles.focusTagText}>FOCUS</Text>
                  </View>
                )}
              </View>
              <View style={styles.barTrack}>
                <View
                  style={[
                    styles.barFill,
                    { width: `${p.score}%`, backgroundColor: scoreColor(p.score, colors) },
                  ]}
                />
              </View>
              <Text style={[styles.pillarScore, { color: scoreTextColor(p.score, colors) }]}>
                {p.score}
              </Text>
            </View>
          );
        })}
      </Card>

      {/* Strengths */}
      <Card>
        <Text style={styles.sectionTitle}>What's working</Text>
        {analysis.strengths.map((s, i) => (
          <View key={i} style={styles.bulletRow}>
            <View style={styles.checkDot}>
              <Icon name="check" size={13} color={colors.goodText} strokeWidth={2.6} />
            </View>
            <Text style={styles.bulletText}>{s}</Text>
          </View>
        ))}
      </Card>

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

      {/* Transcript: saved with every session, exportable as a text file */}
      <Card>
        <Text style={styles.sectionTitle}>Your words</Text>
        <Text style={styles.transcriptText}>{session.transcript.text}</Text>
        <Button
          title="Export transcript (.txt)"
          variant="secondary"
          icon="doc"
          onPress={onExportTranscript}
          style={{ marginTop: spacing.md }}
        />
      </Card>

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
      <Confetti trigger={celebrate} />
    </View>
  );
}

function buildTranscriptText(session: Session): string {
  const { analysis } = session;
  const lines = [
    'EduBand: session transcript',
    '================================',
    `Date:     ${formatDate(session.createdAt)}`,
    `Duration: ${formatDuration(session.durationSec)}`,
    `Task:     ${session.taskPrompt}`,
    `Communication Index: ${analysis.ci}/100`,
    '',
    'Pillars:',
    ...analysis.pillars.map((p) => `  • ${p.label}: ${p.score}`),
    '',
    '--- What you said ---',
    '',
    session.transcript.text || '(no transcript captured)',
    '',
  ];
  return lines.join('\n');
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

const useStyles = makeStyles((colors) => ({
  screen: { flex: 1, backgroundColor: colors.bg },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  skeletonScreen: { flex: 1, backgroundColor: colors.bg, padding: spacing.lg },
  task: {
    fontSize: font.h2,
    fontWeight: '600',
    color: colors.text,
    lineHeight: 29,
    letterSpacing: -0.2,
  },
  meta: { fontSize: font.small, color: colors.textMuted, marginTop: 4, marginBottom: spacing.md },
  trendRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: spacing.sm },
  trend: { fontSize: font.small, fontWeight: '600' },
  indexTitle: {
    fontSize: font.tiny,
    fontWeight: '600',
    letterSpacing: 1,
    color: colors.textMuted,
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
  },
  sectionTitle: {
    fontSize: font.h3,
    fontWeight: '600',
    color: colors.text,
    letterSpacing: -0.1,
    marginBottom: spacing.md,
  },
  pillarRow: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md },
  // Short names on one line: the full labels wrapped to two lines, so rows
  // had uneven heights.
  pillarNameWrap: { width: 122, flexDirection: 'row', alignItems: 'center', gap: 6 },
  pillarName: { fontSize: font.tiny, color: colors.text, fontWeight: '600' },
  focusTag: {
    backgroundColor: colors.mid + '1F',
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  focusTagText: { fontSize: 9, fontWeight: '700', color: colors.midText, letterSpacing: 0.3 },
  barTrack: {
    flex: 1,
    height: 8,
    backgroundColor: colors.cardMuted,
    borderRadius: radius.pill,
    marginHorizontal: spacing.sm,
    overflow: 'hidden',
  },
  barFill: { height: 8, borderRadius: radius.pill },
  pillarScore: { width: 28, textAlign: 'right', fontWeight: '700', fontSize: font.small },
  bulletRow: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm },
  checkDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.good + '1F',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  bulletText: { flex: 1, color: colors.text, fontSize: font.body, lineHeight: 22 },
  focusHeading: {
    fontSize: font.tiny,
    fontWeight: '600',
    letterSpacing: 1,
    color: colors.textMuted,
    textTransform: 'uppercase',
    marginTop: spacing.sm,
    marginBottom: 10,
    marginLeft: 4,
  },
  // Score sits under the title rather than beside it: side by side, long
  // pillar names pushed "Developing · 66" onto two lines, splitting the label
  // from its number.
  focusHeader: { marginBottom: spacing.sm },
  focusTitle: { fontSize: font.h3, fontWeight: '600', color: colors.text, letterSpacing: -0.1 },
  focusBand: { fontSize: font.small, fontWeight: '600', marginTop: 2 },
  why: { color: colors.textMuted, fontSize: font.small, marginBottom: spacing.md, lineHeight: 20 },
  // A full tinted surface with a quote icon. It used a 3px coloured border on
  // the left edge only, a pattern the design kit bans as a generated-UI tell.
  evidenceBox: {
    flexDirection: 'row',
    gap: 10,
    backgroundColor: colors.cardMuted,
    borderRadius: radius.md,
    padding: spacing.md,
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
    color: colors.primaryText,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  tipText: { color: colors.text, fontSize: font.body, lineHeight: 22 },
  suggestPrompt: { color: colors.textOnDark, fontSize: font.body, lineHeight: 24 },
  transcriptText: {
    color: colors.text,
    fontSize: font.body,
    lineHeight: 24,
    backgroundColor: colors.cardMuted,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  version: {
    color: colors.textMuted,
    fontSize: font.tiny,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
}));
