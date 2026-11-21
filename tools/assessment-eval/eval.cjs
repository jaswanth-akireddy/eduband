// Assessment scorecard: does EduBand score speech fairly and usefully?
//
//   npm run eval:assessment
//
// Runs the real analysis pipeline (src/analysis) on designed recordings in
// cases.cjs and checks fourteen properties a fair English assessment must have.
// Each check prints the measured values behind its verdict. Re-run after every
// change to the scoring code: a fix should flip checks to PASS without
// flipping any other check to FAIL.
//
// Scope: this exercises the code path the app takes when no LLM is reachable
// (rules for the judgement pillars), which is what students get while the
// backend is down. Checks 7 and 8 need the AI scorer and fail on this path by
// design: rules cannot see grammar or relevance. Check 10 reads the server
// source; checks 13 and 14 exercise the shared prompt and validator that the
// AI path uses (backend/supabase/functions/_shared/scoring.ts).

const fs = require('fs');
const path = require('path');
const { ROOT } = require('./register.cjs');
const { analyze, InsufficientSpeechError } = require(path.join(ROOT, 'src/analysis/pipeline.ts'));
const { transcribe, TranscriptionError } = require(path.join(ROOT, 'src/analysis/stt.ts'));
const { config } = require('./stubs/config.cjs');
const scoring = require(path.join(ROOT, 'backend/supabase/functions/_shared/scoring.ts'));
const speak = require('./speak.cjs');
const cases = require('./cases.cjs');

const quiet = console.log;
async function run(id) {
  const c = cases.find((x) => x[0] === id);
  const { transcript, durationSec } = speak(c[2], c[3]);
  // The app logs through console; keep the scorecard readable.
  console.log = () => {};
  try {
    const { metrics, analysis } = await analyze(transcript, durationSec, 'high', c[5]);
    const s = Object.fromEntries(analysis.pillars.map((p) => [p.id, p.score]));
    const ev = Object.fromEntries(analysis.pillars.map((p) => [p.id, p.evidence]));
    return { m: metrics, a: analysis, s, ev };
  } catch (e) {
    // The app refused to score: record that, so checks can tell a refusal
    // from a score.
    if (InsufficientSpeechError && e instanceof InsufficientSpeechError) {
      return { refused: e.message, m: { wordCount: transcript.words.length }, a: { ci: null, focusAreas: [] }, s: {}, ev: {} };
    }
    throw e;
  } finally {
    console.log = quiet;
  }
}

