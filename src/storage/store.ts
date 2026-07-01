// Local persistence (Phase 1 runs fully on-device). In production this layer
// is replaced by Supabase (Postgres + storage + RLS). The privacy defaults
// here mirror Section 8: raw audio is deleted after analysis by default.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { ConsentRecord, Role, Session, StudentProfile } from '@/types';
import { logEvent, logWarn, withTimeout } from '@/services/logger';
import {
  type ProfileSeed,
  currentUserId,
  remoteDeleteAllSessions,
  remoteDeleteSession,
  remoteInsertSession,
  remoteListSessions,
  upsertProfile,
} from '@/services/sessionsSync';

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
  // Mirror to Supabase when signed in (sessions reference this profile row).
  const uid = await currentUserId();
  if (uid) {
    const role = (await getRole()) ?? 'student';
    upsertProfile(uid, {
      role,
      fullName: p.name,
      level: p.level,
      language: p.language,
    }).catch(() => {});
  }
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

// ---- Sessions (Supabase-backed, with a local cache) ------------------------
// When signed in, Supabase is the source of truth and the local store is a
// cache for instant/offline reads. When signed out, it's purely local.
async function readSessionsCache(): Promise<Session[]> {
  const raw = await AsyncStorage.getItem(KEYS.sessions);
  const list = raw ? (JSON.parse(raw) as Session[]) : [];
  return list.sort((a, b) => b.createdAt - a.createdAt);
}

async function writeSessionsCache(list: Session[]): Promise<void> {
  await AsyncStorage.setItem(KEYS.sessions, JSON.stringify(list));
}

async function profileSeed(): Promise<ProfileSeed> {
  const [role, profile] = await Promise.all([getRole(), getProfile()]);
  return {
    role: role ?? 'student',
    fullName: profile?.name ?? 'EduBand user',
    level: profile?.level ?? 'high',
    language: profile?.language ?? 'English',
  };
}

// Remote-refresh with cache fallback: pulls the signed-in user's sessions from
// Supabase and caches them; on any failure (offline etc.) returns the cache.
export async function getSessions(): Promise<Session[]> {
  const cache = await readSessionsCache();
  const uid = await currentUserId();
  if (!uid) return cache;
  try {
    const remote = await withTimeout('load sessions', remoteListSessions(uid), 8000);
    await writeSessionsCache(remote);
    logEvent('Sessions synced from Supabase', { count: remote.length });
    return remote;
  } catch (e) {
    logWarn('Session sync failed — using cached sessions', e);
    return cache;
  }
}

export async function getSession(id: string): Promise<Session | null> {
  const list = await getSessions();
  return list.find((s) => s.id === id) ?? null;
}

// Write-through: cache immediately (optimistic), then persist to Supabase and
// reconcile the server id. The session is never lost if the remote write fails.
export async function addSession(s: Session): Promise<void> {
  const list = await readSessionsCache();
  list.unshift(s);
  await writeSessionsCache(list);

  const uid = await currentUserId();
  if (!uid) return;
  try {
    const id = await remoteInsertSession(uid, s, await profileSeed());
    if (id) logEvent('Session saved to Supabase', { id });
  } catch (e) {
    logWarn('Session kept locally; remote save failed', e);
  }
}

// Data control (Section 8): one-click deletion / export.
export async function deleteSession(id: string): Promise<void> {
  const list = await readSessionsCache();
  await writeSessionsCache(list.filter((s) => s.id !== id));
  const uid = await currentUserId();
  if (uid) {
    try {
      await remoteDeleteSession(id);
    } catch (e) {
      logWarn('Remote session delete failed', e);
    }
  }
}

// `alsoRemote` = true wipes the account's Supabase sessions too (Privacy
// "delete all my data"). Logout passes false: it only clears this device's
// cache and must never delete the account's remote data.
export async function deleteAllData(alsoRemote = false): Promise<void> {
  if (alsoRemote) {
    const uid = await currentUserId();
    if (uid) {
      try {
        await remoteDeleteAllSessions(uid);
        logEvent('Remote data wiped');
      } catch (e) {
        logWarn('Remote wipe failed', e);
      }
    }
  }
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
