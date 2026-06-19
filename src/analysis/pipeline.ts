// Analysis pipeline (Section 7 pipeline shape):
//   audio -> STT + diarization -> metric computation -> LLM scoring (JSON)
//   -> store -> render report
// This module orchestrates the steps after STT (metrics -> norms -> LLM -> CI).

import {
  Analysis,
  DeterministicMetrics,
  Level,
  PillarId,
  PillarScore,
  Transcript,
} from '@/types';
import {
  CORE_PILLARS,
  FRAMEWORK_VERSION,
  communicationIndex,
  pillarDef,
} from './framework';
import { computeMetrics } from './metrics';
import { bandScore, getNorms } from './norms';
import { scoreJudgmentPillars } from './llmScoring';
import { suggestTask } from '@/data/tasks';

// Fluency & Clarity are driven mostly by deterministic metrics.
function fluencyScore(m: DeterministicMetrics, level: Level): number {
  const n = getNorms(level);
  const pace = bandScore(m.wpm, n.wpm);
  const fillers = bandScore(m.fillerRate, n.fillerRate);
  const pauses = bandScore(m.avgPauseSec, n.avgPauseSec);
  return Math.round(pace * 0.4 + fillers * 0.35 + pauses * 0.25);
}

function clarityScore(m: DeterministicMetrics): number {
  // Intelligibility proxy from STT confidence (Section 3).
  // Never penalise accent — only flag genuine intelligibility issues.
  return Math.round(Math.min(100, Math.max(30, m.sttConfidence * 100)));
}

function fluencyEvidence(m: DeterministicMetrics): string {
  return `${m.wpm} words/min, ${m.fillerCount} fillers, ${m.pauseCount} notable pauses.`;
}

function fluencyTip(m: DeterministicMetrics, level: Level): string {
  const n = getNorms(level);
  if (m.fillerRate > n.fillerRate.idealHigh) {
    return `Reduce fillers by pausing silently instead — you used ${m.fillerCount} in ${formatDuration(
      m.durationSec
    )}.`;
  }
  if (m.wpm > n.wpm.idealHigh) {
    return 'Slow down slightly so each idea lands — try a breath between sentences.';
  }
  if (m.wpm < n.wpm.idealLow) {
    return 'Pick up the pace a little to keep momentum; aim for a steady, even rhythm.';
  }
  return 'Great pacing — keep this steady rhythm and natural pausing.';
}

function clarityTip(m: DeterministicMetrics): string {
  if (m.sttConfidence < 0.7) {
    return 'Open your mouth a touch more and finish word endings so each word lands clearly.';
  }
  return 'Clear and easy to follow — keep finishing your word endings crisply.';
}

function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  if (m === 0) return `${s}s`;
  return `${m}m ${s}s`;
}

export async function analyze(
  transcript: Transcript,
  durationSec: number,
  level: Level
): Promise<{ metrics: DeterministicMetrics; analysis: Analysis }> {
  // 1. Deterministic metrics (code).
  const metrics = computeMetrics(transcript, durationSec);

  // 2. Deterministic pillar scores (fluency, clarity).
  const fluency = fluencyScore(metrics, level);
  const clarity = clarityScore(metrics);

  // 3. Judgment pillars via LLM (language, structure, confidence).
  const llm = await scoreJudgmentPillars(transcript, metrics, level);
  const llmById = new Map(llm.pillars.map((p) => [p.id, p]));

  // 4. Assemble all five core pillars with evidence + tips.
  const pillars: PillarScore[] = CORE_PILLARS.map((def) => {
    if (def.id === 'fluency') {
      return {
        id: 'fluency',
        label: def.label,
        score: fluency,
        evidence: fluencyEvidence(metrics),
        tip: fluencyTip(metrics, level),
        why: 'Based on pacing, filler rate and pause patterns.',
      };
    }
    if (def.id === 'clarity') {
      return {
        id: 'clarity',
        label: def.label,
        score: clarity,
        evidence: `Speech recognised with ${(metrics.sttConfidence * 100).toFixed(
          0
        )}% confidence.`,
        tip: clarityTip(metrics),
        why: 'Intelligibility proxy from recognition confidence (accent-fair).',
      };
    }
    const r = llmById.get(def.id);
    return {
      id: def.id,
      label: def.label,
      score: r ? r.score : 60,
      evidence: r ? r.evidence : 'your recorded answer',
      tip: r ? r.tip : 'Keep practising — record again to track your growth.',
      why: r ? r.why : '',
    };
  });

  // 5. Communication Index = weighted average.
  const ci = communicationIndex(
    pillars.map((p) => ({ id: p.id, score: p.score }))
  );

  // 6. Strengths + focus areas.
  const sorted = [...pillars].sort((a, b) => b.score - a.score);
  const strengths = sorted
    .slice(0, Math.min(3, sorted.length))
    .filter((p) => p.score >= 60)
    .map((p) => `${pillarDef(p.id).short}: ${describeStrength(p.id)}`);

  const focusAreas: PillarId[] = [...pillars]
    .sort((a, b) => a.score - b.score)
    .slice(0, 3)
    .filter((p) => p.score < 80)
    .map((p) => p.id);

  // 7. Practice suggestion targets the weakest pillar.
  const weakest = focusAreas[0] ?? null;
  const practiceSuggestionTaskId = weakest ? suggestTask(weakest, level) : null;

  const analysis: Analysis = {
    ci,
    pillars,
    strengths: strengths.length ? strengths : ['You showed up and recorded — that is the first win.'],
    focusAreas,
    practiceSuggestionTaskId,
    modelVersion: llm.modelVersion,
    frameworkVersion: FRAMEWORK_VERSION,
  };

  return { metrics, analysis };
}

function describeStrength(id: PillarId): string {
  switch (id) {
    case 'fluency':
      return 'smooth, well-paced delivery.';
    case 'clarity':
      return 'clear and easy to understand.';
    case 'language':
      return 'varied, well-chosen vocabulary.';
    case 'structure':
      return 'well-organised ideas.';
    case 'confidence':
      return 'assured, expressive delivery.';
    default:
      return 'a real strength here.';
  }
}
