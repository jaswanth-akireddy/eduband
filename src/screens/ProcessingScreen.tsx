import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { RootStackParamList } from '@/navigation/types';
import { colors, font, spacing } from '@/theme';
import { transcribe } from '@/analysis/stt';
import { analyze } from '@/analysis/pipeline';
import { taskById } from '@/data/tasks';
import { addSession, getProfile, getSettings } from '@/storage/store';
import { Session } from '@/types';
import { describeMode } from '@/config';

type Props = NativeStackScreenProps<RootStackParamList, 'Processing'>;

const STEPS = [
  'Transcribing your speech…',
  'Measuring pace, fillers and pauses…',
  'Scoring your five communication skills…',
  'Writing your report…',
];

export default function ProcessingScreen({ route, navigation }: Props) {
  const [step, setStep] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const stepTimer = setInterval(
      () => setStep((s) => Math.min(s + 1, STEPS.length - 1)),
      900
    );

    (async () => {
      try {
        const profile = await getProfile();
        const settings = await getSettings();
        const level = profile?.level ?? 'high';
        const { taskId, mode, audioUri, durationSec } = route.params;

        // Pipeline: STT -> metrics -> LLM scoring -> store
        const transcript = await transcribe(audioUri, durationSec);
        const { metrics, analysis } = await analyze(transcript, durationSec, level);

        const task = taskById(taskId);
        const session: Session = {
          id: `s_${Date.now()}`,
          taskId,
          taskPrompt: task?.prompt ?? 'Free speaking',
          mode,
          createdAt: Date.now(),
          durationSec,
          // Section 8: delete raw audio after analysis unless retention is on.
          audioUri: settings.retainRawAudio ? audioUri : null,
          transcript,
          metrics,
          analysis,
        };
        await addSession(session);

        if (!cancelled) {
          navigation.replace('Report', { sessionId: session.id });
        }
      } catch (e) {
        if (!cancelled) {
          navigation.replace('Tabs', { screen: 'Home' } as never);
        }
      }
    })();

    return () => {
      cancelled = true;
      clearInterval(stepTimer);
    };
  }, []);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={colors.primary} />
      <Text style={styles.title}>Analysing your session</Text>
      <Text style={styles.step}>{STEPS[step]}</Text>
      <View style={styles.dots}>
        {STEPS.map((_, i) => (
          <View
            key={i}
            style={[styles.dot, i <= step && styles.dotActive]}
          />
        ))}
      </View>
      <Text style={styles.note}>This usually takes a few seconds.</Text>
      <Text style={styles.mode}>Engine: {describeMode()}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  title: {
    color: colors.textOnDark,
    fontSize: font.h2,
    fontWeight: '700',
    marginTop: spacing.xl,
  },
  step: {
    color: colors.textMutedOnDark,
    fontSize: font.body,
    marginTop: spacing.md,
    textAlign: 'center',
    minHeight: 24,
  },
  dots: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xl },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.borderDark,
  },
  dotActive: { backgroundColor: colors.primary },
  note: {
    color: colors.textMutedOnDark,
    fontSize: font.small,
    marginTop: spacing.xl,
  },
  mode: {
    color: colors.textFaint,
    fontSize: font.tiny,
    marginTop: spacing.sm,
  },
});
