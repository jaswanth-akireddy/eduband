// POST /score: server-side LLM proxy for the judgement pillars.
// Body (JSON): { transcript: {text, words}, metrics: {...}, level: string, taskPrompt?: string }
// Returns: { pillars, mistakes, onTopic, modelVersion }
// Auth: required. API keys stay in function secrets.
//
// The prompt, rubric, schema and validator live in ../_shared/scoring.ts and
// are the same ones the app uses in direct test mode.

import { corsHeaders, errorResponse, getAuthedUser, json, rateLimit } from '../_shared/util.ts';
import {
  anthropicHeaders,
  anthropicResponseText,
  anthropicScoringBody,
  buildScoringMessage,
  DEFAULT_ANTHROPIC_MODEL,
  SCORING_PROMPT_VERSION,
  SCORING_SCHEMA,
  SCORING_SYSTEM_PROMPT,
  ScoringError,
  type ScoringInput,
  validateScoring,
} from '../_shared/scoring.ts';

const LLM_PROVIDER = Deno.env.get('LLM_PROVIDER') ?? 'gemini'; // 'claude' or 'gemini'
const ANTHROPIC_MODEL = Deno.env.get('ANTHROPIC_MODEL') ?? DEFAULT_ANTHROPIC_MODEL;
const GEMINI_MODEL = Deno.env.get('GEMINI_MODEL') ?? 'gemini-1.5-flash';

async function callClaude(input: ScoringInput): Promise<{ text: string; model: string }> {
  const key = Deno.env.get('ANTHROPIC_API_KEY');
  if (!key) throw new Error('Claude API key not configured');
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: anthropicHeaders(key),
    body: JSON.stringify(anthropicScoringBody(ANTHROPIC_MODEL, input)),
  });
  if (!res.ok) throw new Error(`Anthropic ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const data = await res.json();
  return { text: anthropicResponseText(data), model: data?.model ?? ANTHROPIC_MODEL };
}

async function callGemini(input: ScoringInput): Promise<{ text: string; model: string }> {
  const key = Deno.env.get('GEMINI_API_KEY');
  if (!key) throw new Error('Gemini API key not configured');
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${key}`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SCORING_SYSTEM_PROMPT }] },
        contents: [{ role: 'user', parts: [{ text: buildScoringMessage(input) }] }],
        generationConfig: {
          // Same recording, same score.
          temperature: 0,
          maxOutputTokens: 2048,
          responseMimeType: 'application/json',
          responseSchema: SCORING_SCHEMA_FOR_GEMINI,
        },
      }),
    },
  );
  if (!res.ok) throw new Error(`Gemini ${res.status}`);
  const data = await res.json();
  return { text: data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '', model: GEMINI_MODEL };
}

// Gemini's schema dialect has no additionalProperties.
// deno-lint-ignore no-explicit-any
function stripAdditional(s: any): any {
  if (Array.isArray(s)) return s.map(stripAdditional);
  if (s && typeof s === 'object') {
    return Object.fromEntries(
      Object.entries(s).filter(([k]) => k !== 'additionalProperties').map(([k, v]) => [k, stripAdditional(v)]),
    );
  }
  return s;
}
const SCORING_SCHEMA_FOR_GEMINI = stripAdditional(SCORING_SCHEMA);

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
    const taskPrompt = typeof body.taskPrompt === 'string' ? body.taskPrompt.slice(0, 500) : null;

    const input: ScoringInput = {
      transcript: text,
      taskPrompt,
      level: typeof body.level === 'string' ? body.level : 'high',
      metrics: (body.metrics as Record<string, unknown>) ?? {},
    };
    const call = LLM_PROVIDER === 'claude' ? callClaude : callGemini;

    // One retry when the output is incomplete or fails validation. After that
    // the client falls back to rules and labels the report as an estimate,
    // rather than this function inventing a 60 for a missing pillar.
    let lastError: unknown;
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const result = await call(input);
        const scored = validateScoring(result.text, text);
        return json(
          { ...scored, modelVersion: `${result.model} ${SCORING_PROMPT_VERSION}` },
          200,
          origin,
        );
      } catch (e) {
        lastError = e;
        if (!(e instanceof ScoringError)) break;
      }
    }
    throw lastError;
  } catch (e) {
    console.error('Scoring error', e);
    const msg = e instanceof Error ? e.message : 'Scoring failed';
    return errorResponse(`Scoring failed: ${msg}`, 502, origin);
  }
});
