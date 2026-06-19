// Speech-to-text behind a single swappable function (Section 7).
// MVP ships a mock transcriber so the full pipeline runs with no API key.
// Swap `transcribe` to call AssemblyAI / Deepgram / Whisper later — nothing
// else in the app changes.

import { Transcript, WordTiming } from '@/types';

export type SttProvider = 'mock' | 'assemblyai' | 'deepgram';

// Active provider. Change to 'assemblyai' or 'deepgram' once keys are wired.
export const STT_PROVIDER: SttProvider = 'mock';

// Realistic sample monologues used by the mock so reports vary and feel real.
const SAMPLE_PASSAGES = [
  `My favourite place is my grandmother's house in the village. Um, it is surrounded by green fields and there is a small river nearby. Every summer we go there and, you know, we spend the whole day outside. First we help in the garden, then we cook together, and finally in the evening we sit and tell stories. I love it because it feels peaceful and I always learn something new from my grandmother.`,
  `So today I want to talk about why reading is important. Reading helps us, uh, build vocabulary and it improves our imagination. For example, when I read a good book I can picture the whole world in my head. Although it can be difficult to start, once you find a story you enjoy, it becomes a habit. Therefore I believe every student should read a little every day because it makes us better thinkers and better speakers.`,
  `I think technology has changed how we learn. Like, in the past students only had textbooks, but now we have videos, apps and so many resources online. However, we must use it carefully because, um, it is easy to get distracted. In my opinion the best approach is balance. We should use technology to explore new ideas but also take time to think on our own and discuss with friends.`,
];

// Build word-level timing for the mock transcript, with a few natural pauses.
function fabricateTiming(text: string, durationSec: number): WordTiming[] {
  const tokens = text.split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return [];
  const perWord = durationSec / tokens.length;
  const words: WordTiming[] = [];
  let t = 0;
  tokens.forEach((tok, i) => {
    // occasional natural pause before some words
    const isPause = i > 0 && i % 17 === 0;
    if (isPause) t += 0.8;
    const dur = perWord * (0.6 + Math.random() * 0.5);
    const clean = tok.replace(/[^A-Za-z']/g, '');
    const isFiller = /^(um|uh|like|so)$/i.test(clean);
    words.push({
      word: tok,
      startSec: +t.toFixed(2),
      endSec: +(t + dur).toFixed(2),
      // fillers and word-endings get slightly lower confidence for realism
      confidence: +(0.78 + Math.random() * 0.2 - (isFiller ? 0.1 : 0)).toFixed(2),
    });
    t += dur;
  });
  return words;
}

async function transcribeMock(_audioUri: string | null, durationSec: number): Promise<Transcript> {
  // simulate processing latency
  await new Promise((r) => setTimeout(r, 1200));
  const text = SAMPLE_PASSAGES[Math.floor(Math.random() * SAMPLE_PASSAGES.length)];
  const words = fabricateTiming(text, Math.max(durationSec, 20));
  return { text, words };
}

// ---- Real provider adapters (stubbed; fill in when keys are available) ----

async function transcribeAssemblyAI(_audioUri: string, _durationSec: number): Promise<Transcript> {
  // 1) Upload audio to AssemblyAI, 2) request transcript with
  //    speaker_labels + word timings, 3) poll until complete,
  //    4) map response.words -> WordTiming[].
  throw new Error('AssemblyAI adapter not configured. Add API key and implement.');
}

async function transcribeDeepgram(_audioUri: string, _durationSec: number): Promise<Transcript> {
  // POST audio to Deepgram with diarize=true & utterances; map words -> WordTiming[].
  throw new Error('Deepgram adapter not configured. Add API key and implement.');
}

export async function transcribe(audioUri: string | null, durationSec: number): Promise<Transcript> {
  switch (STT_PROVIDER) {
    case 'assemblyai':
      return transcribeAssemblyAI(audioUri as string, durationSec);
    case 'deepgram':
      return transcribeDeepgram(audioUri as string, durationSec);
    case 'mock':
    default:
      return transcribeMock(audioUri, durationSec);
  }
}
