# English Assessment Review

How well does EduBand score a student's spoken English, and how do we make it
better? This review read the whole scoring pipeline, then measured it.

First measured on commit `de35dd2`. Re-run any time with:

```
npm run eval:assessment
```

**Result at review: 0 of 12 checks pass. After iterations A to C: 12 of 14.**

| Stage | Checks passing |
|---|---|
| Review (`de35dd2`) | 0 of 12 |
| Iteration A, integrity (`f75f1ce`) | 2 of 12 |
| Iteration B, measurement (`3fc6040`) | 9 of 13 (added: unclear speech still costs Clarity) |
| Iteration C, AI scorer | 12 of 14 (added: only real quotes are shown) |

The two still failing, 7 (grammar errors are visible) and 8 (off-topic is
penalised), fail on the no-AI path by design: simple rules cannot see grammar
or relevance. The report now says so ("Quick estimate"). They need the AI
scorer, which needs either the Supabase project restored or an Anthropic key
for a live run, and then real recordings (iteration D) to confirm.

### What iteration C changed

- One prompt, rubric, JSON schema and validator, shared by the app and the
  server: `backend/supabase/functions/_shared/scoring.ts`.
- The task prompt is sent, and the rubric scores whether the answer addresses
  it (inside Structure, with `onTopic` returned and shown on the report).
- Anchored bands per pillar, against the CEFR range expected for the student's
  level (middle A2 to B1, high B1 to B2, college B2 to C1).
- Claude Opus 5.5 with structured JSON output (`output_config.format`), API
  version `2026-10-21`, server-side refusal fallback on. Gemini at
  temperature 0 with a JSON response schema.
- Up to five specific mistakes (quote, type, correction, reason), shown as
  "Fix these" on the report.
- Every evidence and mistake quote is checked against the transcript; an
  invented one is removed. A missing pillar is retried once, then the report
  falls back to labelled rules instead of a silent 60.
- Rules path: each pillar quotes a different sentence chosen for that pillar.

---

## 1. How a recording is scored today

```
audio
  -> speech-to-text (src/analysis/stt.ts)
       server: Deepgram nova-2        fallback: a canned sample transcript
  -> measured metrics (metrics.ts): pace, fillers, pauses, vocabulary range
  -> Fluency  = 40% pace + 35% fillers + 25% pauses, against age norms (norms.ts)
  -> Clarity  = speech recogniser's average confidence
  -> Language, Structure, Confidence = AI scorer (llmScoring.ts)
       server: Gemini 1.5 Flash       fallback: rules on vocabulary and fillers
  -> Communication Index = plain average of the five
```

Two facts shape everything below:

- **The Supabase backend is paused**, so both fallbacks are what students
  get right now: a canned transcript and rules-based scores.
- **`src/analysis/scoring.ts` is dead code.** Nothing imports it. It holds a
  second, different set of scoring rules that never reach a student.

## 2. How it was tested

`tools/assessment-eval/` runs the app's real analysis code under Node. Only
two modules that need React Native are stubbed. The tests are designed
recordings answering one prompt, "Talk about a place you love", with
word-by-word timings generated deterministically, so every score difference
has a known cause. Several are the same strong answer with one thing changed:

| Case | What changes |
|---|---|
| STRONG | Fluent, organised, rich vocabulary, no hesitation |
| STRONG_LIKE | STRONG, plus correct uses of "like", "actually", "kind of" |
| ACCENT | STRONG word for word, recogniser less confident (as with a non-native accent) |
| THINK_FIRST | STRONG, after 4 seconds of thinking silence |
| GRAMMAR | STRONG's content with typical learner grammar errors |
| AVERAGE | Simpler answer, some "um"/"uh", some pauses |
| WEAK | Repetitive, many fillers, long pauses |
| OFF_TOPIC | Fluent, but about cricket rules, not a place |
| SHORT | 14 words, about 7 seconds |

## 3. Results

| Case | CI | Fluency | Clarity | Language | Structure | Confidence |
|---|---:|---:|---:|---:|---:|---:|
| STRONG | 81 | 83 | 95 | 80 | 72 | 74 |
| STRONG_LIKE | 79 | 81 | 95 | 80 | 72 | 67 |
| ACCENT | 77 | 83 | 78 | 80 | 72 | 74 |
| THINK_FIRST | 81 | 83 | 95 | 80 | 72 | 74 |
| GRAMMAR | 80 | 83 | 93 | 80 | 72 | 74 |
| AVERAGE | 75 | **88** | 92 | 72 | 72 | 53 |
| WEAK | 50 | 40 | 85 | 38 | 55 | 30 |
| OFF_TOPIC | 77 | 83 | 95 | 78 | 55 | 76 |
| SHORT | 75 | 80 | 95 | 80 | 55 | 66 |

## 4. Findings, most serious first

### Critical: integrity

**F1. Students are scored on a transcript they never spoke.** When
speech-to-text fails, `transcribe()` silently substitutes a canned sample.
It is chosen by recording length, so every recording under a minute gets the
same text: "Um, my favourite place is my grandmother's house in the
village...". Five different 30 to 55 second recordings all scored 68 to 72 on
that text. The report quotes it under "From your speech". The only trace is a
small "Model mock-1.0.0" footer. With the backend paused, this is every
recording today.

**F2. Rules-based scores are presented as AI judgement.** When the AI scorer
is unreachable, Language, Structure and Confidence come from simple rules,
with no notice to the student.

### High: the scores measure the wrong thing

**F3. Hesitating beats speaking fluently on Fluency (88 vs 83).** Average
pause only counts pauses of 0.6s or longer. A fluent speaker has none, so the
average is 0, and the pause score maps 0 to the floor (30) instead of treating
"no long pauses" as ideal.

