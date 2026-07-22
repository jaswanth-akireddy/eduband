// POST /score — server-side LLM proxy for judgment pillars (Claude or Gemini).
// Body (JSON): { transcript: {text, words}, metrics: {...}, level: string }
// Auth: required. API keys stay in function secrets.

import { corsHeaders, errorResponse, getAuthedUser, json, rateLimit } from '../_shared/util.ts';

const LLM_PROVIDER = Deno.env.get('LLM_PROVIDER') ?? 'gemini'; // 'claude' or 'gemini'
const ANTHROPIC_MODEL = Deno.env.get('ANTHROPIC_MODEL') ?? 'claude-3-5-sonnet-latest';
const GEMINI_MODEL = Deno.env.get('GEMINI_MODEL') ?? 'gemini-1.5-flash';

const SYSTEM = `You are an expert, kind speech communication coach for students.
You receive a transcript and pre-computed deterministic metrics. Score these pillars
0-100, age/level normed: language, structure, confidence. CRITICAL FAIRNESS RULE:
never penalise regional or non-native accents. Judge intelligibility and growth.
For EACH pillar return score, a short verbatim evidence snippet from the transcript,
one concrete tip, and a one-line why. Return ONLY valid JSON:
{"pillars":[{"id":"language|structure|confidence","score":0,"evidence":"","tip":"","why":""}]}`;

const ALLOWED = ['language', 'structure', 'confidence'];

async function callClaude(text: string, body: Record<string, unknown>) {
  const key = Deno.env.get('ANTHROPIC_API_KEY');
  if (!key) throw new Error('Claude API key not configured');
  
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: ANTHROPIC_MODEL,
      max_tokens: 1024,
      system: SYSTEM,
      messages: [
        {
          role: 'user',
          content: JSON.stringify({
            transcript: text,
            metrics: body.metrics ?? {},
            level: body.level ?? 'high',
          }),
        },
      ],
    }),
  });
  if (!res.ok) throw new Error(`Anthropic ${res.status}`);
  const data = await res.json();
  return { text: data?.content?.[0]?.text ?? '', model: ANTHROPIC_MODEL };
}

async function callGemini(text: string, body: Record<string, unknown>) {
  const key = Deno.env.get('GEMINI_API_KEY');
  if (!key) throw new Error('Gemini API key not configured');
  
  const prompt = `${SYSTEM}

Analyze this student's speech and return JSON:
${JSON.stringify({ transcript: text, metrics: body.metrics ?? {}, level: body.level ?? 'high' })}`;

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${key}`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: prompt }]
        }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 1024,
        },
      }),
    }
  );
  
  if (!res.ok) throw new Error(`Gemini ${res.status}`);
  const data = await res.json();
  return { text: data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '', model: GEMINI_MODEL };
}

Deno.serve(async (req) => {
  const origin = req.headers.get('Origin');
  // Outer catch: any uncaught error returns a JSON 502 with the real message
  // instead of a platform-level 5xx (e.g. 540/546) the client can't diagnose.
  try {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders(origin) });
    if (req.method !== 'POST') return errorResponse('Method not allowed', 405, origin);

    const auth = await getAuthedUser(req);
    if (!auth) return errorResponse('Unauthorized', 401, origin);
    if (!rateLimit(`score:${auth.userId}`, 30, 60_000))
      return errorResponse('Rate limit exceeded', 429, origin);

    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return errorResponse('Invalid JSON', 400, origin);
    }
    const transcript = body?.transcript as { text?: string } | undefined;
    const text = transcript?.text;
    if (typeof text !== 'string' || text.length === 0)
      return errorResponse('Missing transcript text', 400, origin);
    if (text.length > 20000) return errorResponse('Transcript too long', 413, origin);

    const result =
      LLM_PROVIDER === 'claude' ? await callClaude(text, body) : await callGemini(text, body);

    const raw = result.text;
    const match = raw.match(/\{[\s\S]*\}/);
    const parsed = JSON.parse(match ? match[0] : raw);
    const pillars = (parsed.pillars ?? [])
      .filter((p: Record<string, unknown>) => ALLOWED.includes(p.id as string))
      .map((p: Record<string, unknown>) => ({
        id: p.id as string,
        score: Math.max(0, Math.min(100, Math.round(Number(p.score) || 60))),
        evidence: String(p.evidence ?? ''),
        tip: String(p.tip ?? ''),
        why: String(p.why ?? ''),
      }));
    return json({ pillars, modelVersion: result.model }, 200, origin);
  } catch (e) {
    console.error('Scoring error', e);
    const msg = e instanceof Error ? e.message : 'Scoring failed';
    return errorResponse(`Scoring failed: ${msg}`, 502, origin);
  }
});
