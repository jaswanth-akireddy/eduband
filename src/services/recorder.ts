// Microphone recording via expo-av. Records only when the student taps record
// (Section 8: no passive capture in the MVP).

import { Audio } from 'expo-av';

export interface RecordingResult {
  uri: string | null;
  durationSec: number;
}

let recording: Audio.Recording | null = null;

export async function requestMicPermission(): Promise<boolean> {
  const { granted } = await Audio.requestPermissionsAsync();
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
  await releaseLingering();
  await Audio.setAudioModeAsync({
    allowsRecordingIOS: true,
    playsInSilentModeIOS: true,
  });
  const { recording: rec } = await Audio.Recording.createAsync(
    Audio.RecordingOptionsPresets.HIGH_QUALITY
  );
  recording = rec;
}

export async function stopRecording(): Promise<RecordingResult> {
  const rec = recording;
  // Clear the singleton up-front so that even if stop/unload throws, a stale
  // object can never strand the next recording attempt.
  recording = null;
  if (!rec) return { uri: null, durationSec: 0 };

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

  return { uri, durationSec };
}

export async function cancelRecording(): Promise<void> {
  await releaseLingering();
}
