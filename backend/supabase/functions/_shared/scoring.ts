// One scoring prompt, rubric, schema and validator, shared by the app (direct
// test mode, src/analysis/llmScoring.ts) and the server (functions/score).
// Before this file they had two prompts that disagreed. Keep it free of
// imports and runtime-specific APIs so both React Native and Deno can load it.

export const SCORING_PROMPT_VERSION = 'rubric-1.0.0';

// Claude Opus 5.5. Thinking is always on for this model and sampling
// parameters are not accepted, so determinism comes from the anchored rubric
// and the schema, not from temperature.
export const DEFAULT_ANTHROPIC_MODEL = 'claude-opus-5-5';
export const ANTHROPIC_API_VERSION = '2026-10-21';
// Server-side fallback when a safety classifier declines a request.
export const ANTHROPIC_BETAS = 'server-side-fallback-2026-07-01';

export const JUDGED_PILLARS = ['language', 'structure', 'confidence'] as const;
export type JudgedPillar = (typeof JUDGED_PILLARS)[number];

export const MISTAKE_TYPES = ['grammar', 'word choice', 'linking', 'filler', 'other'] as const;
export type MistakeType = (typeof MISTAKE_TYPES)[number];

export interface ScoredPillar {
  id: JudgedPillar;
  score: number;
  evidence: string; // '' when the model's quote was not in the transcript
  tip: string;
  why: string;
}
export interface ScoredMistake {
  quote: string;
  type: MistakeType;
  correction: string;
  explanation: string;
}
export interface ScoringOutput {
  pillars: ScoredPillar[];
  mistakes: ScoredMistake[];
  onTopic: boolean;
}

export interface ScoringInput {
  transcript: string;
  taskPrompt?: string | null;
  level: string;
  metrics: Record<string, unknown>;
}

// Expected CEFR band per app level. A score of about 75 means "meets the
// expectation for this level", so scores mean the same thing across levels.
const LEVEL_EXPECTATION: Record<string, string> = {
  middle: 'roughly A2 to B1 (ages about 11 to 14)',
  high: 'roughly B1 to B2 (ages about 14 to 18)',
  college: 'roughly B2 to C1 (university and early career)',
};

export const SCORING_SYSTEM_PROMPT = `You assess a student's spoken English answer for EduBand, a speaking coach.
You receive the task the student was answering, their level, a speech-to-text transcript,
and metrics the app has already measured (pace, fillers, pauses). Fluency and clarity are
scored by the app from those metrics; you score three pillars: language, structure and
confidence. Be kind in wording and strict in scoring: a student cannot improve on feedback
that hides their mistakes.

How to score. Each pillar is 0 to 100 against the expectation for the student's level
(given with the input as a CEFR range):
- 90 to 100: clearly above the expected level
- 75 to 89: meets the expected level
- 60 to 74: approaching it, with noticeable gaps
- 40 to 59: well below it, the gaps get in the way of meaning
- below 40: very limited, meaning is often lost

Pillar anchors:
- language: grammatical accuracy and range of vocabulary. Count real errors (agreement,
  tense, articles, plurals, word form, prepositions). Several basic errors in a short answer
  keep language below 60 even when the vocabulary is good. Repeating the same few words
  lowers range.
- structure: whether the answer does what the task asks, and how it is organised: a clear
  main point, supporting reasons or details in a logical order, linking words, an ending.
  An answer that does not address the task scores below 40 on structure however well it is
  organised, and set onTopic to false. A partial answer caps structure at 65.
- confidence: what the words show about assurance: committed statements versus hedging,
  trailing off, restarting, or relying on fillers. Judge the wording, not the voice.

Fairness: the transcript comes from speech recognition. Never penalise accent, regional
variety (Indian English is correct English), or a likely recognition error such as one odd
word in an otherwise fluent sentence. Spelling and punctuation are the recogniser's, not
the student's.

For each pillar give:
- evidence: a short quote copied exactly, character for character, from the transcript,
  chosen to show that pillar's main strength or problem. Use a different quote for each
  pillar.
- tip: one concrete thing to do in the next recording, in plain words a 13-year-old
  understands.
- why: one short sentence explaining the score.

mistakes: up to five of the most useful errors to fix, most important first. Each has the
exact quote from the transcript, its type, the corrected version, and a one-line
explanation. Use type "linking" for missing or wrong connecting words, "filler" for a
filler habit worth breaking. Leave the list empty if there are no real errors. Do not list
accent features or likely recognition errors.`;

// JSON Schema for output_config.format. Every object needs
// additionalProperties:false; numeric bounds are not supported by the API, so
// ranges are enforced in validateScoring.
export const SCORING_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['onTopic', 'pillars', 'mistakes'],
  properties: {
    onTopic: { type: 'boolean' },
    pillars: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['id', 'score', 'evidence', 'tip', 'why'],
        properties: {
          id: { type: 'string', enum: [...JUDGED_PILLARS] },
          score: { type: 'integer' },
          evidence: { type: 'string' },
          tip: { type: 'string' },
          why: { type: 'string' },
        },
      },
    },
    mistakes: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['quote', 'type', 'correction', 'explanation'],
        properties: {
          quote: { type: 'string' },
          type: { type: 'string', enum: [...MISTAKE_TYPES] },
          correction: { type: 'string' },
          explanation: { type: 'string' },
        },
      },
    },
  },
} as const;

