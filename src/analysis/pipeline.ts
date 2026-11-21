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
import { computeMetrics, speakingSpan } from './metrics';
import { bandScore, getNorms } from './norms';
import { scoreJudgmentPillars } from './llmScoring';
import { suggestTask } from '@/data/tasks';

// Fluency & Clarity are driven mostly by deterministic metrics.
function fluencyScore(m: DeterministicMetrics, level: Level): number {
  const n = getNorms(level);
  const pace = bandScore(m.wpm, n.wpm);
  const fillers = bandScore(m.fillerRate, n.fillerRate);
  const pauses = bandScore(m.longPausesPerMin ?? 0, n.longPausesPerMin);
  return Math.round(pace * 0.4 + fillers * 0.35 + pauses * 0.25);
}

// Share of words the recogniser could barely make out. Average confidence is
// not used: it drops for unfamiliar accents even when every word is
// understood, so it scored identical answers differently by accent.
function unclearRate(m: DeterministicMetrics): number {
  return m.wordCount > 0 ? (m.unclearWordCount ?? 0) / m.wordCount : 0;
}

function clarityScore(m: DeterministicMetrics): number {
  // Up to 2% unclear words is normal speech: full marks. Tapers to the floor
  // at 15%, where a listener would be missing roughly one word in seven.
  return bandScore(unclearRate(m), { idealLow: 0, idealHigh: 0.02, hardLow: -1, hardHigh: 0.15 });
}

function fluencyEvidence(m: DeterministicMetrics): string {
  const f = m.fillerCount === 1 ? 'filler' : 'fillers';
  const p = m.pauseCount === 1 ? 'long pause' : 'long pauses';
  return `${m.wpm} words/min, ${m.fillerCount} ${f}, ${m.pauseCount} ${p}.`;
}

function fluencyTip(m: DeterministicMetrics, level: Level): string {
  const n = getNorms(level);
  if (m.fillerRate > n.fillerRate.idealHigh) {
    return `Reduce fillers by pausing silently instead. You used ${m.fillerCount} in ${formatDuration(
      m.durationSec
    )}.`;
  }
  if (m.wpm > n.wpm.idealHigh) {
    return 'Slow down slightly so each idea lands. Try a breath between sentences.';
  }
  if (m.wpm < n.wpm.idealLow) {
    return 'Pick up the pace a little to keep momentum; aim for a steady, even rhythm.';
  }
  return 'Great pacing. Keep this steady rhythm and natural pausing.';
}

function clarityTip(m: DeterministicMetrics): string {
  if (unclearRate(m) > 0.05) {
    return 'A few words were hard to make out. Slow down on key words and finish your word endings.';
  }
  return 'Your words came through clearly. Keep finishing your word endings crisply.';
}

function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  if (m === 0) return `${s}s`;
  return `${m}m ${s}s`;
}

// Below this there is too little speech to assess fairly: vocabulary range is
// inflated on a handful of words, and pace and pauses are not measurable. A
// 14-word, 7-second answer used to receive a normal score (CI 75).
export const MIN_WORDS = 25;
export const MIN_SPEAKING_SEC = 15;

export class InsufficientSpeechError extends Error {
  constructor(readonly words: number, readonly speakingSec: number) {
    super(
      `That was a bit short to assess (${words} words, about ${Math.round(speakingSec)} seconds of speech). ` +
        `Try speaking for at least ${MIN_SPEAKING_SEC} seconds so we can give useful feedback.`
    );
    this.name = 'InsufficientSpeechError';
  }
}


export async function analyze(
  transcript: Transcript,
  durationSec: number,
  level: Level,
  // What the student was asked. Lets the scorer judge whether they answered it.
  taskPrompt: string | null = null
): Promise<{ metrics: DeterministicMetrics; analysis: Analysis }> {
  // 0. Refuse to score too little speech.
  const speakingSec = speakingSpan(transcript.words);
  if (transcript.words.length < MIN_WORDS || speakingSec < MIN_SPEAKING_SEC) {
    throw new InsufficientSpeechError(transcript.words.length, speakingSec);
  }

  // 1. Deterministic metrics (code).
  const metrics = computeMetrics(transcript, durationSec);

  // 2. Deterministic pillar scores (fluency, clarity).
  const fluency = fluencyScore(metrics, level);
  const clarity = clarityScore(metrics);

  // 3. Judgment pillars via LLM (language, structure, confidence).
  const llm = await scoreJudgmentPillars(transcript, metrics, level, taskPrompt);
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
        evidence:
          (metrics.unclearWordCount ?? 0) === 0
            ? 'Every word was clear enough to transcribe.'
            : `${metrics.unclearWordCount} of ${metrics.wordCount} words were hard to make out.`,
        tip: clarityTip(metrics),
        // Not labelled accent-fair: the threshold still needs checking against
        // real recordings across accents (docs/ASSESSMENT_REVIEW.md, iteration D).
        why: 'Based on how many words were hard to make out, not on accent.',
      };
    }
    const r = llmById.get(def.id);
    return {
      id: def.id,
      label: def.label,
      score: r ? r.score : 60,
      evidence: r ? r.evidence : 'your recorded answer',
      tip: r ? r.tip : 'Keep practising, and record again to track your growth.',
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
    strengths: strengths.length ? strengths : ['You showed up and recorded. That is the first win.'],
    focusAreas,
    practiceSuggestionTaskId,
    modelVersion: llm.modelVersion,
    frameworkVersion: FRAMEWORK_VERSION,
    scoringSource: llm.source,
    transcriptSource: transcript.source ?? 'stt',
    ...(llm.mistakes ? { mistakes: llm.mistakes } : {}),
    ...(llm.onTopic !== undefined ? { onTopic: llm.onTopic } : {}),
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
