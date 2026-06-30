// Microphone recording via expo-av. Records only when the student taps record
// (Section 8: no passive capture in the MVP).

import { Audio } from 'expo-av';
import { PermissionsAndroid, Platform } from 'react-native';
import { logError, logEvent, logInfo, logWarn } from './logger';

export interface RecordingResult {
  uri: string | null;
  durationSec: number;
}

let recording: Audio.Recording | null = null;

// expo-av's Audio.requestPermissionsAsync() can hang on some Android devices
// (the OS dialog never appears and the promise never resolves). So: check the
// current status first (fast, never hangs), and on Android request through the
// core PermissionsAndroid API directly, which reliably shows the dialog.
export async function requestMicPermission(): Promise<boolean> {
  try {
    const current = await Audio.getPermissionsAsync();
    logInfo('Mic permission status', {
      status: current.status,
      canAskAgain: current.canAskAgain,
    });
    if (current.granted) {
      logEvent('Microphone already granted');
      return true;
    }
    if (!current.canAskAgain) {
      logWarn('Mic permission permanently denied — enable it in Settings');
      return false;
    }
  } catch (e) {
    // Don't block on a status read failure — fall through to the request.
    logWarn('Could not read mic permission status', e);
  }

  if (Platform.OS === 'android') {
    logInfo('Requesting RECORD_AUDIO via PermissionsAndroid…');
    const result = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
      {
        title: 'Microphone access',
        message:
          'EduBand needs your microphone to record and analyse your speech.',
        buttonPositive: 'Allow',
        buttonNegative: 'Not now',
      }
    );
    logInfo('PermissionsAndroid result', result);
    const granted = result === PermissionsAndroid.RESULTS.GRANTED;
    if (granted) logEvent('Microphone permission granted');
    else logError('Microphone permission denied', result);
    return granted;
  }

  logInfo('Requesting microphone permission…');
  const { granted } = await Audio.requestPermissionsAsync();
  if (granted) logEvent('Microphone permission granted');
  else logError('Microphone permission denied');
  return granted;
}

// A recording left over from a previous attempt makes the next createAsync throw
// ("Only one Recording object can be prepared at a given time"), which is the
// classic "works once, fails on retry" bug. Always release before starting.
async function releaseLingering(): Promise<void> {
  if (!recording) return;
  try {
    await recording.stopAndUnloadAsync();
  } catch {
    // ignore — it may already be unloaded
  }
  recording = null;
}

export async function startRecording(): Promise<void> {
  logInfo('Starting recording…');
  await releaseLingering();
  await Audio.setAudioModeAsync({
    allowsRecordingIOS: true,
    playsInSilentModeIOS: true,
  });
  try {
    const { recording: rec } = await Audio.Recording.createAsync(
      Audio.RecordingOptionsPresets.HIGH_QUALITY
    );
    recording = rec;
    logEvent('Recording started');
  } catch (e) {
    logError('Failed to start recording', e);
    throw e;
  }
}

export async function stopRecording(): Promise<RecordingResult> {
  logInfo('Stopping recording…');
  const rec = recording;
  // Clear the singleton up-front so that even if stop/unload throws, a stale
  // object can never strand the next recording attempt.
  recording = null;
  if (!rec) {
    logError('Stop called but no active recording');
    return { uri: null, durationSec: 0 };
  }

  // Read duration while still loaded; getStatusAsync can throw once unloaded.
  let durationSec = 0;
  try {
    const status = await rec.getStatusAsync();
    if ('durationMillis' in status && status.durationMillis) {
      durationSec = status.durationMillis / 1000;
    }
  } catch {
    // ignore — RecordScreen falls back to the on-screen elapsed timer
  }

  try {
    await rec.stopAndUnloadAsync();
  } catch {
    // ignore
  }

  const uri = rec.getURI();

  try {
    await Audio.setAudioModeAsync({ allowsRecordingIOS: false });
  } catch {
    // ignore
  }

  logEvent('Recording saved', { uri, durationSec: Math.round(durationSec) });
  return { uri, durationSec };
}

export async function cancelRecording(): Promise<void> {
  await releaseLingering();
}
