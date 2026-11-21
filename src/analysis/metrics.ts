// Deterministic metrics (Section 10): computed in code, reproducible, cheap.
// WPM, filler rate, pause stats, lexical diversity, sentence-length variety.

import { DeterministicMetrics, Transcript, WordTiming } from '@/types';

// Fillers are HESITATIONS, not words. Only sounds that carry no meaning count
// every time. "like", "so", "actually", "kind of" used to count on every
// appearance, so "I like it", "poets like Tagore" and "the kind of books" were
// all penalised as fillers. Those words count only in filler position below.
const DISFLUENCIES = new Set(['um', 'umm', 'uh', 'uhh', 'er', 'erm', 'ah', 'hmm', 'mm']);

// Discourse fillers, counted only where the recogniser's punctuation marks
// them as set apart: "Like, I..." or "you know," or "I mean,". The same words
// inside a sentence ("I like reading", "you know the answer") do not count.
const POSITIONAL_FILLERS = [/\byou know[,.?!]/gi, /\bi mean,/gi];

function normalizeWord(w: string): string {
  return w.toLowerCase().replace(/[^a-z']/g, '');
}

export function countFillers(transcript: Transcript): number {
  let count = 0;
  for (const w of transcript.words) {
    const n = normalizeWord(w.word);
    if (DISFLUENCIES.has(n)) count++;
    // "like" only when punctuated as an aside: "Like, I..." / "...and, like, we"
    else if (n === 'like' && /,$/.test(w.word.trim())) count++;
  }
  for (const re of POSITIONAL_FILLERS) count += transcript.text.match(re)?.length ?? 0;
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

// Time from the first word to the last: the speech itself. Using recording
// length counted thinking time before the first word as slow speaking.
export function speakingSpan(words: WordTiming[]): number {
  if (words.length === 0) return 0;
  return Math.max(0, words[words.length - 1].endSec - words[0].startSec);
}

// Words the recogniser could barely make out. A low AVERAGE confidence is what
// an unfamiliar accent produces even when every word is understood, so the
// average is not used. Only individual words below this are counted.
export const UNCLEAR_WORD_CONFIDENCE = 0.5;

export function computeMetrics(
  transcript: Transcript,
  durationSec: number
): DeterministicMetrics {
  const wordCount = transcript.words.length;
  const speakingSec = speakingSpan(transcript.words);
  const speakingMin = speakingSec / 60;
  const wpm = speakingMin > 0 ? Math.round(wordCount / speakingMin) : 0;
  const fillerCount = countFillers(transcript);
  const { pauseCount, avgPauseSec } = pauseStats(transcript.words);
  const unclearWordCount = transcript.words.filter(
    (w) => w.confidence < UNCLEAR_WORD_CONFIDENCE
  ).length;

  return {
    durationSec,
    speakingSec,
    wordCount,
    wpm,
    fillerCount,
    fillerRate: wordCount > 0 ? fillerCount / wordCount : 0,
    pauseCount,
    avgPauseSec,
    longPausesPerMin: speakingMin > 0 ? pauseCount / speakingMin : 0,
    lexicalDiversity: lexicalDiversity(transcript.words),
    sentenceLengthVariety: sentenceLengthVariety(transcript.text),
    sttConfidence: avgSttConfidence(transcript.words),
    unclearWordCount,
  };
}
