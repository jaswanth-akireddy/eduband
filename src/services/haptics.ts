// Thin, safe wrapper around expo-haptics. Fire-and-forget: haptics are a nice-
// to-have, never a failure path. Every call is fully guarded so it no-ops on
// web, on devices without a haptic engine, and — importantly — on a build where
// the native module isn't linked yet (e.g. an OTA update pushed to an older
// binary), where the call can throw synchronously rather than reject.

import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';

const enabled = Platform.OS === 'ios' || Platform.OS === 'android';

function safe(run: () => Promise<unknown>): void {
  if (!enabled) return;
  try {
    run().catch(() => {});
  } catch {
    // native module missing / not linked — ignore
  }
}

export function tapLight(): void {
  safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light));
}

export function tapMedium(): void {
  safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium));
}

export function selection(): void {
  safe(() => Haptics.selectionAsync());
}

export function notifySuccess(): void {
  safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));
}

export function notifyWarning(): void {
  safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning));
}
