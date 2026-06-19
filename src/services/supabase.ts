// Supabase client for the app. Uses AsyncStorage for session persistence and
// the device's secure JWT to authorise Edge Function calls.
//
// Configure via env (.env) OR the in-app API Keys screen (apiBase is reused as
// the functions base when it points at *.functions.supabase.co):
//   EXPO_PUBLIC_SUPABASE_URL, EXPO_PUBLIC_SUPABASE_ANON_KEY

import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

export const hasSupabase = !!url && !!anonKey;

// A no-op safe client when not configured, so the app still runs on mock/local.
export const supabase = hasSupabase
  ? createClient(url, anonKey, {
      auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    })
  : null;

// Returns the current access token (JWT) for authorising Edge Function calls.
export async function getAccessToken(): Promise<string | null> {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}
