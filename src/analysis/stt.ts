// Speech-to-text + diarization. Single swappable entry point: `transcribe`.
//
// Resolution order (see src/config.ts):
//   1. Backend proxy  -> POST audio to your Edge Function (keys server-side)
//   2. Direct provider -> Deepgram / AssemblyAI from the client (test only)
//   3. Mock           -> realistic offline transcript so the app always runs

import { Transcript, WordTiming } from '@/types';
import { config, modeFlags } from '@/config';
import { getAccessToken } from '@/services/supabase';
import { logEvent, logInfo, logWarn } from '@/services/logger';

// ---------------------------------------------------------------------------
// MOCK (offline fallback)
// ---------------------------------------------------------------------------
const MOCK_SAMPLES = [
  `Um, my favourite place is my grandmother's house in the village. It is special because, you know, it is very quiet and green. I like sitting on the roof in the evening and watching the sky change colour. The food there is amazing and my cousins visit so we play together. I think it is the one place where I feel completely relaxed and like, myself.`,
  `So I want to talk about my hobby which is sketching. Basically I started two years ago with a cheap pencil and now I have a proper set. The thing I enjoy most is that you can capture a moment that would otherwise be forgotten. When I draw, time just disappears. I would tell a beginner to start small, draw every day, and not worry about mistakes because mistakes are how you learn.`,
  `In my opinion students should be allowed to use phones in class but with clear rules. First, phones are powerful learning tools; you can look up a word, watch a demonstration, or check a fact instantly. Second, banning them completely does not teach responsibility. However, there must be limits during tests and discussions. So my view is balanced: guided access, not a full ban.`,
];

function buildWordTimings(text: string, durationSec: number): WordTiming[] {
  const tokens = text.split(/\s+/).filter(Boolean);
  const words: WordTiming[] = [];
  const baseGap = durationSec / Math.max(tokens.length, 1);
  let t = 0;
  for (let i = 0; i < tokens.length; i++) {
    const isPauseAfter = /[.,!?]$/.test(tokens[i]) && Math.random() < 0.7;
    const wordDur = baseGap * 0.7;
    const start = t;
    const end = t + wordDur;
    const confidence = 0.82 + Math.random() * 0.15;
    words.push({
      word: tokens[i],
      startSec: round2(start),
      endSec: round2(end),
      confidence: round2(confidence),
    });
    t = end + (isPauseAfter ? baseGap * 1.2 : baseGap * 0.3);
  }
  return words;
}
const round2 = (n: number) => Math.round(n * 100) / 100;

