# EduBand — Explaining This Project in an Interview

A plain-English guide to talking about this project. No jargon unless it earns
its place. Built from the code at commit `a544858`.

---

## The 30-second version

> EduBand is a mobile app that helps students get better at speaking. You record
> yourself answering a prompt, and about ten seconds later you get a score out of
> 100 broken into five areas — fluency, clarity, language, structure and
> confidence. Crucially, every score comes with a quote from your own recording
> as evidence and one specific thing to do differently next time. It's React
> Native on the front, Supabase on the back, and the scoring is a deliberate mix
> of maths and AI rather than just throwing the transcript at a model.

If they only remember one sentence, make it the last one — that's the part with
an actual engineering decision in it.

---

## The 2-minute version

**The problem.** Students are told "you need to communicate better" and given no
way to measure it. Feedback is rare, subjective, and arrives too late to act on.
A teacher with 40 students cannot give each of them detailed speaking feedback
every week.

**The product.** Record → analyse → report. The app supports four kinds of user:
students practising, teachers reviewing a class, parents seeing their child's
progress, and working professionals. Everyone shares one app; the role you pick
at first launch decides which version of the app you get.

**The interesting part.** Most of the score is not AI. Things like speaking pace,
filler words, pause length and vocabulary range are just arithmetic on the
transcript — so I compute them in code. They're free, instant, and identical
every time you run them. I only send work to a language model for the parts that
genuinely need judgment: is this well-structured, is the language rich, does this
person sound confident. That split is the core design decision in the project.

**The scale.** Around 8,900 lines of TypeScript on the client, 885 on the
backend, 22 screens, 13 database tables, 31 security policies. Built solo.

---

## How it actually works, start to finish

Walk them through one recording:

1. **You tap record.** The app first checks you've given consent, then checks it
   has microphone permission, then starts capturing audio.
2. **You speak for a minute.** A live waveform and timer run so it feels alive.
   If you leave the screen mid-recording, it asks before throwing the take away.
3. **You tap stop.** If the clip is under five seconds it's discarded with an
   explanation — too short to say anything useful about.
4. **The audio goes to the server.** Not to a transcription company directly —
   to my own backend function, which holds the API keys. The phone never has
   them.
5. **The transcript comes back** with per-word timings and confidence scores.
6. **The app computes the measurable stuff itself**: words per minute, how many
   filler words, how long the pauses were, how varied the vocabulary is.
7. **Those numbers become two of the five scores** — fluency and clarity — by
   comparing against age-appropriate norms. A 13-year-old and a college student
   aren't held to the same pace.
8. **The transcript plus those numbers go to a language model** for the other
   three scores. It's required to return a quote from the actual speech as
   evidence for each one.
9. **The five scores combine into the Communication Index**, a single number out
   of 100.
10. **Everything saves** — to the phone and to the database — so it works offline
    and syncs when you're back.

---

## The architecture, explained without jargon

```
  PHONE                        MY SERVER                  OUTSIDE SERVICES
  ┌──────────────┐            ┌─────────────┐            ┌──────────────┐
  │ React Native │  audio →   │ transcribe  │  →         │ Deepgram     │
  │              │  ← text    │  function   │  ← text    │ (speech→text)│
  │  + a local   │            ├─────────────┤            ├──────────────┤
  │    database  │  text →    │   score     │  →         │ Claude /     │
  │              │  ← scores  │  function   │  ← scores  │ Gemini       │
  └──────────────┘            ├─────────────┤            └──────────────┘
         ↕ sync               │  Postgres   │
                              │  + security │
                              └─────────────┘
```

**Why the middle box exists.** The phone could call Deepgram and Claude directly
— it's fewer moving parts. But then the API keys have to be on the phone, and
anyone can pull them out of an installed app and run up your bill. The two server
functions exist purely so the keys never leave the server. That's a one-sentence
answer to "why did you add a backend?" and it's the right one.

---

## Five stories worth telling

Interviewers remember stories, not feature lists. These are real, and each has a
point.

