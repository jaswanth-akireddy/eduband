// Local persistence (Phase 1 runs fully on-device). In production this layer
// is replaced by Supabase (Postgres + storage + RLS). The privacy defaults
// here mirror Section 8: raw audio is deleted after analysis by default.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { ConsentRecord, Role, Session, StudentProfile } from '@/types';

const KEYS = {
  role: 'eduband.role',
  profile: 'eduband.profile',
  consent: 'eduband.consent',
  sessions: 'eduband.sessions',
  settings: 'eduband.settings',
};

export interface AppSettings {
  // Default to deleting raw audio after analysis (Section 8, recommended).
  retainRawAudio: boolean;
}

const DEFAULT_SETTINGS: AppSettings = { retainRawAudio: false };

// ---- Role (multi-persona selection on app open) ----------------------------
export async function getRole(): Promise<Role | null> {
  const raw = await AsyncStorage.getItem(KEYS.role);
  return raw ? (JSON.parse(raw) as Role) : null;
}

export async function saveRole(role: Role): Promise<void> {
  await AsyncStorage.setItem(KEYS.role, JSON.stringify(role));
}

export async function clearRole(): Promise<void> {
  await AsyncStorage.removeItem(KEYS.role);
}

// ---- Profile ---------------------------------------------------------------
export async function getProfile(): Promise<StudentProfile | null> {
  const raw = await AsyncStorage.getItem(KEYS.profile);
  return raw ? (JSON.parse(raw) as StudentProfile) : null;
}

export async function saveProfile(p: StudentProfile): Promise<void> {
  await AsyncStorage.setItem(KEYS.profile, JSON.stringify(p));
}

// ---- Consent (Section 8: block recording without it) -----------------------
// In-memory mirror of the consent decision. Primed at app boot and on every
// read/write, so the record gate can answer instantly without a fresh
// AsyncStorage round-trip (which can stall if the shared store is contended by
// Supabase's background token refresh). null = not yet known this session.
let consentCache: boolean | null = null;

export async function getConsent(): Promise<ConsentRecord | null> {
  const raw = await AsyncStorage.getItem(KEYS.consent);
  return raw ? (JSON.parse(raw) as ConsentRecord) : null;
}

export async function saveConsent(c: ConsentRecord): Promise<void> {
  consentCache = !!c && c.granted;
  await AsyncStorage.setItem(KEYS.consent, JSON.stringify(c));
}

export async function hasValidConsent(): Promise<boolean> {
  const c = await getConsent();
  consentCache = !!c && c.granted;
  return consentCache;
}

// Synchronous, non-blocking read of the cached consent decision. Returns null
// if consent hasn't been resolved yet this session.
export function getConsentCache(): boolean | null {
  return consentCache;
}

// ---- Settings --------------------------------------------------------------
export async function getSettings(): Promise<AppSettings> {
  const raw = await AsyncStorage.getItem(KEYS.settings);
  return raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : DEFAULT_SETTINGS;
}

export async function saveSettings(s: AppSettings): Promise<void> {
  await AsyncStorage.setItem(KEYS.settings, JSON.stringify(s));
}

// ---- Sessions --------------------------------------------------------------
export async function getSessions(): Promise<Session[]> {
  const raw = await AsyncStorage.getItem(KEYS.sessions);
  const list = raw ? (JSON.parse(raw) as Session[]) : [];
  return list.sort((a, b) => b.createdAt - a.createdAt);
}

export async function getSession(id: string): Promise<Session | null> {
  const list = await getSessions();
  return list.find((s) => s.id === id) ?? null;
}

export async function addSession(s: Session): Promise<void> {
  const list = await getSessions();
  list.unshift(s);
  await AsyncStorage.setItem(KEYS.sessions, JSON.stringify(list));
}

// Data control (Section 8): one-click deletion / export.
export async function deleteSession(id: string): Promise<void> {
  const list = await getSessions();
  await AsyncStorage.setItem(
    KEYS.sessions,
    JSON.stringify(list.filter((s) => s.id !== id))
  );
}

export async function deleteAllData(): Promise<void> {
  await AsyncStorage.multiRemove([
    KEYS.sessions,
    KEYS.consent,
    KEYS.profile,
    KEYS.settings,
    KEYS.role,
  ]);
}

export async function exportData(): Promise<string> {
  const [profile, consent, sessions, settings] = await Promise.all([
    getProfile(),
    getConsent(),
    getSessions(),
    getSettings(),
  ]);
  return JSON.stringify({ profile, consent, settings, sessions }, null, 2);
}
