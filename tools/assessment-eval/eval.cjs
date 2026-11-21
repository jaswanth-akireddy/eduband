// Assessment scorecard: does EduBand score speech fairly and usefully?
//
//   npm run eval:assessment
//
// Runs the real analysis pipeline (src/analysis) on designed recordings in
// cases.cjs and checks twelve properties a fair English assessment must have.
// Each check prints the measured values behind its verdict. Re-run after every
// change to the scoring code: a fix should flip checks to PASS without
// flipping any other check to FAIL.
//
// Scope: this exercises the code path the app takes when no LLM is reachable
// (mock judgment pillars), which is what students get while the backend is
// down. Checks 9 and 12 read the server and client source directly, because
// they are about what is sent to Deepgram and the LLM.

const fs = require('fs');
const path = require('path');
const { ROOT } = require('./register.cjs');
const { analyze } = require(path.join(ROOT, 'src/analysis/pipeline.ts'));
const { transcribe } = require(path.join(ROOT, 'src/analysis/stt.ts'));
const speak = require('./speak.cjs');
const cases = require('./cases.cjs');

const quiet = console.log;
async function run(id) {
  const c = cases.find((x) => x[0] === id);
  const { transcript, durationSec } = speak(c[2], c[3]);
  // The app logs through console; keep the scorecard readable.
  console.log = () => {};
  try {
    const { metrics, analysis } = await analyze(transcript, durationSec, 'high');
    const s = Object.fromEntries(analysis.pillars.map((p) => [p.id, p.score]));
    const ev = Object.fromEntries(analysis.pillars.map((p) => [p.id, p.evidence]));
    return { m: metrics, a: analysis, s, ev };
  } finally {
    console.log = quiet;
  }
}

(async () => {
  const R = {};
  for (const [id] of cases) R[id] = await run(id);
  const src = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');

  console.log = () => {};
  const fallback = await transcribe('file:///student-recording.m4a', 45);
  console.log = quiet;

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
    ['Grammar errors are visible', 'GRAMMAR language at least 15 below STRONG',
      R.STRONG.s.language - R.GRAMMAR.s.language >= 15,
      `language ${R.GRAMMAR.s.language} vs ${R.STRONG.s.language}; focus areas: ${R.GRAMMAR.a.focusAreas.join(', ')}`],
    ['Off-topic is penalised', 'OFF_TOPIC CI at least 15 below STRONG',
      R.STRONG.a.ci - R.OFF_TOPIC.a.ci >= 15,
      `CI ${R.OFF_TOPIC.a.ci} vs ${R.STRONG.a.ci}`],
    ['Too-short answers are flagged', 'A 7-second answer is not given a normal score',
      R.SHORT.a.ci === 0 || /insufficient|too short/i.test(JSON.stringify(R.SHORT.a)),
      `SHORT got CI ${R.SHORT.a.ci} from ${R.SHORT.m.wordCount} words`],
    ['Real hesitations reach the scorer', 'Deepgram request keeps um/uh (filler_words=true)',
      /filler_words=true/.test(src('backend/supabase/functions/transcribe/index.ts')),
      'checked the server Deepgram request'],
    ['Evidence is pillar-specific', 'Language, Structure, Confidence do not all quote the same line',
      new Set([R.GRAMMAR.ev.language, R.GRAMMAR.ev.structure, R.GRAMMAR.ev.confidence]).size > 1,
      `GRAMMAR quotes "${String(R.GRAMMAR.ev.language).slice(0, 40)}..." for all three`],
    ['No report from a fake transcript', 'If speech-to-text fails, the student is not scored on canned text',
      !/grandmother/i.test(fallback.text),
      `fallback transcript: "${fallback.text.slice(0, 48)}..."`],
    ['Scoring knows the question', 'The task prompt is sent to the LLM scorer',
      /taskPrompt|task_prompt|prompt:/.test(src('src/analysis/llmScoring.ts').split('PUBLIC')[0].match(/JSON\.stringify\(\{[^)]*\}\)/g)?.join(' ') ?? ''),
      'checked the scoring request bodies'],
  ];

  let pass = 0;
  checks.forEach(([name, rule, ok, detail], i) => {
    if (ok) pass++;
    console.log(`${String(i + 1).padStart(2)}. ${ok ? 'PASS' : 'FAIL'}  ${name}\n      ${rule}\n      measured: ${detail}`);
  });
  console.log(`\n${pass}/${checks.length} checks pass`);
  process.exitCode = pass === checks.length ? 0 : 1;
})().catch((e) => { console.log = quiet; console.error('EVAL ERROR', e); process.exit(2); });
