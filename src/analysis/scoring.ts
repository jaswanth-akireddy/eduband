// Scoring pipeline (Sections 3, 10).
//
// Deterministic pillars (fluency, clarity, language) are derived from the
// code-computed metrics + level norms — reproducible and cheap.
//
// Judgment pillars (structure, confidence) would be scored by an LLM (Claude)
// given the transcript + metrics, returning structured JSON with a score and
// an evidence quote. For the MVP this runs through a single function
// `scoreJudgmentPillars` whose mock implementation is swappable for a real
// Claude API call without touching the UI.

import {
  Analysis,
  DeterministicMetrics,
  PillarId,
  PillarScore,
  StudentProfile,
  Transcript,
} from '@/types';
import {
  CORE_PILLARS,
  FRAMEWORK_VERSION,
  communicationIndex,
  pillarDef,
} from './framework';
import { bandScore, getNorms } from './norms';

export const MODEL_VERSION = 'mock-judgment-1.0.0';

// Pull a short, real snippet from the student's own speech as evidence.
function snippet(transcript: Transcript, maxWords = 14): string {
  const words = transcript.text.split(/\s+/).filter(Boolean);
  if (words.length === 0) return '(no speech detected)';
  const start = Math.min(2, Math.max(0, words.length - maxWords));
  const slice = words.slice(start, start + maxWords).join(' ');
  return `“…${slice}…”`;
}

// ---- Deterministic pillars ----

function fluencyPillar(m: DeterministicMetrics, t: Transcript, level: StudentProfile['level']): PillarScore {
  const norms = getNorms(level);
  const wpmScore = bandScore(m.wpm, norms.wpm);
  const fillerScore = bandScore(m.fillerRate, norms.fillerRate);
  const pauseScore = bandScore(m.avgPauseSec, norms.avgPauseSec);
  const score = Math.round(0.4 * wpmScore + 0.35 * fillerScore + 0.25 * pauseScore);

  const fillerPer = m.durationSec > 0 ? (m.fillerCount / (m.durationSec / 60)).toFixed(0) : '0';
  return {
    id: 'fluency',
    label: pillarDef('fluency').label,
    score,
    why: `${m.wpm} words/min, ${m.fillerCount} fillers (~${fillerPer}/min), avg pause ${m.avgPauseSec.toFixed(1)}s`,
    tip:
      m.fillerRate > 0.05
        ? `Reduce fillers by pausing silently instead — you used ${m.fillerCount} in this session.`
        : m.wpm > norms.wpm.idealHigh
        ? 'Slow down slightly so each idea lands clearly.'
        : 'Keep a steady pace and let natural pauses do the work.',
    evidence: snippet(t),
  };
}

function clarityPillar(m: DeterministicMetrics, t: Transcript): PillarScore {
  // Intelligibility proxy from STT confidence.
  const score = Math.round(Math.max(30, Math.min(100, m.sttConfidence * 100)));
  return {
    id: 'clarity',
    label: pillarDef('clarity').label,
    score,
    why: `Speech recognised with ${(m.sttConfidence * 100).toFixed(0)}% average confidence`,
    tip:
      score < 70
        ? 'Open your mouth a little more and finish word endings — avoid trailing off at the end of sentences.'
        : 'Clear and easy to follow. Keep articulating word endings fully.',
    evidence: snippet(t),
  };
}

function languagePillar(m: DeterministicMetrics, t: Transcript, level: StudentProfile['level']): PillarScore {
  const norms = getNorms(level);
  const ldScore = bandScore(m.lexicalDiversity, norms.lexicalDiversity);
  const varietyScore = bandScore(m.sentenceLengthVariety, norms.sentenceLengthVariety);
  const score = Math.round(0.6 * ldScore + 0.4 * varietyScore);
  return {
    id: 'language',
    label: pillarDef('language').label,
    score,
    why: `Lexical diversity ${(m.lexicalDiversity * 100).toFixed(0)}%, sentence-length variety ${m.sentenceLengthVariety.toFixed(1)}`,
    tip:
      score < 70
        ? 'Swap a few repeated words for richer alternatives, and vary short and long sentences.'
        : 'Nice range of vocabulary. Keep stretching for precise words.',
    evidence: snippet(t),
  };
}

