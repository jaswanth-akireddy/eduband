// Authentication service. Wraps Supabase Auth and provides a single API the
// screens use. Works in two modes:
//   • Supabase configured  -> real email/password + Google OAuth + JWT
//   • Not configured        -> local fallback (no server; for offline/demo)
//
// The role is attached to the user's profile row on first sign-in.

import * as WebBrowser from 'expo-web-browser';
import { makeRedirectUri } from 'expo-auth-session';
import { supabase, hasSupabase } from '@/services/supabase';
import { Role } from '@/types';

export interface AuthUser {
  id: string;
  email: string | null;
  name: string | null;
}

export interface AuthResult {
  ok: boolean;
  error?: string;
  user?: AuthUser;
}

export const authConfigured = hasSupabase;

// ---- Email + password ------------------------------------------------------
export async function signUpWithEmail(
  email: string,
  password: string,
  fullName: string,
  role: Role,
  level: string
): Promise<AuthResult> {
  if (!supabase) return { ok: false, error: 'Auth not configured' };
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName, role, level } },
  });
  if (error) return { ok: false, error: error.message };
  // Create/seed the profile row (id must equal auth user id; RLS allows self).
  if (data.user) await ensureProfile(data.user.id, fullName, role, level);
  return {
    ok: true,
    user: { id: data.user?.id ?? '', email, name: fullName },
  };
}

export async function signInWithEmail(
  email: string,
  password: string
): Promise<AuthResult> {
  if (!supabase) return { ok: false, error: 'Auth not configured' };
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { ok: false, error: error.message };
  return {
    ok: true,
    user: {
      id: data.user.id,
      email: data.user.email ?? null,
      name: (data.user.user_metadata?.full_name as string) ?? null,
    },
  };
}

// ---- Google OAuth ----------------------------------------------------------
export async function signInWithGoogle(role: Role): Promise<AuthResult> {
  if (!supabase) return { ok: false, error: 'Auth not configured' };

  const redirectTo = makeRedirectUri({ scheme: 'eduband', path: 'auth-callback' });
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo,
      skipBrowserRedirect: true,
      queryParams: { prompt: 'select_account' },
    },
  });
  if (error || !data?.url) return { ok: false, error: error?.message ?? 'No OAuth URL' };

  // Open the Google consent page; capture the redirect back to the app.
  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  if (result.type !== 'success' || !result.url) {
    return { ok: false, error: 'Google sign-in cancelled' };
  }

  // Exchange the returned code/fragment for a Supabase session.
  const params = parseAuthParams(result.url);
  if (params.access_token && params.refresh_token) {
    await supabase.auth.setSession({
      access_token: params.access_token,
      refresh_token: params.refresh_token,
    });
  } else if (params.code) {
    await supabase.auth.exchangeCodeForSession(params.code);
  }

  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return { ok: false, error: 'Sign-in failed' };
  const name = (u.user.user_metadata?.full_name as string) ?? null;
  await ensureProfile(u.user.id, name ?? 'EduBand user', role, 'high');
  return { ok: true, user: { id: u.user.id, email: u.user.email ?? null, name } };
}

// ---- Session ---------------------------------------------------------------
export async function getCurrentUser(): Promise<AuthUser | null> {
  if (!supabase) return null;
  const { data } = await supabase.auth.getUser();
  if (!data.user) return null;
  return {
    id: data.user.id,
    email: data.user.email ?? null,
    name: (data.user.user_metadata?.full_name as string) ?? null,
  };
}

export async function signOut(): Promise<void> {
  if (supabase) await supabase.auth.signOut();
}

export async function sendPasswordReset(email: string): Promise<AuthResult> {
  if (!supabase) return { ok: false, error: 'Auth not configured' };
  const { error } = await supabase.auth.resetPasswordForEmail(email);
  return error ? { ok: false, error: error.message } : { ok: true };
}

// ---- Helpers ---------------------------------------------------------------
async function ensureProfile(id: string, fullName: string, role: Role, level: string) {
  if (!supabase) return;
  // Upsert is safe: RLS lets a user insert/update their own profile row.
  await supabase.from('profiles').upsert({
    id,
    full_name: fullName,
    role,
    level,
  });
}

function parseAuthParams(url: string): Record<string, string> {
  const out: Record<string, string> = {};
  const qIndex = Math.max(url.indexOf('#'), url.indexOf('?'));
  if (qIndex === -1) return out;
  const query = url.slice(qIndex + 1);
  for (const pair of query.split('&')) {
    const [k, v] = pair.split('=');
    if (k) out[decodeURIComponent(k)] = decodeURIComponent(v ?? '');
  }
  return out;
}
