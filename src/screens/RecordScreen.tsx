import React, { useEffect, useRef, useState } from 'react';
import { Alert, Animated, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { RootStackParamList } from '@/navigation/types';
import { font, makeStyles, radius, shadow, spacing, useColors } from '@/theme';
import { taskById } from '@/data/tasks';
import { getConsentCache, hasValidConsent } from '@/storage/store';
import {
  cancelRecording,
  requestMicPermission,
  startRecording,
  stopRecording,
} from '@/services/recorder';
import Button from '@/components/Button';
import Icon from '@/components/Icon';
import RecordingWave from '@/components/RecordingWave';
import { logError, logEvent, logInfo, logWarn, withTimeout } from '@/services/logger';
import { notifyWarning, tapLight, tapMedium } from '@/services/haptics';

type Props = NativeStackScreenProps<RootStackParamList, 'Record'>;

const TIPS = [
  'Pause for a breath instead of saying "um".',
  'Signpost your ideas: first, second, finally.',
  'Slow down on the point you most want remembered.',
  'Open with your main idea, then explain it.',
];

export default function RecordScreen({ route, navigation }: Props) {
  const colors = useColors();
  const styles = useStyles();
  const task = taskById(route.params.taskId);
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [starting, setStarting] = useState(false);
  const [tip] = useState(() => TIPS[Math.floor(Math.random() * TIPS.length)]);
  // A target gives the take a shape: guided tasks have their own length,
  // free speaking aims for one to two minutes.
  const target = task?.suggestedSeconds ?? 120;
  const targetText = task
    ? `Aim for about ${Math.max(1, Math.round(target / 60))} min`
    : 'Aim for 1 to 2 min';
  const targetPct = Math.min(1, elapsed / target);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    return () => {
      if (timer.current) clearInterval(timer.current);
      cancelRecording();
    };
  }, []);

  // Error prevention: leaving mid-recording destroys the take. Intercept the
  // back navigation and make the loss explicit instead of silent.
  const recordingRef = useRef(false);
  useEffect(() => {
    recordingRef.current = recording;
  }, [recording]);
  useEffect(() => {
    const unsub = navigation.addListener('beforeRemove', (e) => {
      if (!recordingRef.current) return;
      e.preventDefault();
      Alert.alert(
        'Discard this recording?',
        "You're still recording. Leaving now throws this take away.",
        [
          { text: 'Keep recording', style: 'cancel' },
          {
            text: 'Discard',
            style: 'destructive',
            onPress: () => navigation.dispatch(e.data.action),
          },
        ]
      );
    });
    return unsub;
  }, [navigation]);

  // Expanding-ring pulse behind the button while recording, so it feels alive.
  useEffect(() => {
    if (!recording) {
      pulse.setValue(1);
      return;
    }
    const loop = Animated.loop(
      Animated.timing(pulse, {
        toValue: 1.7,
        duration: 1300,
        useNativeDriver: true,
      })
    );
    loop.start();
    return () => loop.stop();
  }, [recording, pulse]);

  // Confirms React actually re-renders when the recording flag flips. If
  // startRecording logs but this never fires, the hang is in rendering, not audio.
  useEffect(() => {
    logInfo(`UI render: recording = ${recording}`);
  }, [recording]);

  async function onStart() {
    // Everything is inside try/catch so a failure can never silently no-op the
    // button. Any thrown error surfaces its real message instead of vanishing.
    logEvent('Record button tapped');
    setStarting(true);
    try {
      logEvent('Checking consent…');
      // Use the cached decision from app boot when available so a contended
      // AsyncStorage can't stall the record gate; only read storage if unknown.
      const cached = getConsentCache();
      const consent =
        cached !== null
          ? cached
          : await withTimeout('consent check', hasValidConsent(), 5000);
      if (cached !== null) logInfo('Consent from cache', cached);
      if (!consent) {
        logWarn('Recording blocked: no valid consent');
        Alert.alert(
          'Consent required',
          'Recording is blocked until parental/guardian consent is granted.'
        );
        return;
      }
      logEvent('Consent OK');

      const granted = await withTimeout('mic permission', requestMicPermission(), 30000);
      if (!granted) {
        Alert.alert(
          'Microphone access needed',
          'EduBand needs microphone permission to record. Open Settings to enable it, then try again.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Settings', onPress: () => Linking.openSettings() },
          ]
        );
        return;
      }

      await withTimeout('start recording', startRecording(), 10000);
      setRecording(true);
      tapMedium();
      logEvent('UI set to recording');
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
    tapLight();
    const result = await stopRecording();
    const durationSec = result.durationSec || elapsed;
    if (durationSec < 5) {
      logWarn('Recording too short, discarded', { durationSec: Math.round(durationSec) });
      notifyWarning();
      setElapsed(0); // the take is gone; don't leave a stale timer implying otherwise
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
            {task ? 'YOUR TASK' : 'FREE SPEAKING'}
          </Text>
          <Text style={styles.prompt}>
            {task
              ? task.prompt
              : 'Speak about anything you like for a minute or two.'}
          </Text>
          {task && (
            <View style={styles.hintRow}>
              <Icon name="clock" size={13} color={colors.textMuted} />
              <Text style={styles.hint}>
                About {Math.round(task.suggestedSeconds / 60)} minute
                {task.suggestedSeconds >= 120 ? 's' : ''}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.center}>
          <Text style={styles.timer}>{formatTime(elapsed)}</Text>
          <View
            style={styles.targetWrap}
            accessible
            accessibilityLabel={`${targetText}. ${formatTime(elapsed)} so far.`}
          >
            <View style={styles.targetTrack}>
              <View style={[styles.targetFill, { width: `${targetPct * 100}%` }]} />
            </View>
            <View style={styles.targetLabels}>
              <Text style={styles.targetEnd}>0:00</Text>
              <Text style={styles.targetMid}>{targetText}</Text>
              <Text style={styles.targetEnd}>{formatTime(target).replace(/^0/, '')}</Text>
            </View>
          </View>
          <View style={styles.waveSlot}>
            <RecordingWave color={colors.primaryStrong} active={recording} />
          </View>
          <View style={styles.btnWrap}>
            {recording && (
              <Animated.View
                style={[
                  styles.pulse,
                  {
                    transform: [{ scale: pulse }],
                    opacity: pulse.interpolate({
                      inputRange: [1, 1.7],
                      outputRange: [0.45, 0],
                    }),
                  },
                ]}
              />
            )}
            <Pressable
              onPress={recording ? onStop : onStart}
              disabled={starting}
              accessibilityRole="button"
              accessibilityLabel={recording ? 'Stop recording' : 'Start recording'}
              accessibilityState={{ busy: starting }}
              style={({ pressed }) => [
                styles.recBtn,
                recording && styles.recBtnActive,
                (pressed || starting) && { opacity: 0.7 },
              ]}
            >
              <View style={recording ? styles.stopIcon : styles.micDot} />
            </Pressable>
          </View>
          <Text style={styles.recLabel}>
            {starting ? 'Starting…' : recording ? 'Tap to stop' : 'Tap to record'}
          </Text>
        </View>

        <View>
          {recording ? (
            <Button title="Stop & analyse" onPress={onStop} />
          ) : (
            <View>
            {!starting && (
              <View style={styles.tipCard}>
                <View style={styles.tipIcon}>
                  <Icon name="bulb" size={17} color={colors.midText} />
                </View>
                <Text style={styles.tipText}>
                  <Text style={styles.tipLead}>Quick tip: </Text>
                  {tip}
                </Text>
              </View>
            )}
            <View style={styles.privacyRow}>
              <Icon name="lock" size={14} color={colors.textFaint} />
              <Text style={styles.privacyNote}>
                Recording only while you hold a session. Raw audio is deleted
                after analysis.
              </Text>
            </View>
            </View>
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

const useStyles = makeStyles((colors) => ({
  safe: { flex: 1, backgroundColor: colors.bg },
  container: { flex: 1, padding: spacing.lg, justifyContent: 'space-between' },
  promptBox: { paddingTop: spacing.md, paddingHorizontal: spacing.xs },
  promptLabel: {
    color: colors.textMuted,
    fontSize: font.tiny,
    fontWeight: '600',
    letterSpacing: 1,
    marginBottom: spacing.sm,
  },
  prompt: {
    color: colors.text,
    fontSize: font.h2,
    lineHeight: 30,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  hintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: spacing.md,
  },
  hint: { color: colors.textMuted, fontSize: font.small },
  center: { alignItems: 'center' },
  timer: {
    color: colors.text,
    fontSize: 56,
    fontWeight: '200',
    fontVariant: ['tabular-nums'],
    letterSpacing: 1,
    marginBottom: spacing.md,
  },
  waveSlot: { height: 40, justifyContent: 'center', marginBottom: spacing.md },
  btnWrap: { width: 112, height: 112, alignItems: 'center', justifyContent: 'center' },
  pulse: {
    position: 'absolute',
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.primaryStrong,
  },
  // Voice-memos register: a quiet outer ring with a red core that morphs from
  // circle (idle) to rounded square (recording).
  recBtn: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 3,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recBtnActive: { borderColor: colors.primaryStrong + '55' },
  // One brand red: matches the Home button (#E30029), not the pinker #FF385C.
  micDot: { width: 68, height: 68, borderRadius: 34, backgroundColor: colors.primaryStrong },
  stopIcon: { width: 32, height: 32, borderRadius: 8, backgroundColor: colors.primaryStrong },
  recLabel: {
    color: colors.textMuted,
    fontSize: font.small,
    fontWeight: '500',
    marginTop: spacing.lg,
  },
  targetWrap: { width: 260, marginTop: spacing.sm, marginBottom: spacing.md },
  targetTrack: { height: 4, borderRadius: 2, backgroundColor: colors.surfaceAlt, overflow: 'hidden' },
  targetFill: { height: 4, borderRadius: 2, backgroundColor: colors.primaryStrong },
  targetLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  targetEnd: { color: colors.textMuted, fontSize: font.tiny, fontVariant: ['tabular-nums'] },
  targetMid: { color: colors.textMuted, fontSize: font.tiny, fontWeight: '500' },
  tipCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: spacing.lg,
    ...shadow.card,
  },
  tipIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: colors.mid + '1F',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tipText: { flex: 1, color: colors.text, fontSize: font.small, lineHeight: 18 },
  tipLead: { fontWeight: '600' },
  privacyRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: spacing.lg,
  },
  privacyNote: {
    color: colors.textMuted,
    fontSize: font.tiny,
    textAlign: 'center',
    lineHeight: 16,
    flexShrink: 1,
  },
}));