### 1. The button that did nothing

**What happened.** The record button was dead on Android. No crash, no error
message, no change on screen. Tapping it simply did nothing.

**Why it was hard.** There was nothing to debug. A crash gives you a stack trace;
this gave me silence.

**What I did.** I built a small on-device log panel — a floating pill that
expands into a list of events — and instrumented every step of the record flow.
Then I wrapped every async call in a timeout helper that logs when something
fails to finish.

**The root cause.** `Audio.requestPermissionsAsync()` from the audio library
never returned on some Android devices. Not an error — it just never settled, so
the code after it never ran.

**The fix.** A three-step ladder: check an in-memory cache, then read the current
permission state with a call that can't block, and only then request it using
Android's own permission API rather than the library's. The library is now only
used on iOS.

**The point to make.** When there's no error to read, your first job is to build
the instrument that will produce one. Also: a hang and a failure are different
bugs, and timeouts turn the first into the second.

### 2. Trusting the wrong diagnosis

**What happened.** Transcription started failing with "Backend STT error 540".

**First fix.** I looked at my function — it only ever returns 400, 401, 429 or
502. A 540 isn't mine, it's the hosting platform's. So I wrapped the whole
handler in a catch that returns the real error message as a proper JSON 502.
Useful work, and it stopped errors being invisible.

**Then it changed.** The error became "Network request failed". I found a real
bug — the code was doing a `fetch()` on a local file path just to detect its
type, which Android refuses. Fixed that too.

**Then the actual cause.** The user reported being unable to log in at all, with
a browser DNS error. I checked from the command line: the main project domain
didn't resolve, but the functions domain did. That signature means the Supabase
project was paused, not that the code was broken.

**The point to make.** Two of my three "fixes" were real improvements to real
problems — and none of them was the cause. I had to say so plainly. Being able
to tell "I fixed something" from "I fixed the thing" matters, and the way you
find out is by checking the layer below your own before you commit to a theory.

### 3. The refactor I shipped without compiling

**What happened.** I added dark mode, which meant converting every screen from
static stylesheets to a theme-aware factory — a 33-file change. I pushed it. The
build failed.

**The cause.** One file closed a function call with `});` instead of `}));`. A
single missing bracket, and the whole bundle wouldn't build.

**How I found it.** Installing the dependencies and running the TypeScript
compiler. Thirty seconds of work that I'd skipped.

**The point to make.** Own it directly — it's a process failure, not bad luck.
The lesson is that the size of a change determines how much verification it
needs, and a mechanical change across 33 files is exactly the kind that needs a
compile before it needs a push. Interviewers respond much better to this told
straight than to a polished version.

### 4. The find-and-replace that ate its own output

**What happened.** I was adjusting letter spacing across the design system and
used a chain of search-and-replace rules: `-0.8` → `-0.4`, `-0.4` → `-0.2`,
`-0.2` → `0`.

**The bug.** Each rule ran on the output of the previous one. A value of `-0.8`
became `-0.4`, which the next rule turned into `-0.2`, which the next turned into
`0`. Every value collapsed to zero.

**How I caught it.** I looked at the distribution of the results rather than
spot-checking a file. Everything being the same value is not what a real
adjustment looks like.

**The fix.** A script that read each original file from git history and replaced
the nth occurrence in a single pass — no chance of re-matching. It repaired 23
files.

**The point to make.** Order-dependent transformations are a classic trap, and
the way you catch them is to check the shape of the whole result, not a sample.

### 5. The font that ignored me

**What happened.** Switching the app to Poppins, every piece of text rendered at
the same weight on Android. Bold headings looked like body text.

**The cause.** Android doesn't apply `fontWeight` to custom font families. It
wants the actual font file for that weight — `Poppins_700Bold` — not regular
Poppins plus an instruction to make it bold.

**The obvious fix.** Change all 138 `fontWeight` declarations in the codebase to
font family names.

**What I did instead.** Patched the built-in `Text` component once at startup so
it reads whatever weight the style asks for, swaps in the matching Poppins file,
and clears the weight. All 138 declarations kept working, unchanged.

