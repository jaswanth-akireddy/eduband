// POST /transcribe  — server-side STT proxy. Keys live in function secrets.
// Body (multipart/form-data): audio (file), durationSec (number)
// Auth: required (Bearer JWT).

import { corsHeaders, errorResponse, getAuthedUser, json, rateLimit } from '../_shared/util.ts';

const PROVIDER = Deno.env.get('STT_PROVIDER') ?? 'deepgram';

Deno.serve(async (req) => {
  const origin = req.headers.get('Origin');
  // Outer catch: any uncaught error (auth, boot, provider) returns a JSON 502
  // with the real message instead of a platform-level 5xx (e.g. 540/546) that
  // the client can't diagnose.
  try {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders(origin) });
    if (req.method !== 'POST') return errorResponse('Method not allowed', 405, origin);

    const auth = await getAuthedUser(req);
    if (!auth) return errorResponse('Unauthorized', 401, origin);
    if (!rateLimit(`stt:${auth.userId}`, 20, 60_000))
      return errorResponse('Rate limit exceeded', 429, origin);

    let form: FormData;
    try {
      form = await req.formData();
    } catch {
      return errorResponse('Expected multipart/form-data', 400, origin);
    }
    const audio = form.get('audio');
    if (!(audio instanceof File)) return errorResponse('Missing audio file', 400, origin);
    if (audio.size === 0 || audio.size > 25 * 1024 * 1024)
      return errorResponse('Audio must be 1 byte–25 MB', 400, origin);

    const transcript =
      PROVIDER === 'assemblyai' ? await assemblyai(audio) : await deepgram(audio);
    return json(transcript, 200, origin);
  } catch (e) {
    console.error('STT error', e);
    const msg = e instanceof Error ? e.message : 'Transcription failed';
    return errorResponse(`Transcription failed: ${msg}`, 502, origin);
  }
});

async function deepgram(audio: File) {
  const key = Deno.env.get('DEEPGRAM_API_KEY');
  if (!key) throw new Error('DEEPGRAM_API_KEY not set');
  const res = await fetch(
    'https://api.deepgram.com/v1/listen?model=nova-2&smart_format=true&punctuate=true&diarize=true',
    {
      method: 'POST',
      headers: { Authorization: `Token ${key}`, 'Content-Type': audio.type || 'audio/m4a' },
      body: await audio.arrayBuffer(),
    }
  );
  if (!res.ok) throw new Error(`Deepgram ${res.status}`);
  const data = await res.json();
  const alt = data?.results?.channels?.[0]?.alternatives?.[0];
  if (!alt) throw new Error('No transcript');
  return {
    text: alt.transcript ?? '',
    words: (alt.words ?? []).map((w: Record<string, unknown>) => ({
      word: (w.punctuated_word ?? w.word) as string,
      startSec: w.start as number,
      endSec: w.end as number,
      confidence: (w.confidence as number) ?? 0.9,
    })),
  };
}

async function assemblyai(audio: File) {
  const key = Deno.env.get('ASSEMBLYAI_API_KEY');
  if (!key) throw new Error('ASSEMBLYAI_API_KEY not set');
  const up = await fetch('https://api.assemblyai.com/v2/upload', {
    method: 'POST',
    headers: { authorization: key },
    body: await audio.arrayBuffer(),
  });
  const { upload_url } = await up.json();
  const tr = await fetch('https://api.assemblyai.com/v2/transcript', {
    method: 'POST',
    headers: { authorization: key, 'content-type': 'application/json' },
    body: JSON.stringify({ audio_url: upload_url, speaker_labels: true }),
  });
  const { id } = await tr.json();
  for (let i = 0; i < 60; i++) {
    await new Promise((r) => setTimeout(r, 2000));
    const p = await fetch(`https://api.assemblyai.com/v2/transcript/${id}`, {
      headers: { authorization: key },
    });
    const data = await p.json();
    if (data.status === 'completed') {
      return {
        text: data.text ?? '',
        words: (data.words ?? []).map((w: Record<string, unknown>) => ({
          word: w.text as string,
          startSec: (w.start as number) / 1000,
          endSec: (w.end as number) / 1000,
          confidence: (w.confidence as number) ?? 0.9,
        })),
      };
    }
    if (data.status === 'error') throw new Error(data.error);
  }
  throw new Error('AssemblyAI timed out');
}
