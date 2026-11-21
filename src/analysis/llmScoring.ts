// Judgment pillar scoring (language, structure, confidence).
// Single swappable entry point: `scoreJudgmentPillars`.
//
// Resolution order (see src/config.ts):
//   1. Backend proxy -> POST to your Edge Function (Anthropic key server-side)
//   2. Direct Claude or Gemini -> call the provider from the client (test only)
//   3. Rules -> built-in estimates so the app always runs, labelled as such
//
// The prompt, rubric, JSON schema and validator are shared with the server:
// backend/supabase/functions/_shared/scoring.ts.

import { DeterministicMetrics, Level, Mistake, PillarId, Transcript } from '@/types';
import { config, modeFlags } from '@/config';
import { getAccessToken } from '@/services/supabase';
import {
  anthropicHeaders,
  anthropicResponseText,
  anthropicScoringBody,
  buildScoringMessage,
  SCORING_PROMPT_VERSION,
  SCORING_SYSTEM_PROMPT,
  ScoringError,
  type ScoringInput,
  validateScoring,
} from '../../backend/supabase/functions/_shared/scoring';

export interface LlmPillarResult {
  id: PillarId;
  score: number;
  evidence: string;
  tip: string;
  why: string;
}
export interface LlmScoringResult {
  pillars: LlmPillarResult[];
  modelVersion: string;
  // 'rules' when the AI was unreachable and built-in rules scored instead.
  source: 'ai' | 'rules';
  // Only the AI can find mistakes or judge relevance; rules leave these unset.
  mistakes?: Mistake[];
  onTopic?: boolean;
}

// ---------------------------------------------------------------------------
// Evidence: a real sentence from the transcript, chosen per pillar
// ---------------------------------------------------------------------------
const HEDGES = /\b(um+|uh+|er+m?|hmm+|you know|i mean|i think|maybe|kind of|sort of|i guess)\b/gi;

function sentencesOf(text: string): string[] {
  return (text.match(/[^.!?]+[.!?]*/g) ?? [])
    .map((s) => s.trim())
    .filter((s) => s.split(/\s+/).length >= 4);
}

