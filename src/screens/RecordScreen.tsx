import React, { useEffect, useRef, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { RootStackParamList } from '@/navigation/types';
import { colors, font, radius, spacing } from '@/theme';
import { taskById } from '@/data/tasks';
import { hasValidConsent } from '@/storage/store';
import {
  cancelRecording,
  requestMicPermission,
  startRecording,
  stopRecording,
} from '@/services/recorder';
import Button from '@/components/Button';
import { logError, logEvent, logInfo, logWarn } from '@/services/logger';

type Props = NativeStackScreenProps<RootStackParamList, 'Record'>;

export default function RecordScreen({ route, navigation }: Props) {
  const task = taskById(route.params.taskId);
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [starting, setStarting] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (timer.current) clearInterval(timer.current);
      cancelRecording();
    };
  }, []);

  async function onStart() {
    // Everything is inside try/catch so a failure can never silently no-op the
    // button. Any thrown error surfaces its real message instead of vanishing.
    logEvent('Record button tapped');
    setStarting(true);
    try {
      const consent = await hasValidConsent();
      if (!consent) {
        logWarn('Recording blocked: no valid consent');
        Alert.alert(
          'Consent required',
          'Recording is blocked until parental/guardian consent is granted.'
        );
        return;
      }
      logInfo('Consent OK');

      const granted = await requestMicPermission();
      if (!granted) {
        Alert.alert(
          'Microphone access needed',
          'EduBand needs microphone permission to record. Enable it for EduBand in your device Settings, then try again.'
        );
        return;
      }

      await startRecording();
      setRecording(true);
      setElapsed(0);
      timer.current = setInterval(() => setElapsed((e) => e + 1), 1000);
    } catch (e) {
      logError('Could not start recording', e);
      Alert.alert(
        'Could not start recording',
        e instanceof Error ? e.message : 'Unexpected error. Please try again.'
      );
    } finally {
      setStarting(false);
    }
  }

  async function onStop() {
    if (timer.current) clearInterval(timer.current);
    setRecording(false);
    const result = await stopRecording();
    const durationSec = result.durationSec || elapsed;
    if (durationSec < 5) {
      logWarn('Recording too short, discarded', { durationSec: Math.round(durationSec) });
      Alert.alert(
        'A little longer',
        'Try to speak for at least a few seconds so we can give useful feedback.'
      );
      return;
    }
    logEvent('Sending to analysis', { durationSec: Math.round(durationSec), hasAudio: !!result.uri });
    navigation.replace('Processing', {
      taskId: route.params.taskId,
      mode: task ? 'guided' : 'free',
      audioUri: result.uri,
      durationSec,
    });
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <View style={styles.container}>
        <View style={styles.promptBox}>
          <Text style={styles.promptLabel}>
            {task ? 'Your task' : 'Free speaking'}
          </Text>
          <Text style={styles.prompt}>
            {task
              ? task.prompt
              : 'Speak about anything you like for a minute or two.'}
          </Text>
          {task && (
            <Text style={styles.hint}>
              Aim for about {Math.round(task.suggestedSeconds / 60)} minute
              {task.suggestedSeconds >= 120 ? 's' : ''}.
            </Text>
          )}
        </View>

        <View style={styles.center}>
          <Text style={styles.timer}>{formatTime(elapsed)}</Text>
          <Pressable
            onPress={recording ? onStop : onStart}
            disabled={starting}
            style={({ pressed }) => [
              styles.recBtn,
              recording && styles.recBtnActive,
              (pressed || starting) && { opacity: 0.7 },
            ]}
          >
            <View style={recording ? styles.stopIcon : styles.micDot} />
          </Pressable>
          <Text style={styles.recLabel}>
            {recording ? 'Tap to stop' : 'Tap to record'}
          </Text>
        </View>

        <View>
          {recording ? (
            <Button title="Stop & analyse" onPress={onStop} />
          ) : (
            <Text style={styles.privacyNote}>
              🔒 We only record while you hold a session. Raw audio is deleted
              after analysis by default.
            </Text>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

function formatTime(sec: number): string {
  const m = Math.floor(sec / 60)
    .toString()
    .padStart(2, '0');
  const s = (sec % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  container: { flex: 1, padding: spacing.lg, justifyContent: 'space-between' },
  promptBox: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.borderDark,
  },
  promptLabel: {
    color: colors.textMutedOnDark,
    fontSize: font.small,
    fontWeight: '700',
    marginBottom: spacing.sm,
  },
  prompt: { color: colors.textOnDark, fontSize: font.h2, lineHeight: 32, fontWeight: '600' },
  hint: { color: colors.textMutedOnDark, marginTop: spacing.md, fontSize: font.small },
  center: { alignItems: 'center' },
  timer: {
    color: colors.textOnDark,
    fontSize: 52,
    fontWeight: '300',
    fontVariant: ['tabular-nums'],
    marginBottom: spacing.xl,
  },
  recBtn: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOpacity: 0.5,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 0 },
    elevation: 6,
  },
  recBtnActive: { backgroundColor: colors.low },
  micDot: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.white },
  stopIcon: { width: 36, height: 36, borderRadius: 6, backgroundColor: colors.white },
  recLabel: {
    color: colors.textMutedOnDark,
    fontSize: font.body,
    marginTop: spacing.lg,
  },
  privacyNote: {
    color: colors.textMutedOnDark,
    fontSize: font.small,
    textAlign: 'center',
    lineHeight: 20,
  },
});
