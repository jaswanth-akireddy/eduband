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

export async function startRecording(): Promise<void> {
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
  if (!recording) return { uri: null, durationSec: 0 };
  await recording.stopAndUnloadAsync();
  const status = await recording.getStatusAsync();
  const uri = recording.getURI();
  const durationSec =
    'durationMillis' in status && status.durationMillis
      ? status.durationMillis / 1000
      : 0;
  recording = null;
  await Audio.setAudioModeAsync({ allowsRecordingIOS: false });
  return { uri, durationSec };
}

export async function cancelRecording(): Promise<void> {
  if (!recording) return;
  try {
    await recording.stopAndUnloadAsync();
  } catch {
    // ignore
  }
  recording = null;
}
