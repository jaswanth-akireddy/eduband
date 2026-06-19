// Shared helpers for EduBand Edge Functions (Deno runtime).
// High-standards defaults: auth required, CORS locked, inputs validated.

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Allow only your app origins. For Expo Go / native there is no Origin header,
// which we permit; browsers must match the allowlist.
const ALLOWED_ORIGINS = (Deno.env.get('ALLOWED_ORIGINS') ?? '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

export function corsHeaders(origin: string | null): Record<string, string> {
  const allow =
    !origin || ALLOWED_ORIGINS.length === 0 || ALLOWED_ORIGINS.includes(origin)
      ? origin ?? '*'
      : 'null';
  return {
    'Access-Control-Allow-Origin': allow,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary': 'Origin',
  };
}

export function json(body: unknown, status = 200, origin: string | null = null): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) },
  });
}

export function errorResponse(message: string, status = 400, origin: string | null = null): Response {
  return json({ error: message }, status, origin);
}

// Verify the caller's JWT and return their Supabase client + user.
// Returns null if unauthenticated.
export async function getAuthedUser(req: Request): Promise<
  { supabase: SupabaseClient; userId: string } | null
> {
  const authHeader = req.headers.get('Authorization') ?? '';
  if (!authHeader.startsWith('Bearer ')) return null;

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } }
  );
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  return { supabase, userId: data.user.id };
}

// Service-role client for privileged writes (bypasses RLS) — use sparingly and
// only after the caller is authenticated and authorised in the function.
export function serviceClient(): SupabaseClient {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );
}

// Tiny in-memory rate limiter (best-effort per warm instance).
const hits = new Map<string, { n: number; reset: number }>();
export function rateLimit(key: string, max = 30, windowMs = 60_000): boolean {
  const now = Date.now();
  const cur = hits.get(key);
  if (!cur || now > cur.reset) {
    hits.set(key, { n: 1, reset: now + windowMs });
    return true;
  }
  if (cur.n >= max) return false;
  cur.n++;
  return true;
}

export function clampNumber(v: unknown, lo: number, hi: number, dflt: number): number {
  const n = Number(v);
  if (!Number.isFinite(n)) return dflt;
  return Math.max(lo, Math.min(hi, n));
}
