# EduBand — Phase 1 MVP (Student Android App)

EduBand analyses how students *actually speak* and reports it back as trackable,
coachable skills. This repo is the Phase-1 mobile app: a student records a short
spoken task, the app transcribes and analyses it, and shows a friendly,
growth-oriented report across five communication pillars.

Built with **React Native + Expo + TypeScript**, per Section 7 of the project brief.

## What's implemented

- **Onboarding** — join by school code, pick level (middle / high / college).
- **Consent gate** — verifiable parent/guardian consent is required before any
  recording can happen (Section 8). Recording is blocked without it.
- **Record** — tap to record a guided task or free speak (microphone via expo-av).
- **Analysis pipeline** (`src/analysis/`) — the core IP:
  - Deterministic metrics in real code: WPM, filler rate, pauses, lexical
    diversity, sentence-length variety.
  - Age/level-normed scoring bands.
  - Five-pillar **Communication Index**: Fluency, Clarity, Language, Structure,
    Confidence.
  - A single **swappable** STT function and a single **swappable** LLM-scoring
    function (see "Going live" below).
- **Report** — Communication Index ring, five-pillar radar, strengths, focus
  areas (each with an evidence snippet + one concrete next step), trend vs. last
  session, and a recommended next task.
- **Progress** — CI trend chart, streak, history.
- **Privacy** — export data (JSON), delete all data, toggle raw-audio retention
  (off by default = audio deleted after analysis), consent status.

## Run it (Android, no Android Studio needed)

You need **Node.js 18+** installed. Then on your computer:

```bash
npm install
npm start
```

Install **Expo Go** from the Play Store on your Android phone, then scan the QR
code shown in the terminal. The app opens on your phone over the same Wi-Fi.

> The app runs fully offline using a mock transcription + mock scoring layer, so
> you can click through the entire experience with **zero API keys**.

## Going live (swap the mocks for real services)

Everything is behind two functions so you never touch the UI:

1. **Speech-to-text** — `src/analysis/stt.ts`. Set `ACTIVE_PROVIDER` and fill in
   the Deepgram or AssemblyAI stub (examples are in the file).
2. **LLM scoring** — `src/analysis/llmScoring.ts`. Enable `callClaude` (the
   Anthropic prompt and request shape are already written) and return the same
   JSON shape.

Then move persistence from on-device `AsyncStorage` (`src/storage/store.ts`) to
Supabase (Postgres + auth + storage + edge functions), and add the Next.js
teacher/admin dashboard. See the project brief Sections 5–8.

## Project structure

```
App.tsx                      navigation + app bootstrap
src/
  analysis/
    framework.ts             the five pillars + Communication Index (core IP)
    metrics.ts               deterministic metrics (code-computed)
    norms.ts                 age/level normalisation bands
    llmScoring.ts            SWAP POINT: judgment pillars (mock -> Claude)
    stt.ts                   SWAP POINT: speech-to-text (mock -> Deepgram/AssemblyAI)
    pipeline.ts              orchestrates metrics -> norms -> LLM -> CI
  components/                Button, Card, ScoreRing, PillarRadar, TrendChart
  data/tasks.ts              guided speaking tasks, level-graded
  screens/                   Onboarding, Consent, Home, Practice, Record,
                             Processing, Report, Progress, Privacy
  services/recorder.ts       expo-av microphone recording
  storage/store.ts           local persistence + privacy controls
  theme/                     calm, professional design tokens
```

## Privacy & child safety (Section 8 — hard requirements)

- Consent required before recording; blocked otherwise.
- Raw audio deleted after analysis by default; only transcript + scores kept.
- One-tap export and delete-all.
- No ads, no third-party tracking, no data selling.
- Scoring is accent-fair by design: it judges intelligibility and growth, never
  accent conformity.

> Informational, not legal advice. Engage a lawyer familiar with India's DPDP
> Act and education data before recording real students.