(async () => {
  const R = {};
  for (const [id] of cases) R[id] = await run(id);
  const src = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');

  console.log = () => {};
  // (a) A service is configured but unreachable: must refuse, not fake.
  config.apiBase = 'http://127.0.0.1:9';
  let failed = null;
  try { const t = await transcribe('file:///student-recording.m4a', 45); failed = { scoredText: t.text }; }
  catch (e) { failed = { threw: e && e.name }; }
  config.apiBase = '';
  // (b) Nothing configured (local demo): sample text is allowed, but labelled.
  const demo = await transcribe('file:///student-recording.m4a', 45);
  console.log = quiet;

  // Scoring request and validator, from the shared module app and server use.
  const msg = scoring.buildScoringMessage({ transcript: 'x', taskPrompt: cases.PROMPT, level: 'high', metrics: {} });
  const taskInMessage = msg.includes(cases.PROMPT);
  const backendBody = (src('src/analysis/llmScoring.ts').match(/body: JSON\.stringify\(\{ transcript[^)]*\}\)/) || [''])[0];
  const T = cases.TEXT.GRAMMAR;
  const ok = (id, evidence) => ({ id, score: 50, evidence, tip: 't', why: 'w' });
  const v = scoring.validateScoring({
    onTopic: true,
    pillars: [ok('language', 'she gived me one novel'), ok('structure', 'I visited the museum every weekend'), ok('confidence', 'It have tall windows')],
    mistakes: [
      { quote: 'It have tall windows', type: 'grammar', correction: 'It has tall windows', explanation: 'it takes has' },
      { quote: 'we was going there daily', type: 'grammar', correction: 'we were going', explanation: 'invented' },
    ],
  }, T);
  let missingThrows = false;
  try { scoring.validateScoring({ onTopic: true, pillars: [ok('language', '')], mistakes: [] }, T); }
  catch (e) { missingThrows = e.name === 'ScoringError'; }
  const guard = { fakeEvidence: v.pillars[1].evidence, realEvidence: v.pillars[0].evidence, mistakes: v.mistakes.length, missingThrows };

  const checks = [
    ['Separates levels', 'STRONG beats AVERAGE by 10+, AVERAGE beats WEAK',
      R.STRONG.a.ci - R.AVERAGE.a.ci >= 10 && R.AVERAGE.a.ci > R.WEAK.a.ci,
      `CI ${R.STRONG.a.ci} / ${R.AVERAGE.a.ci} / ${R.WEAK.a.ci}`],
    ['Fluent beats hesitant on Fluency', 'STRONG fluency >= AVERAGE fluency',
      R.STRONG.s.fluency >= R.AVERAGE.s.fluency,
      `fluency ${R.STRONG.s.fluency} vs ${R.AVERAGE.s.fluency}; STRONG avg long pause ${R.STRONG.m.avgPauseSec.toFixed(2)}s`],
    ['Correct words are not fillers', 'like/so/actually/kind of used correctly add no fillers',
      R.STRONG_LIKE.m.fillerCount === R.STRONG.m.fillerCount,
      `fillers ${R.STRONG_LIKE.m.fillerCount} vs ${R.STRONG.m.fillerCount}`],
    ['Accent fair', 'Same words, lower ASR confidence: CI within 2',
      Math.abs(R.ACCENT.a.ci - R.STRONG.a.ci) <= 2,
      `CI ${R.ACCENT.a.ci} vs ${R.STRONG.a.ci}; clarity ${R.ACCENT.s.clarity} vs ${R.STRONG.s.clarity}`],
    ['Thinking time is not slow speech', 'Silence before speaking leaves pace within 5 wpm',
      Math.abs(R.THINK_FIRST.m.wpm - R.STRONG.m.wpm) <= 5,
      `wpm ${R.THINK_FIRST.m.wpm} vs ${R.STRONG.m.wpm}`],
    ['Unclear speech still costs Clarity', 'MUMBLED (1 word in 8 unrecognisable) scores Clarity 70 or below',
      R.MUMBLED.s.clarity <= 70,
      `clarity ${R.MUMBLED.s.clarity} vs STRONG ${R.STRONG.s.clarity}; ${R.MUMBLED.m.unclearWordCount} unclear words`],
    ['Grammar errors are visible', 'GRAMMAR language at least 15 below STRONG (needs the AI scorer)',
      R.STRONG.s.language - R.GRAMMAR.s.language >= 15,
      `language ${R.GRAMMAR.s.language} vs ${R.STRONG.s.language}; focus areas: ${R.GRAMMAR.a.focusAreas.join(', ')}`],
    ['Off-topic is penalised', 'OFF_TOPIC CI at least 15 below STRONG (needs the AI scorer)',
      R.STRONG.a.ci - R.OFF_TOPIC.a.ci >= 15,
      `CI ${R.OFF_TOPIC.a.ci} vs ${R.STRONG.a.ci}`],
    ['Too-short answers are flagged', 'A 7-second answer is not scored, but a weak full answer still is',
      !!R.SHORT.refused && !R.WEAK.refused,
      R.SHORT.refused ? `SHORT refused (${R.SHORT.m.wordCount} words); WEAK ${R.WEAK.refused ? 'ALSO refused' : 'scored, CI ' + R.WEAK.a.ci}` : `SHORT got CI ${R.SHORT.a.ci} from ${R.SHORT.m.wordCount} words`],
    ['Real hesitations reach the scorer', 'Deepgram request keeps um/uh (filler_words=true)',
      /filler_words=true/.test(src('backend/supabase/functions/transcribe/index.ts')),
      'checked the server Deepgram request'],
    ['Evidence is pillar-specific', 'Language, Structure, Confidence do not all quote the same line',
      new Set([R.GRAMMAR.ev.language, R.GRAMMAR.ev.structure, R.GRAMMAR.ev.confidence]).size > 1,
      ['language', 'structure', 'confidence'].map((k) => `${k}: "${String(R.GRAMMAR.ev[k]).slice(0, 28)}..."`).join('; ')],
    ['No report from a fake transcript', 'Configured STT failing refuses; demo-mode sample text is labelled demo',
      failed.threw === 'TranscriptionError' && demo.source === 'demo',
      `failing STT -> ${failed.threw ? 'refused (' + failed.threw + ')' : 'scored canned text "' + failed.scoredText.slice(0, 30) + '..."'}; demo transcript source: ${demo.source ?? 'unlabelled'}`],
    ['Scoring knows the question', 'The task prompt reaches the scorer, in the app and on the server',
      taskInMessage && /taskPrompt/.test(backendBody) && /body\.taskPrompt/.test(src('backend/supabase/functions/score/index.ts')),
      `prompt in scorer message: ${taskInMessage ? 'yes' : 'no'}; backend request body: ${backendBody || 'not found'}`],
    ['Only real quotes are shown', 'An invented quote or mistake is removed, and a missing pillar is an error, not a silent 60',
      guard.fakeEvidence === '' && guard.realEvidence !== '' && guard.mistakes === 1 && guard.missingThrows,
      `invented evidence -> "${guard.fakeEvidence}"; real evidence kept: ${guard.realEvidence !== ''}; mistakes kept ${guard.mistakes} of 2; missing pillar ${guard.missingThrows ? 'rejected' : 'accepted'}`],
  ];

  let pass = 0;
  checks.forEach(([name, rule, ok, detail], i) => {
    if (ok) pass++;
    console.log(`${String(i + 1).padStart(2)}. ${ok ? 'PASS' : 'FAIL'}  ${name}\n      ${rule}\n      measured: ${detail}`);
  });
  console.log(`\n${pass}/${checks.length} checks pass`);
  process.exitCode = pass === checks.length ? 0 : 1;
})().catch((e) => { console.log = quiet; console.error('EVAL ERROR', e); process.exit(2); });