**F4. Grammar errors are invisible.** GRAMMAR (about a dozen errors: "it
have", "she gived me", "I am finishing it in two evening") scores Language
80, the same as STRONG. Its focus areas are Structure and Confidence, so the
student is never told about grammar. This is the opposite of the goal that
students know exactly what their mistakes are.

**F5. Correct English is counted as filler.** "like", "so", "actually",
"basically", "literally" and "kind of" are fillers every time they appear.
"I like it", "poets like Tagore" and "the kind of books" all count. STRONG_LIKE:
5 fillers flagged, all of them correct English.

**F6. Production would hide real hesitations.** Deepgram removes "um" and
"uh" unless `filler_words=true` is set ([Deepgram docs](https://developers.deepgram.com/docs/filler-words)).
The server never sets it. Simulated: WEAK's filler count falls from 10 to 3
and its Confidence rises from 30 to 50. Combined with F5, the filler measure
records correct words and ignores real hesitation.

**F7. Accent costs points.** Clarity is the recogniser's confidence, which is
known to be lower for non-native accents. ACCENT, word for word identical to
STRONG, loses 17 Clarity points and 4 CI points. The report labels this score
"(accent-fair)".

**F8. Off-topic answers are not penalised.** OFF_TOPIC scores 77. The task
prompt is never sent to the scorer, so relevance cannot be judged.

### Medium

**F9. Too-short answers get normal scores.** 14 words, 7 seconds: CI 75,
level with AVERAGE. Vocabulary range is inflated on short text.

**F10. Same quote for three skills.** Language, Structure and Confidence all
quote one middle sentence. It is not chosen to show the problem.

**F11. Generic or wrong tips.** GRAMMAR is told "Keep stretching
vocabulary". WEAK, hesitant and repetitive, is told "Clear and easy to
follow".

**F12. Thinking time lowers measured pace.** Silence before the first word
counts as speaking time: 134 to 119 words per minute.

**F13. Levels barely separate.** STRONG 81, AVERAGE 75: six points between a
fluent, organised answer and a simple, hesitant one. Clarity sits at 78 to 95
for everyone, which compresses the Index.

### The AI scorer itself (read, not run)

Not testable here: the backend is paused and there is no API key. From the
code:

- **No rubric.** Nothing defines what 60 or 80 means per pillar or per level,
  so scores are uncalibrated.
- **Two prompts that disagree.** The app's prompt defines each pillar; the
  server's, which production uses, does not.
- **Randomness on purpose.** Gemini is called at temperature 0.7, so the same
  recording can score differently.
- **Unverified evidence.** Quotes are not checked against the transcript, so
  an invented quote would be shown as "From your speech".
- **Silent gaps.** A missing pillar quietly becomes 60.
- **Dated models.** `gemini-1.5-flash` and `claude-3-5-sonnet-latest`.

## 5. Improvement plan, in iterations

Each iteration names the checks it should flip. After each one, run
`npm run eval:assessment`: the target checks should pass and none that
already passed should fail.

### Iteration A: integrity (before any student relies on a score)

1. **Never score a fake transcript.** On speech-to-text failure, show "We
   couldn't analyse this one", keep the audio for retry, save nothing. (Check 11)
2. **Refuse to score too little speech.** Below about 40 words or 20 seconds
   of speech, show "Too short to assess" with no score. (Check 8)
3. **Record what produced each score.** Store transcript and scorer source
   with each session; tell the student when scores are rules-based.
4. **Restore the Supabase project.** This removes the fallback as the normal path.

### Iteration B: measure the right things (deterministic, cheap)

5. **Pauses:** score long pauses per minute, so none is ideal. (Check 2)
6. **Fillers:** count only true hesitations (um, uh, er, erm). Treat "like" or
   "you know" as filler only in filler position, or let the AI classify them. (Check 3)
7. **Deepgram:** add `filler_words=true`. (Check 9)
8. **Pace:** measure from first word to last word. (Check 5)
9. **Clarity:** stop scoring raw recogniser confidence. Count only clearly
   unintelligible words, and remove the "(accent-fair)" label until it is
   true. (Check 4)
10. **Delete `scoring.ts`** so there is one set of rules.

### Iteration C: real assessment (AI scorer)

11. **Send the task prompt** and judge task achievement and relevance. (Checks 7, 12)
12. **A rubric with anchored levels** per pillar and age level, aligned to
    CEFR descriptors (A2 to C1). Temperature 0, a current Claude model, strict
    JSON validation, retry on missing pillars.
13. **A mistakes list:** up to five specific errors, each with the exact
    quote, the type (grammar, word choice, missing linking words), the
    correction and a one-line reason. This is what lets a student "know
    exactly their mistakes". (Checks 6, 10)
14. **Verify every quote** is a real substring of the transcript before showing it.
15. **One prompt,** shared by the app and the server.

### Iteration D: prove it on real students

16. Collect about 50 consented, anonymised recordings across levels and accents.
17. Have two teachers rate each one independently. Measure agreement between
    teachers, then between EduBand and teachers.
18. Calibrate `norms.ts` from that data, and check that scores do not differ
    by accent for the same teacher rating.
19. Add the hardest real recordings to the scorecard.

Checks 1 and 13 (separating levels) should improve as a consequence of B and
C. Iteration D is the only way to know whether the scores are actually right.

## 6. Limits of this review

- It measures the no-AI path, which is what students get today. The AI path
  could not be run.
- The test recordings are synthetic. They isolate causes well but do not
  prove accuracy on real speech.
- The check thresholds (for example "10 or more points") are judgement calls,
  written down in `tools/assessment-eval/eval.cjs` so they can be argued with.