// Only the metrics that help the judgement; the rest is noise to the model.
function pickMetrics(m: Record<string, unknown>) {
  const keys = ['wordCount', 'wpm', 'fillerCount', 'longPausesPerMin', 'speakingSec'];
  return Object.fromEntries(keys.filter((k) => m[k] !== undefined).map((k) => [k, m[k]]));
}

export function buildScoringMessage(input: ScoringInput): string {
  const task = input.taskPrompt?.trim() || 'Free speaking: the student chose their own topic.';
  const expectation = LEVEL_EXPECTATION[input.level] ?? LEVEL_EXPECTATION.high;
  return [
    `<task>${task}</task>`,
    `<level>${input.level}: expected ${expectation}</level>`,
    `<metrics>${JSON.stringify(pickMetrics(input.metrics))}</metrics>`,
    `<transcript>${input.transcript}</transcript>`,
  ].join('\n');
}

// Raw HTTP body for POST https://api.anthropic.com/v1/messages.
export function anthropicScoringBody(model: string, input: ScoringInput) {
  return {
    model,
    max_tokens: 16000,
    system: SCORING_SYSTEM_PROMPT,
    // Scoring is a bounded judgement task; medium is this model's default,
    // set explicitly so it does not drift with API defaults.
    output_config: {
      effort: 'medium',
      format: { type: 'json_schema', schema: SCORING_SCHEMA },
    },
    fallbacks: 'default',
    messages: [{ role: 'user', content: buildScoringMessage(input) }],
  };
}

export function anthropicHeaders(apiKey: string): Record<string, string> {
  return {
    'content-type': 'application/json',
    'x-api-key': apiKey,
    'anthropic-version': ANTHROPIC_API_VERSION,
    'anthropic-beta': ANTHROPIC_BETAS,
  };
}

export class ScoringError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ScoringError';
  }
}

// Pull the JSON text out of a Messages API response. Thinking blocks come
// first; the answer is the text block.
// deno-lint-ignore no-explicit-any
export function anthropicResponseText(data: any): string {
  const stop = data?.stop_reason;
  if (stop === 'refusal') throw new ScoringError('The scorer declined this transcript');
  if (stop === 'max_tokens') throw new ScoringError('The scorer ran out of room');
  const blocks: Array<{ type?: string; text?: string }> = Array.isArray(data?.content) ? data.content : [];
  const text = blocks.filter((b) => b.type === 'text').map((b) => b.text ?? '').join('');
  if (!text) throw new ScoringError('The scorer returned no answer');
  return text;
}

// Lowercase, straight quotes, no punctuation, single spaces: a quote counts as
// verbatim if it matches the transcript after this, so a changed comma or a
// curly apostrophe does not reject a real quote.
export function normalizeForMatch(s: string): string {
  return s
    .toLowerCase()
    .replace(/[‘’]/g, "'")
    .replace(/[^a-z0-9'\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function isVerbatim(quote: string, transcript: string): boolean {
  const q = normalizeForMatch(quote);
  if (q.split(' ').length < 2) return false;
  return normalizeForMatch(transcript).includes(q);
}

const clampScore = (v: unknown) => Math.max(0, Math.min(100, Math.round(Number(v))));

// Validate the model's JSON. Throws ScoringError when a pillar is missing or a
// score is not a number, so the caller retries instead of silently showing 60.
// Quotes that are not in the transcript are removed: an evidence quote becomes
// '' (the app picks a real sentence), a mistake is dropped.
export function validateScoring(raw: string | unknown, transcript: string): ScoringOutput {
  let parsed: unknown = raw;
  if (typeof raw === 'string') {
    try {
      parsed = JSON.parse(raw);
    } catch {
      throw new ScoringError('The scorer returned invalid JSON');
    }
  }
  // deno-lint-ignore no-explicit-any
  const obj = parsed as any;
  if (!obj || !Array.isArray(obj.pillars)) throw new ScoringError('No pillars in the scorer output');

  const pillars: ScoredPillar[] = [];
  for (const id of JUDGED_PILLARS) {
    // deno-lint-ignore no-explicit-any
    const p = obj.pillars.find((x: any) => x && x.id === id);
    if (!p || !Number.isFinite(Number(p.score))) throw new ScoringError(`Missing score for ${id}`);
    const evidence = String(p.evidence ?? '');
    pillars.push({
      id,
      score: clampScore(p.score),
      evidence: isVerbatim(evidence, transcript) ? evidence.trim() : '',
      tip: String(p.tip ?? '').trim(),
      why: String(p.why ?? '').trim(),
    });
  }

  const mistakes: ScoredMistake[] = (Array.isArray(obj.mistakes) ? obj.mistakes : [])
    // deno-lint-ignore no-explicit-any
    .filter((m: any) => m && isVerbatim(String(m.quote ?? ''), transcript) && String(m.correction ?? '').trim())
    // deno-lint-ignore no-explicit-any
    .map((m: any) => ({
      quote: String(m.quote).trim(),
      type: (MISTAKE_TYPES as readonly string[]).includes(m.type) ? m.type : 'other',
      correction: String(m.correction).trim(),
      explanation: String(m.explanation ?? '').trim(),
    }))
    .slice(0, 5);

  return { pillars, mistakes, onTopic: obj.onTopic !== false };
}