**The point to make.** When the choice is "change 138 call sites" or "change the
one thing they all go through", the second is usually right — and it's a
judgment about where the abstraction boundary is, not about saving typing.

---

## Decisions they're likely to probe

**"Why compute metrics in code instead of asking the AI for everything?"**
Three reasons, in order. Reproducibility — the same recording must always give
the same pace and filler count; a model might not. Cost — words per minute is
arithmetic, and paying per token for arithmetic makes no sense at classroom
scale. Defensibility — if a student challenges their score, "you said 'um' 14
times in 90 seconds" is a fact I can point at, and "the model felt it was a 62"
isn't.

**"Why React Native rather than native Android?"**
One codebase, one developer, two platforms, and the app is mostly screens and
charts rather than heavy device work. The one place it cost me was audio
permissions, where the cross-platform wrapper hung and I had to drop down to
Android's own API. That's the honest trade: you move fast until you hit the
platform, then you pay it back.

**"How do you stop one student seeing another's data?"**
In the database, not in the app. Every table is locked by default and then
granted back the minimum — a user reads only their own rows, staff read only
their institution's students, parents read only children they're linked to.
31 policies in total. Audio files sit in a private bucket where the folder name
must match your user id, so you physically can't address someone else's file.
The point is that a bug in my app code can't leak data, because the app isn't
what's enforcing it.

**"What happens with no internet?"**
It still works. The app reads from its local copy and writes there first, then
syncs when it can. The rule throughout is local wins, server fills the gaps. And
if there's no backend configured at all, there's a built-in mock transcript so
the app always produces a report — which also made it possible to develop and
demo the entire analysis and reporting flow before any keys existed.

**"How would you handle accents?"**
Deliberately, and it's written into the prompt as a hard constraint: never
penalise regional or non-native accents, judge intelligibility instead. The
clarity score comes from the transcription engine's confidence, which is a
measure of how clearly words came through — not of how closely someone matches a
reference accent. It's an imperfect proxy and I'd want real testing across
accents before trusting it at scale, but the intent is encoded rather than left
to chance.

**"What's not finished?"**
Verifiable parental consent. Right now consent is recorded on the device, and the
database correctly refuses to let a student write their own consent record — so
it can't sync, and it gets asked again after logout. For an app aimed at minors
that's the genuine blocker to a public launch, and I'd rather name it than let
them find it.

---

## Numbers worth having ready

| | |
|---|---|
| Client code | ~8,900 lines TypeScript |
| Backend code | 885 lines TypeScript + SQL |
| Screens | 22 |
| Reusable components | 18, all hand-built |
| Database tables | 13 |
| Security policies | 31 |
| User roles supported | 4 |
| Scored pillars | 5 (+1 for conversation) |
| Third-party UI libraries | 0 |

That last row is worth saying out loud. Every chart, ring, gauge and icon is
hand-drawn with SVG. No component kit, no icon pack, no charting library.

---

## Things not to do

- **Don't call it an AI app.** It's an app with a well-chosen AI component. The
  interesting decision was choosing where *not* to use it.
- **Don't oversell the wearable.** The "Language Lab" tab is a demo of a Phase 2
  idea, and it's labelled as such in the app. Say so before they ask.
- **Don't hide the gaps.** Parental consent, no automated client tests, and OTA
  updates landing one launch late are all real. Naming them yourself reads as
  judgment; being caught by them reads as the opposite.
- **Don't lead with the tech stack.** Lead with the problem and the split between
  maths and AI. The stack is the least distinctive thing about the project.

---

## If you only prepare three things

1. **The deterministic-versus-AI split** and the three reasons for it. This is
   the strongest engineering decision in the project.
2. **The silent record button** — build the instrument, find the hang, fix the
   layer below. Best debugging story you have.
3. **The refactor you pushed without compiling.** Every interviewer asks about a
   mistake. Having a real one, told straight, with a concrete lesson, beats
   anything you could invent.
