import React, { useEffect, useRef, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { RootStackParamList } from '@/navigation/types';
import { colors, font, radius, spacing } from '@/theme';
import {
  cancelRecording,
  requestMicPermission,
  startRecording,
  stopRecording,
} from '@/services/recorder';
import { DEMO_TEACHING_SESSIONS } from '@/data/teaching';
import GradientBackground from '@/components/GradientBackground';
import Button from '@/components/Button';
import { logError, logEvent } from '@/services/logger';

type Props = NativeStackScreenProps<RootStackParamList, 'TeacherRecord'>;

export default function TeacherRecordScreen({ navigation }: Props) {
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
    // Wrapped in try/catch so a thrown error can never silently no-op the
    // button — any failure surfaces its real message instead of vanishing.
    logEvent('Teacher record button tapped');
    setStarting(true);
    try {
      const granted = await requestMicPermission();
      if (!granted) {
        Alert.alert('Microphone needed', 'Please allow microphone access to record.');
        return;
      }
      await startRecording();
      setRecording(true);
      setElapsed(0);
      timer.current = setInterval(() => setElapsed((e) => e + 1), 1000);
    } catch (e) {
      logError('Could not start teacher recording', e);
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
    try {
      await stopRecording();
    } catch {
      // ignore — still route to the report below
    }
    // Demo: route to the most recent teaching report.
    navigation.replace('TeacherReport', { sessionId: DEMO_TEACHING_SESSIONS[0].id });
  }

  return (
    <GradientBackground>
      <SafeAreaView style={{ flex: 1 }} edges={['bottom']}>
        <View style={styles.container}>
          <View style={styles.tip}>
            <Text style={styles.tipLabel}>TEACHING SESSION</Text>
            <Text style={styles.tipText}>
              Record your lesson with the phone, or wear your EduBand band in
              class. With materials attached, EduBand checks what you taught
              against what you planned.
            </Text>
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
            <Text style={styles.recLabel}>{recording ? 'Tap to stop' : 'Tap to record'}</Text>
          </View>

          {recording ? (
            <Button title="Stop & analyse" onPress={onStop} />
          ) : (
            <Text style={styles.note}>🔒 Recording only while a session is active.</Text>
          )}
        </View>
      </SafeAreaView>
    </GradientBackground>
  );
}

function formatTime(sec: number): string {
  const m = Math.floor(sec / 60).toString().padStart(2, '0');
  const s = (sec % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: spacing.lg, justifyContent: 'space-between' },
  tip: {
    backgroundColor: colors.glass,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  tipLabel: { color: colors.textMuted, fontSize: font.tiny, fontWeight: '800', letterSpacing: 0.5, marginBottom: spacing.sm },
  tipText: { color: colors.text, fontSize: font.body, lineHeight: 24 },
  center: { alignItems: 'center' },
  timer: { color: colors.text, fontSize: 52, fontWeight: '300', fontVariant: ['tabular-nums'], marginBottom: spacing.xl },
  recBtn: {
    width: 120, height: 120, borderRadius: 60, backgroundColor: colors.violet,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: colors.glow, shadowOpacity: 1, shadowRadius: 28, shadowOffset: { width: 0, height: 0 }, elevation: 10,
  },
  recBtnActive: { backgroundColor: colors.low },
  micDot: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.white },
  stopIcon: { width: 36, height: 36, borderRadius: 6, backgroundColor: colors.white },
  recLabel: { color: colors.textMuted, fontSize: font.body, marginTop: spacing.lg },
  note: { color: colors.textMuted, fontSize: font.small, textAlign: 'center' },
});