// ---- Judgment pillars (swappable LLM call) ----
//
// Replace the body of this function with a real Claude API call that returns
// strict JSON: { structure: {score, evidence, tip, why}, confidence: {...} }.
// The rest of the app does not change.
export async function scoreJudgmentPillars(
  transcript: Transcript,
  metrics: DeterministicMetrics
): Promise<Record<'structure' | 'confidence', Omit<PillarScore, 'id' | 'label'>>> {
  // --- MOCK IMPLEMENTATION (no API key required) ---
  // Heuristics derived from the transcript so scores feel grounded and vary
  // with real speech, while we wire up the real model.
  const text = transcript.text.toLowerCase();
  const connectives = ['because', 'so', 'however', 'therefore', 'first', 'then', 'finally', 'for example', 'although', 'but'];
  const connectiveHits = connectives.filter((c) => text.includes(c)).length;
  const sentenceCount = transcript.text.split(/[.!?]+/).filter((s) => s.trim()).length;

  const structureScore = Math.max(
    35,
    Math.min(100, 50 + connectiveHits * 7 + Math.min(sentenceCount, 8) * 2 - (metrics.sentenceLengthVariety > 12 ? 10 : 0))
  );

  // Confidence proxy from pace steadiness + few long pauses + decent volume of speech.
  const confidenceScore = Math.max(
    35,
    Math.min(
      100,
      60 +
        (metrics.wordCount > 60 ? 12 : 0) -
        (metrics.avgPauseSec > 1.5 ? 15 : 0) -
        (metrics.fillerRate > 0.08 ? 12 : 0)
    )
  );

  return {
    structure: {
      score: Math.round(structureScore),
      why: `${connectiveHits} linking words across ~${sentenceCount} sentences`,
      tip:
        structureScore < 70
          ? 'Signpost your ideas: open with your main point, then use “first…, then…, finally…”.'
          : 'Well organised. Keep opening with a clear main idea.',
      evidence: snippet(transcript),
    },
    confidence: {
      score: Math.round(confidenceScore),
      why: `Steady delivery with avg pause ${metrics.avgPauseSec.toFixed(1)}s and low hesitation`,
      tip:
        confidenceScore < 70
          ? 'Project a little more and reduce long pauses — a steady, audible voice reads as confident.'
          : 'Assured, expressive delivery. Keep varying your tone to hold attention.',
      evidence: snippet(transcript),
    },
  };
  // --- END MOCK ---
}

// ---- Orchestration ----

export async function runAnalysis(
  transcript: Transcript,
  metrics: DeterministicMetrics,
  profile: StudentProfile,
  availableTaskIds: { id: PillarId | string; targetPillars: PillarId[] }[] = []
): Promise<Analysis> {
  const fluency = fluencyPillar(metrics, transcript, profile.level);
  const clarity = clarityPillar(metrics, transcript);
  const language = languagePillar(metrics, transcript, profile.level);

  const judged = await scoreJudgmentPillars(transcript, metrics);
  const structure: PillarScore = {
    id: 'structure',
    label: pillarDef('structure').label,
    ...judged.structure,
  };
  const confidence: PillarScore = {
    id: 'confidence',
    label: pillarDef('confidence').label,
    ...judged.confidence,
  };

  const pillars: PillarScore[] = [fluency, clarity, language, structure, confidence];

  const ci = communicationIndex(pillars.map((p) => ({ id: p.id, score: p.score })));

  // Strengths: top 2-3 pillars; focus: weakest 2-3.
  const sorted = [...pillars].sort((a, b) => b.score - a.score);
  const strengths = sorted.slice(0, 2).map((p) => `${p.label}: ${p.evidence}`);
  const focusAreas = sorted.slice(-2).map((p) => p.id).reverse();

  // Suggest practice for the weakest pillar.
  const weakest = focusAreas[0];
  const suggestion =
    availableTaskIds.find((t) => t.targetPillars.includes(weakest)) ?? null;

  return {
    ci,
    pillars,
    strengths,
    focusAreas,
    practiceSuggestionTaskId: suggestion ? String(suggestion.id) : null,
    modelVersion: MODEL_VERSION,
    frameworkVersion: FRAMEWORK_VERSION,
  };
}

export { CORE_PILLARS };
