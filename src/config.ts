// Central config for external services.
//
// Credentials can come from (in priority order):
//   1) In-app API Keys screen (stored on-device) — for TESTING.
//   2) Env vars (.env) — EXPO_PUBLIC_* — for local dev.
//   3) Nothing -> the app uses the built-in mock pipeline.
//
// SECURITY NOTE: keys entered in-app or via env live ON THE DEVICE and can be
// extracted. This is acceptable for a testing phase only. For real students/
// schools, move keys to a backend proxy (EXPO_PUBLIC_API_BASE / Supabase Edge
// Function) so they never touch the client.

import AsyncStorage from '@react-native-async-storage/async-storage';

export interface Credentials {
  apiBase: string;
  sttProvider: 'deepgram' | 'assemblyai';
  deepgramKey: string;
  llmProvider: 'claude' | 'gemini';
  anthropicKey: string;
  anthropicModel: string;
  geminiKey: string;
  geminiModel: string;
}

const ENV: Credentials = {
  apiBase: process.env.EXPO_PUBLIC_API_BASE ?? '',
  sttProvider: (process.env.EXPO_PUBLIC_STT_PROVIDER ?? 'deepgram') as
    | 'deepgram'
    | 'assemblyai',
  deepgramKey: process.env.EXPO_PUBLIC_DEEPGRAM_KEY ?? '',
  llmProvider: (process.env.EXPO_PUBLIC_LLM_PROVIDER ?? 'claude') as
    | 'claude'
    | 'gemini',
  anthropicKey: process.env.EXPO_PUBLIC_ANTHROPIC_KEY ?? '',
  anthropicModel:
    process.env.EXPO_PUBLIC_ANTHROPIC_MODEL ?? 'claude-3-5-sonnet-latest',
  geminiKey: process.env.EXPO_PUBLIC_GEMINI_KEY ?? '',
  geminiModel:
    process.env.EXPO_PUBLIC_GEMINI_MODEL ?? 'gemini-1.5-flash',
};

const STORAGE_KEY = 'eduband.credentials';

// Live, mutable credentials used by the pipeline. Starts from env, then gets
// overlaid by anything saved in-app once loadCredentials() runs at startup.
export const config: Credentials = { ...ENV };

export async function loadCredentials(): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (raw) {
      const saved = JSON.parse(raw) as Partial<Credentials>;
      // In-app values take priority over env when present/non-empty.
      Object.assign(config, mergeNonEmpty(ENV, saved));
    }
  } catch {
    // ignore; fall back to env/mock
  }
}

export async function getSavedCredentials(): Promise<Credentials> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  const saved = raw ? (JSON.parse(raw) as Partial<Credentials>) : {};
  return mergeNonEmpty(ENV, saved);
}

export async function saveCredentials(next: Credentials): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  Object.assign(config, mergeNonEmpty(ENV, next));
}

export async function clearCredentials(): Promise<void> {
  await AsyncStorage.removeItem(STORAGE_KEY);
  Object.assign(config, ENV);
}

function mergeNonEmpty(base: Credentials, over: Partial<Credentials>): Credentials {
  return {
    apiBase: over.apiBase?.trim() || base.apiBase,
    sttProvider: (over.sttProvider as any) || base.sttProvider,
    deepgramKey: over.deepgramKey?.trim() || base.deepgramKey,
    llmProvider: (over.llmProvider as any) || base.llmProvider,
    anthropicKey: over.anthropicKey?.trim() || base.anthropicKey,
    anthropicModel: over.anthropicModel?.trim() || base.anthropicModel,
    geminiKey: over.geminiKey?.trim() || base.geminiKey,
    geminiModel: over.geminiModel?.trim() || base.geminiModel,
  };
}

// Derived flags — read live (config mutates after load/save).
export const modeFlags = {
  get useBackend() {
    return !!config.apiBase;
  },
  get useDirectStt() {
    return !config.apiBase && !!config.deepgramKey;
  },
  get useDirectLlm() {
    return !config.apiBase && (!!config.anthropicKey || !!config.geminiKey);
  },
};

export function describeMode(): string {
  if (modeFlags.useBackend) return `backend (${config.apiBase})`;
  const stt = modeFlags.useDirectStt ? config.sttProvider : 'mock';
  const llm = modeFlags.useDirectLlm ? config.llmProvider : 'mock';
  return `direct · stt=${stt}, scoring=${llm}`;
}
