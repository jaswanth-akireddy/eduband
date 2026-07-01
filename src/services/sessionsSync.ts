// Supabase sync for sessions. The full app Session is stored as a JSONB payload
// on the `sessions` table (see migration 0005); owner RLS (0002) scopes every
// row to the signed-in user. This module holds only the raw remote operations —
// storage/store.ts orchestrates cache + fallback on top of these.

import { supabase } from '@/services/supabase';
import { logError } from '@/services/logger';
import { Role, Session } from '@/types';

export interface ProfileSeed {
  role: Role;
  fullName: string;
  level: string;
  language: string;
}

export function remoteEnabled(): boolean {
  return !!supabase;
}

// Local (no network) read of the signed-in user's id from the persisted session.
export async function currentUserId(): Promise<string | null> {
  if (!supabase) return null;
  try {
    const { data } = await supabase.auth.getSession();
    return data.session?.user?.id ?? null;
  } catch {
    return null;
  }
}

// Ensure a profiles row exists (sessions.user_id references profiles.id, and RLS
// checks the profile). Upsert is safe — a user may insert/update their own row.
export async function upsertProfile(userId: string, seed: ProfileSeed): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.from('profiles').upsert({
    id: userId,
    role: seed.role,
    full_name: seed.fullName || 'EduBand user',
    level: seed.level || 'high',
    language: seed.language || 'English',
  });
  if (error) logError('Profile upsert failed', error.message);
}

export async function remoteListSessions(userId: string): Promise<Session[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('sessions')
    .select('id, payload, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? [])
    .filter((r) => r.payload)
    .map((r) => ({ ...(r.payload as Session), id: r.id as string }));
}

// Inserts a session; returns the DB-generated uuid (used as the canonical id).
export async function remoteInsertSession(
  userId: string,
  session: Session,
  seed: ProfileSeed
): Promise<string | null> {
  if (!supabase) return null;
  await upsertProfile(userId, seed);
  // Use the client-generated uuid as the row id so local and remote ids match
  // (the app navigates by this id immediately after saving).
  const useId = /^[0-9a-f-]{36}$/i.test(session.id) ? session.id : undefined;
  const { data, error } = await supabase
    .from('sessions')
    .insert({
      ...(useId ? { id: useId } : {}),
      user_id: userId,
      kind: 'speaking',
      task_id: session.taskId,
      task_prompt: session.taskPrompt,
      duration_sec: Math.round(session.durationSec),
      status: 'complete',
      payload: session,
    })
    .select('id')
    .single();
  if (error) {
    logError('Remote session insert failed', error.message);
    return null;
  }
  return (data?.id as string) ?? null;
}

export async function remoteDeleteSession(id: string): Promise<void> {
  if (!supabase) return;
  // Only delete real uuids — locally-created ids (s_...) never reached the DB.
  if (!/^[0-9a-f-]{36}$/i.test(id)) return;
  const { error } = await supabase.from('sessions').delete().eq('id', id);
  if (error) logError('Remote session delete failed', error.message);
}

// Full remote wipe of a user's sessions (for the Privacy "delete all" action).
export async function remoteDeleteAllSessions(userId: string): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.from('sessions').delete().eq('user_id', userId);
  if (error) logError('Remote wipe failed', error.message);
}

// Live updates for this user's sessions. Returns an unsubscribe function.
export function subscribeSessions(userId: string, onChange: () => void): () => void {
  if (!supabase) return () => {};
  const channel = supabase
    .channel(`sessions:${userId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'sessions', filter: `user_id=eq.${userId}` },
      () => onChange()
    )
    .subscribe();
  return () => {
    supabase?.removeChannel(channel);
  };
}