function repetitiveness(sentence: string, all: string): number {
  // How much of this sentence reuses words the speaker leans on elsewhere.
  const words = sentence.toLowerCase().match(/[a-z']+/g) ?? [];
  const counts = new Map<string, number>();
  for (const w of all.toLowerCase().match(/[a-z']+/g) ?? []) counts.set(w, (counts.get(w) ?? 0) + 1);
  const repeated = words.filter((w) => w.length > 3 && (counts.get(w) ?? 0) > 2).length;
  return words.length ? repeated / words.length : 0;
}

// Language: the most repetitive sentence. Structure: the opening, which shows
// whether the main point comes first. Confidence: the sentence with the most
// hedges or fillers, else the closing line. Never the same sentence twice.
export function pillarEvidence(transcript: Transcript): Record<'language' | 'structure' | 'confidence', string> {
  const s = sentencesOf(transcript.text);
  const fallback = 'your recorded answer';
  if (s.length === 0) return { language: fallback, structure: fallback, confidence: fallback };
  const used = new Set<string>();
  const take = (ranked: string[]) => {
    const pick = ranked.find((x) => !used.has(x)) ?? ranked[0];
    used.add(pick);
    return pick;
  };
  const structure = take([s[0], ...s.slice(1)]);
  const byHedges = [...s].sort(
    (a, b) => (b.match(HEDGES)?.length ?? 0) - (a.match(HEDGES)?.length ?? 0)
  );
  const confidence = take(
    (byHedges[0].match(HEDGES)?.length ?? 0) > 0 ? byHedges : [s[s.length - 1], ...[...s].reverse()]
  );
  const language = take([...s].sort((a, b) => repetitiveness(b, transcript.text) - repetitiveness(a, transcript.text)));
  return { language, structure, confidence };
}

// ---------------------------------------------------------------------------
// RULES (no AI reachable)
// ---------------------------------------------------------------------------
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

function mockScore(transcript: Transcript, metrics: DeterministicMetrics): LlmScoringResult {
  const lexPct = Math.round(Math.min(1, metrics.lexicalDiversity / 0.8) * 100);
  const language = clamp(40 + (lexPct - 50) * 0.8, 30, 98);
  const structureBase = metrics.sentenceLengthVariety > 2 && metrics.wordCount > 40 ? 72 : 55;
  const structure = clamp(structureBase + (metrics.wordCount > 120 ? 8 : 0), 30, 96);
  const confidence = clamp(70 - metrics.fillerRate * 200 + (metrics.wpm > 110 ? 6 : -4), 30, 95);
  const ev = pillarEvidence(transcript);
  return {
    modelVersion: 'rules-1.0.0',
    source: 'rules',
    pillars: [
      { id: 'language', score: Math.round(language), evidence: ev.language,
        tip: language < 65 ? 'Swap one common word for a more precise one each session.' : 'Keep stretching vocabulary: one vivid word per key idea.',
        why: `Range of words used: ${(metrics.lexicalDiversity * 100).toFixed(0)}% different words. Grammar was not checked.` },
      { id: 'structure', score: Math.round(structure), evidence: ev.structure,
        tip: structure < 65 ? 'Open with your main point, then give two reasons.' : 'Add a short closing line restating your main point.',
        why: metrics.sentenceLengthVariety < 2 ? 'Sentences were similar in length.' : 'Good mix of sentence lengths.' },
      { id: 'confidence', score: Math.round(confidence), evidence: ev.confidence,
        tip: confidence < 65 ? 'Pause silently instead of using a filler.' : 'Vary emphasis on key words to stay engaging.',
        why: `Filler rate ${(metrics.fillerRate * 100).toFixed(1)}% (${metrics.fillerCount} fillers).` },
    ],
  };
}

// The validator blanks any evidence quote that is not really in the
// transcript; replace those with a real sentence for that pillar.
function finish(
  scored: ReturnType<typeof validateScoring>,
  transcript: Transcript,
  modelVersion: string
): LlmScoringResult {
  const ev = pillarEvidence(transcript);
  return {
    modelVersion,
    source: 'ai',
    onTopic: scored.onTopic,
    mistakes: scored.mistakes,
    pillars: scored.pillars.map((p) => ({ ...p, evidence: p.evidence || ev[p.id] })),
  };
}

async function withRetry<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (e) {
    // Retry once on incomplete or invalid output, not on network or auth errors.
    if (e instanceof ScoringError) return fn();
    throw e;
  }
}

// ---------------------------------------------------------------------------
// DIRECT CLAUDE (test only)
// ---------------------------------------------------------------------------
async function callClaude(input: ScoringInput, transcript: Transcript): Promise<LlmScoringResult> {
  return withRetry(async () => {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: anthropicHeaders(config.anthropicKey),
      body: JSON.stringify(anthropicScoringBody(config.anthropicModel, input)),
    });
    if (!res.ok) throw new Error(`Anthropic error ${res.status}`);
    const data = await res.json();
    const scored = validateScoring(anthropicResponseText(data), input.transcript);
    return finish(scored, transcript, `${data?.model ?? config.anthropicModel} ${SCORING_PROMPT_VERSION}`);
  });
}

// ---------------------------------------------------------------------------
// DIRECT GEMINI (test only)
// ---------------------------------------------------------------------------
async function callGemini(input: ScoringInput, transcript: Transcript): Promise<LlmScoringResult> {
  return withRetry(async () => {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${config.geminiModel}:generateContent?key=${config.geminiKey}`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: SCORING_SYSTEM_PROMPT }] },
          contents: [{ role: 'user', parts: [{ text: buildScoringMessage(input) }] }],
          generationConfig: { temperature: 0, maxOutputTokens: 2048, responseMimeType: 'application/json' },
        }),
      }
    );
    if (!res.ok) throw new Error(`Gemini error ${res.status}`);
    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
    return finish(validateScoring(text, input.transcript), transcript, `${config.geminiModel} ${SCORING_PROMPT_VERSION}`);
  });
}

// ---------------------------------------------------------------------------
// BACKEND PROXY
// ---------------------------------------------------------------------------
async function callBackend(
  transcript: Transcript,
  metrics: DeterministicMetrics,
  level: Level,
  taskPrompt: string | null
): Promise<LlmScoringResult> {
  const token = await getAccessToken();
  const res = await fetch(`${config.apiBase}/score`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ transcript, metrics, level, taskPrompt }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Backend scoring error ${res.status}${body ? `: ${body.slice(0, 300)}` : ''}`);
  }
  const data = await res.json();
  // The server validated already; validating again also re-checks quotes
  // against the transcript this device holds.
  return finish(validateScoring(data, transcript.text), transcript, String(data?.modelVersion ?? 'backend'));
}

// ---------------------------------------------------------------------------
// PUBLIC
// ---------------------------------------------------------------------------
export async function scoreJudgmentPillars(
  transcript: Transcript,
  metrics: DeterministicMetrics,
  level: Level,
  taskPrompt: string | null = null
): Promise<LlmScoringResult> {
  const input: ScoringInput = {
    transcript: transcript.text,
    taskPrompt,
    level,
    metrics: metrics as unknown as Record<string, unknown>,
  };
  try {
    if (modeFlags.useBackend) return await callBackend(transcript, metrics, level, taskPrompt);
    if (modeFlags.useDirectLlm) {
      if (config.llmProvider === 'gemini' && config.geminiKey) return await callGemini(input, transcript);
      if (config.llmProvider === 'claude' && config.anthropicKey) return await callClaude(input, transcript);
    }
  } catch (e) {
    console.warn('LLM scoring failed, using rules:', e);
  }
  return mockScore(transcript, metrics);
}
