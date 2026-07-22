// Judgment pillar scoring (language, structure, confidence).
// Single swappable entry point: `scoreJudgmentPillars`.
//
// Resolution order (see src/config.ts):
//   1. Backend proxy -> POST to your Edge Function (Anthropic key server-side)
//   2. Direct Claude -> call Anthropic from the client (test only)
//   3. Mock          -> rules-based scores so the app always runs

import { DeterministicMetrics, Level, PillarId, Transcript } from '@/types';
import { config, modeFlags } from '@/config';
import { getAccessToken } from '@/services/supabase';

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
}

export const CLAUDE_SYSTEM_PROMPT = `You are an expert, kind speech communication coach for students.
You receive a transcript of a student's spoken task and pre-computed deterministic metrics.
Score these pillars 0-100, age/level normed: language (vocabulary richness & grammatical
correctness), structure (organisation, logical flow, connectives, conciseness), confidence
(assertiveness/tone cues inferable from word choice and phrasing).
CRITICAL FAIRNESS RULE: never penalise regional or non-native accents or dialects. Judge
intelligibility and growth, not accent conformity.
For EACH pillar return: score (0-100), a short verbatim evidence snippet quoted from the
transcript, one concrete doable next step (tip), and a one-line why.
Return ONLY valid JSON, no prose, matching exactly:
{"pillars":[{"id":"language|structure|confidence","score":0,"evidence":"","tip":"","why":""}]}`;

// ---------------------------------------------------------------------------
// MOCK
// ---------------------------------------------------------------------------
function pickSnippet(transcript: Transcript, fallback: string): string {
  const sentences = transcript.text
    .split(/[.!?]+/)
    .map((s) => s.trim())
    .filter((s) => s.split(/\s+/).length >= 4);
  if (sentences.length === 0) return fallback;
  return sentences[Math.floor(sentences.length / 2)];
}
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

function mockScore(transcript: Transcript, metrics: DeterministicMetrics): LlmScoringResult {
  const lexPct = Math.round(Math.min(1, metrics.lexicalDiversity / 0.8) * 100);
  const language = clamp(40 + (lexPct - 50) * 0.8, 30, 98);
  const structureBase = metrics.sentenceLengthVariety > 2 && metrics.wordCount > 40 ? 72 : 55;
  const structure = clamp(structureBase + (metrics.wordCount > 120 ? 8 : 0), 30, 96);
  const confidence = clamp(70 - metrics.fillerRate * 200 + (metrics.wpm > 110 ? 6 : -4), 30, 95);
  const snippet = pickSnippet(transcript, 'your recorded answer');
  return {
    modelVersion: 'mock-1.0.0',
    pillars: [
      { id: 'language', score: Math.round(language), evidence: snippet,
        tip: language < 65 ? 'Swap one common word for a more precise one each session.' : 'Keep stretching vocabulary; one vivid word per key idea.',
        why: `Lexical diversity ${(metrics.lexicalDiversity * 100).toFixed(0)}%.` },
      { id: 'structure', score: Math.round(structure), evidence: snippet,
        tip: structure < 65 ? 'Open with your main point, then give two reasons.' : 'Add a short closing line restating your main point.',
        why: metrics.sentenceLengthVariety < 2 ? 'Sentences were similar in length.' : 'Good mix of sentence lengths.' },
      { id: 'confidence', score: Math.round(confidence), evidence: snippet,
        tip: confidence < 65 ? 'Pause silently instead of using a filler.' : 'Vary emphasis on key words to stay engaging.',
        why: `Filler rate ${(metrics.fillerRate * 100).toFixed(1)}% (${metrics.fillerCount} fillers).` },
    ],
  };
}

// ---------------------------------------------------------------------------
// Parse + validate model JSON
// ---------------------------------------------------------------------------
function parsePillars(raw: string): LlmPillarResult[] {
  // Be tolerant: extract the first {...} block in case of stray prose.
  const match = raw.match(/\{[\s\S]*\}/);
  const json = JSON.parse(match ? match[0] : raw);
  const allowed: PillarId[] = ['language', 'structure', 'confidence'];
  return (json.pillars ?? [])
    .filter((p: any) => allowed.includes(p.id))
    .map((p: any) => ({
      id: p.id,
      score: clamp(Math.round(Number(p.score) || 60), 0, 100),
      evidence: String(p.evidence ?? ''),
      tip: String(p.tip ?? ''),
      why: String(p.why ?? ''),
    }));
}

// ---------------------------------------------------------------------------
// DIRECT CLAUDE (test only)
// ---------------------------------------------------------------------------
async function callClaude(
  transcript: Transcript,
  metrics: DeterministicMetrics,
  level: Level
): Promise<LlmScoringResult> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': config.anthropicKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: config.anthropicModel,
      max_tokens: 1024,
      system: CLAUDE_SYSTEM_PROMPT,
      messages: [
        { role: 'user', content: JSON.stringify({ transcript: transcript.text, metrics, level }) },
      ],
    }),
  });
  if (!res.ok) throw new Error(`Anthropic error ${res.status}`);
  const data = await res.json();
  const text = data?.content?.[0]?.text ?? '';
  return { pillars: parsePillars(text), modelVersion: config.anthropicModel };
}

// ---------------------------------------------------------------------------
// DIRECT GEMINI (test only)
// ---------------------------------------------------------------------------
async function callGemini(
  transcript: Transcript,
  metrics: DeterministicMetrics,
  level: Level
): Promise<LlmScoringResult> {
  const prompt = `${CLAUDE_SYSTEM_PROMPT}

Analyze this student's speech and return JSON:
${JSON.stringify({ transcript: transcript.text, metrics, level })}`;

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${config.geminiModel}:generateContent?key=${config.geminiKey}`,
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
  
  if (!res.ok) throw new Error(`Gemini error ${res.status}`);
  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
  return { pillars: parsePillars(text), modelVersion: config.geminiModel };
}

// ---------------------------------------------------------------------------
// BACKEND PROXY
// ---------------------------------------------------------------------------
async function callBackend(
  transcript: Transcript,
  metrics: DeterministicMetrics,
  level: Level
): Promise<LlmScoringResult> {
  const token = await getAccessToken();
  const res = await fetch(`${config.apiBase}/score`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ transcript, metrics, level }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Backend scoring error ${res.status}${body ? `: ${body.slice(0, 300)}` : ''}`);
  }
  return (await res.json()) as LlmScoringResult;
}

// ---------------------------------------------------------------------------
// PUBLIC
// ---------------------------------------------------------------------------
export async function scoreJudgmentPillars(
  transcript: Transcript,
  metrics: DeterministicMetrics,
  level: Level
): Promise<LlmScoringResult> {
  try {
    if (modeFlags.useBackend) return await callBackend(transcript, metrics, level);
    if (modeFlags.useDirectLlm) {
      if (config.llmProvider === 'gemini' && config.geminiKey) {
        const r = await callGemini(transcript, metrics, level);
        if (r.pillars.length) return r;
      } else if (config.llmProvider === 'claude' && config.anthropicKey) {
        const r = await callClaude(transcript, metrics, level);
        if (r.pillars.length) return r;
      }
    }
  } catch (e) {
    console.warn('LLM scoring failed, using mock:', e);
  }
  return mockScore(transcript, metrics);
}
