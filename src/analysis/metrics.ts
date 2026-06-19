// Deterministic metrics (Section 10) — computed in code, reproducible, cheap.
// WPM, filler rate, pause stats, lexical diversity, sentence-length variety.

import { DeterministicMetrics, Transcript, WordTiming } from '@/types';

// Common English fillers. Extend per language as STT languages expand.
const FILLERS = new Set([
  'um',
  'uh',
  'uhh',
  'umm',
  'er',
  'erm',
  'ah',
  'like',
  'you know',
  'i mean',
  'sort of',
  'kind of',
  'basically',
  'actually',
  'literally',
  'so',
]);

// Multi-word fillers handled separately against the raw text.
const PHRASE_FILLERS = ['you know', 'i mean', 'sort of', 'kind of'];

function normalizeWord(w: string): string {
  return w.toLowerCase().replace(/[^a-z']/g, '');
}

export function countFillers(transcript: Transcript): number {
  const text = transcript.text.toLowerCase();
  let count = 0;

  // single-word fillers from tokenised words
  for (const w of transcript.words) {
    const n = normalizeWord(w.word);
    if (n && FILLERS.has(n)) count++;
  }

  // phrase fillers from raw text
  for (const phrase of PHRASE_FILLERS) {
    const re = new RegExp(`\\b${phrase}\\b`, 'g');
    const matches = text.match(re);
    if (matches) count += matches.length;
  }

  return count;
}

// Pause = gap between consecutive words above a threshold.
export function pauseStats(words: WordTiming[], thresholdSec = 0.6) {
  let pauseCount = 0;
  let totalPause = 0;
  for (let i = 1; i < words.length; i++) {
    const gap = words[i].startSec - words[i - 1].endSec;
    if (gap >= thresholdSec) {
      pauseCount++;
      totalPause += gap;
    }
  }
  return {
    pauseCount,
    avgPauseSec: pauseCount === 0 ? 0 : totalPause / pauseCount,
  };
}

// Length-corrected lexical diversity. Plain type-token ratio is biased by
// length, so we use a moving-average TTR (MATTR) over a window.
export function lexicalDiversity(words: WordTiming[], window = 50): number {
  const tokens = words.map((w) => normalizeWord(w.word)).filter(Boolean);
  if (tokens.length === 0) return 0;
  if (tokens.length <= window) {
    const unique = new Set(tokens).size;
    return unique / tokens.length;
  }
  let sum = 0;
  let count = 0;
  for (let i = 0; i + window <= tokens.length; i++) {
    const slice = tokens.slice(i, i + window);
    const unique = new Set(slice).size;
    sum += unique / window;
    count++;
  }
  return count === 0 ? 0 : sum / count;
}

// Variety in sentence length (stdev). Segment on sentence punctuation.
export function sentenceLengthVariety(text: string): number {
  const sentences = text
    .split(/[.!?]+/)
    .map((s) => s.trim())
    .filter(Boolean);
  if (sentences.length < 2) return 0;
  const lengths = sentences.map((s) => s.split(/\s+/).filter(Boolean).length);
  const mean = lengths.reduce((a, b) => a + b, 0) / lengths.length;
  const variance =
    lengths.reduce((a, b) => a + (b - mean) ** 2, 0) / lengths.length;
  return Math.sqrt(variance);
}

export function avgSttConfidence(words: WordTiming[]): number {
  if (words.length === 0) return 0;
  return words.reduce((a, w) => a + w.confidence, 0) / words.length;
}

export function computeMetrics(
  transcript: Transcript,
  durationSec: number
): DeterministicMetrics {
  const wordCount = transcript.words.length;
  const minutes = durationSec / 60;
  const wpm = minutes > 0 ? Math.round(wordCount / minutes) : 0;
  const fillerCount = countFillers(transcript);
  const { pauseCount, avgPauseSec } = pauseStats(transcript.words);

  return {
    durationSec,
    wordCount,
    wpm,
    fillerCount,
    fillerRate: wordCount > 0 ? fillerCount / wordCount : 0,
    pauseCount,
    avgPauseSec,
    lexicalDiversity: lexicalDiversity(transcript.words),
    sentenceLengthVariety: sentenceLengthVariety(transcript.text),
    sttConfidence: avgSttConfidence(transcript.words),
  };
}