async function mockTranscribe(durationSec: number): Promise<Transcript> {
  const idx = Math.min(MOCK_SAMPLES.length - 1, Math.floor(durationSec / 60));
  const text = MOCK_SAMPLES[idx] ?? MOCK_SAMPLES[0];
  await new Promise((r) => setTimeout(r, 800));
  return { text, words: buildWordTimings(text, Math.max(durationSec, 8)) };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
async function uriToBlob(uri: string): Promise<Blob> {
  const res = await fetch(uri);
  return res.blob();
}

// ---------------------------------------------------------------------------
// DEEPGRAM (direct, client-side — test only)
// ---------------------------------------------------------------------------
async function deepgramTranscribe(uri: string): Promise<Transcript> {
  const audio = await uriToBlob(uri);
  const res = await fetch(
    'https://api.deepgram.com/v1/listen?model=nova-2&smart_format=true&punctuate=true&diarize=true&utterances=true',
    {
      method: 'POST',
      headers: {
        Authorization: `Token ${config.deepgramKey}`,
        'Content-Type': audio.type || 'audio/m4a',
      },
      body: audio,
    }
  );
  if (!res.ok) throw new Error(`Deepgram error ${res.status}`);
  const data = await res.json();
  const alt = data?.results?.channels?.[0]?.alternatives?.[0];
  if (!alt) throw new Error('Deepgram: no transcript');
  const words: WordTiming[] = (alt.words ?? []).map((w: any) => ({
    word: w.punctuated_word ?? w.word,
    startSec: w.start,
    endSec: w.end,
    confidence: w.confidence ?? 0.9,
  }));
  return { text: alt.transcript ?? '', words };
}

// ---------------------------------------------------------------------------
// ASSEMBLYAI (direct, client-side — test only)
// ---------------------------------------------------------------------------
async function assemblyTranscribe(uri: string): Promise<Transcript> {
  const audio = await uriToBlob(uri);
  // 1) upload
  const up = await fetch('https://api.assemblyai.com/v2/upload', {
    method: 'POST',
    headers: { authorization: config.deepgramKey },
    body: audio,
  });
  const { upload_url } = await up.json();
  // 2) request transcript
  const tr = await fetch('https://api.assemblyai.com/v2/transcript', {
    method: 'POST',
    headers: { authorization: config.deepgramKey, 'content-type': 'application/json' },
    body: JSON.stringify({ audio_url: upload_url, speaker_labels: true }),
  });
  const { id } = await tr.json();
  // 3) poll
  for (let i = 0; i < 60; i++) {
    await new Promise((r) => setTimeout(r, 2000));
    const p = await fetch(`https://api.assemblyai.com/v2/transcript/${id}`, {
      headers: { authorization: config.deepgramKey },
    });
    const data = await p.json();
    if (data.status === 'completed') {
      const words: WordTiming[] = (data.words ?? []).map((w: any) => ({
        word: w.text,
        startSec: w.start / 1000,
        endSec: w.end / 1000,
        confidence: w.confidence ?? 0.9,
      }));
      return { text: data.text ?? '', words };
    }
    if (data.status === 'error') throw new Error(`AssemblyAI: ${data.error}`);
  }
  throw new Error('AssemblyAI: timed out');
}

// ---------------------------------------------------------------------------
// BACKEND PROXY (recommended — keys live server-side)
// ---------------------------------------------------------------------------
async function backendTranscribe(uri: string, durationSec: number): Promise<Transcript> {
  const audio = await uriToBlob(uri);
  const form = new FormData();
  // RN FormData accepts a file descriptor object (not in DOM typings).
  form.append('audio', {
    uri,
    name: 'session.m4a',
    type: audio.type || 'audio/m4a',
  } as unknown as Blob);
  form.append('durationSec', String(durationSec));
  const token = await getAccessToken();
  if (!token) {
    // No JWT = the function will 401. Surface it clearly rather than as a
    // mysterious auth failure — real STT requires being signed in.
    throw new Error('Not signed in — backend STT needs a logged-in session');
  }
  const res = await fetch(`${config.apiBase}/transcribe`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Backend STT error ${res.status}${body ? `: ${body.slice(0, 300)}` : ''}`);
  }
  return (await res.json()) as Transcript;
}

// ---------------------------------------------------------------------------
// PUBLIC
// ---------------------------------------------------------------------------
export async function transcribe(
  audioUri: string | null,
  durationSec: number
): Promise<Transcript> {
  try {
    if (audioUri && modeFlags.useBackend) {
      logInfo('Transcribing via backend', config.apiBase);
      const t = await backendTranscribe(audioUri, durationSec);
      logEvent('Transcript received (backend)', { words: t.words.length });
      return t;
    }
    if (audioUri && modeFlags.useDirectStt) {
      logInfo(`Transcribing via ${config.sttProvider}`);
      const t =
        config.sttProvider === 'assemblyai'
          ? await assemblyTranscribe(audioUri)
          : await deepgramTranscribe(audioUri);
      logEvent(`Transcript received (${config.sttProvider})`, { words: t.words.length });
      return t;
    }
    logInfo('No STT configured — using mock transcript');
  } catch (e) {
    // Fall back to mock so a transient API/network issue never blocks the user.
    logWarn('STT failed, using mock transcript', e);
  }
  const t = await mockTranscribe(durationSec);
  logEvent('Transcript ready (mock)', { words: t.words.length });
  return t;
}
