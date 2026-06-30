// Supabase client for the app. Uses AsyncStorage for session persistence and
// the device's secure JWT to authorise Edge Function calls.
//
// Configure via env (.env) OR the in-app API Keys screen (apiBase is reused as
// the functions base when it points at *.functions.supabase.co):
//   EXPO_PUBLIC_SUPABASE_URL, EXPO_PUBLIC_SUPABASE_ANON_KEY

import 'react-native-url-polyfill/auto';
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

export const hasSupabase = !!url && !!anonKey;

// Storage adapter with per-op timeouts. Supabase's background token refresh
// reads/writes the session through this; without a bound, a contended or wedged
// AsyncStorage call inside auth could hang and starve the rest of the app
// (including the record flow's own storage reads). On timeout we degrade to a
// no-op/null — worst case the user signs in again — instead of freezing.
const STORAGE_TIMEOUT_MS = 4000;

function guard<T>(p: Promise<T>, fallback: T): Promise<T> {
  return new Promise<T>((resolve) => {
    const id = setTimeout(() => resolve(fallback), STORAGE_TIMEOUT_MS);
    p.then(
      (v) => {
        clearTimeout(id);
        resolve(v);
      },
      () => {
        clearTimeout(id);
        resolve(fallback);
      }
    );
  });
}

const boundedStorage = {
  getItem: (key: string) => guard(AsyncStorage.getItem(key), null),
  setItem: (key: string, value: string) =>
    guard(AsyncStorage.setItem(key, value), undefined),
  removeItem: (key: string) => guard(AsyncStorage.removeItem(key), undefined),
};

// A no-op safe client when not configured, so the app still runs on mock/local.
export const supabase = hasSupabase
  ? createClient(url, anonKey, {
      auth: {
        storage: boundedStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    })
  : null;

// Recommended React Native pattern: only run the auto-refresh timer while the
// app is foregrounded, so it can't spin (and contend storage) in the background.
if (supabase) {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') supabase.auth.startAutoRefresh();
    else supabase.auth.stopAutoRefresh();
  });
}

// Returns the current access token (JWT) for authorising Edge Function calls.
// Bounded so a hung auth call can never block a caller (e.g. STT upload).
export async function getAccessToken(): Promise<string | null> {
  if (!supabase) return null;
  try {
    return await guard<string | null>(
      supabase.auth.getSession().then((r) => r.data.session?.access_token ?? null),
      null
    );
  } catch {
    return null;
  }
}
