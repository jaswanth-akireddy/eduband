# EduBand — Technical Overview

A write-up of how the whole system is put together: the mobile client, the
analysis pipeline, the Supabase backend, and the build/release path.

Last updated against commit `775ca59`.

---

## 1. What it is

EduBand is a speech-coaching app for students. A learner records themselves
speaking — either against a guided prompt or freely — and the app returns a
**Communication Index** (0–100) broken into five scored pillars, each with a
verbatim quote from their own speech as evidence, one concrete tip, and a
one-line explanation of the metric behind the score.

Four personas share one binary: **student**, **teacher**, **parent**,
**professional**. Role is chosen at first launch and drives which navigator the
app mounts.

---

## 2. Stack at a glance

| Layer | Choice |
|---|---|
| Runtime | React Native `0.74.5` on Expo SDK `51` |
| Language | TypeScript `5.3`, `strict: true` |
| Navigation | `@react-navigation` native-stack v6 + bottom-tabs v6 |
| State | React hooks + module-level caches — no Redux/Zustand |
| Local persistence | `@react-native-async-storage/async-storage` |
| Backend | Supabase — Postgres, Auth, Realtime, Storage, Edge Functions |
| Server runtime | Deno (Supabase Edge Functions) |
| Audio capture | `expo-av` (+ Android `PermissionsAndroid` fallback) |
| Graphics | `react-native-svg` — every chart, ring, gauge and icon |
| Animation | React Native `Animated` (no Reanimated) |
| Fonts | `@expo-google-fonts/poppins` + `expo-font` |
| Build | EAS Build; OTA via EAS Update (`expo-updates`) |
| Distribution | Google Play internal testing track |

No UI kit, no icon library, no charting library. Everything visual is
hand-built, which is why the bundle stays small and the look stays consistent.

---

## 3. Repo layout

```
App.tsx                  root: providers, fonts, navigators, boot routing
app.json                 Expo manifest — permissions, OTA URL, EAS project id
eas.json                 build profiles, channels, env, Play submit config
babel.config.js          module-resolver alias  @ -> ./src
tsconfig.json            strict; paths @/* -> src/*

src/
  analysis/    framework · metrics · norms · scoring · llmScoring · stt · pipeline
  components/  18 presentational components (rings, charts, icons, motion)
  data/        tasks.ts (practice prompts) · teaching.ts
  hooks/       useReducedMotion
  navigation/  types.ts — the typed route map
  screens/     22 screens incl. screens/teacher/*
  services/    auth · supabase · sessionsSync · recorder · stt · haptics · logger
  storage/     store.ts — the single persistence facade
  theme/       index.ts (tokens) · ThemeProvider.tsx · fonts.tsx
  types/       domain model

backend/supabase/
  migrations/  0001_init · 0002_rls · 0003_audit · 0004_storage
               0005_session_payload · 0006_profile_school_code
  functions/   transcribe/ · score/ · _shared/util.ts
  test/        rls_test.sql · _stubs.sql
```

**Size:** ~8,900 lines across `src/` + `App.tsx`; ~885 lines of backend
TypeScript and SQL.

| Area | Files | Lines |
|---|---:|---:|
| screens | 22 | 4,108 |
| components | 18 | 1,617 |
| analysis | 7 | 1,078 |
| services | 7 | 767 |
| theme | 3 | 369 |
| storage | 1 | 240 |
| types / data / nav / hooks | 5 | 382 |
| App.tsx | 1 | 244 |

---

## 4. Client architecture

### 4.1 Navigation

One root native-stack (`RootStackParamList`) holding three tab navigators —
student (Home · Practice · Progress · Lab · Privacy), teacher (Home · Sessions
· Profile), plus standalone parent and professional screens. Every route and
its params are typed in `src/navigation/types.ts`, so a bad
`navigation.navigate(...)` is a compile error rather than a runtime blank
screen.

Boot routing lives in `AppContent`: read role → hydrate profile → check consent
→ pick the initial route. A `LaunchScreen` covers the gap so there is no flash
of the wrong screen.

### 4.2 Persistence — offline-first, server-backed

`src/storage/store.ts` is the only module the UI talks to for data. It wraps
`src/services/sessionsSync.ts`, which holds the raw Supabase queries.

The rule throughout: **local wins, server fills gaps.**

```ts
export async function hydrateProfile(): Promise<StudentProfile | null> {
  const local = await getProfile();
  if (local?.name) return local;       // offline-first: local profile always wins
  const uid = await currentUserId();
  if (!uid) return null;
  const remote = await withTimeout('load profile', remoteFetchProfile(uid), 6000);
  ...
}
```

Sessions follow the same shape: read from Supabase when signed in, fall back to
the AsyncStorage cache when offline, and write through to both. `subscribeSessions`
opens a Realtime channel so a second device sees new sessions live — delivered
subject to RLS, so a user only ever receives their own rows.

Two caches exist specifically to keep the record button responsive:

- **Consent cache** (`getConsentCache()`) — an in-memory boolean read at boot.
- **Mic permission cache** (`micGrantedCache` in `recorder.ts`).

Both exist because `AsyncStorage` can be contended by Supabase's background
token refresh, and a blocked read there used to stall the record gate.

### 4.3 Bounded I/O

Anything that can hang is wrapped. `withTimeout` in `services/logger.ts` races a
promise against a deadline and logs the timeout. The Supabase client gets a
storage adapter with a 4s per-operation guard that degrades to `null` rather
than freezing:

```ts
const boundedStorage = {
  getItem: (key) => guard(AsyncStorage.getItem(key), null),
  setItem: (key, v) => guard(AsyncStorage.setItem(key, v), undefined),
  removeItem: (key) => guard(AsyncStorage.removeItem(key), undefined),
};
```

Auto-refresh is also driven off `AppState` — started on foreground, stopped on
background — instead of running a timer forever.

### 4.4 Theming

`src/theme/index.ts` defines `lightColors`, derives `darkColors` from it, and
exports the type `Palette = typeof lightColors` so the two can never drift.
`ThemeProvider` holds `'light' | 'dark' | 'system'`, persists the choice, and
exposes a styles factory:

```ts
export function makeStyles(factory: (colors: Palette) => Record<string, any>) {
  return function useStyles() {
    const palette = useColors();
    return useMemo(() => StyleSheet.create(factory(palette)), [palette]);
  };
}
```

Every screen calls `const styles = useStyles()` instead of holding a static
`StyleSheet.create`, so a theme flip re-renders the whole tree correctly.

Design direction is a grouped-canvas layout (the Apple Health / iOS Settings
pattern): soft `#F6F6F8` canvas, borderless white cards, hierarchy carried by
type weight rather than colour, and a single coral accent (`#FF385C`) reserved
for primary actions. Score bands are deliberately calm — never neon, never
shaming.

### 4.5 Typography

Poppins is loaded via `useFonts(poppinsFonts)`, which gates first render. The
catch: **Android ignores `fontWeight` on custom font families** — every weight
renders as the regular face. `src/theme/fonts.tsx` patches `Text.render` and
`TextInput.render` once at boot, mapping the requested weight onto the matching
Poppins family and clearing `fontWeight`:

```ts
const BY_WEIGHT = {
  '300': 'Poppins_300Light', '400': POPPINS_REGULAR, '500': 'Poppins_500Medium',
  '600': 'Poppins_600SemiBold', '700': 'Poppins_700Bold', bold: 'Poppins_700Bold', ...
};
```

This means the 138 existing `fontWeight: '600'` declarations across the
codebase kept working unchanged.

### 4.6 Components and motion

All hand-built on `react-native-svg`: `MetricRing` (Whoop-style concentric
rings), `ScoreGauge`, `TrendChart`, `PillarRadar`, `Avatar` (initials monogram),
`Confetti`, `RecordingWave`, and `Icon` — an in-house 24pt stroke icon set with
a typed `IconName` union, which is what let the compiler catch every leftover
emoji-as-icon during the redesign.

Motion uses the plain `Animated` API: `AnimatedNumber` count-ups, ring sweeps,
`Skeleton` shimmer, `FadeIn` on mount. All of it checks
`useReducedMotion()` (backed by `AccessibilityInfo.isReduceMotionEnabled`) and
snaps to the end state when Reduce Motion is on. Haptics are centralised in
`services/haptics.ts` (`tapLight`, `tapMedium`, `selection`, `notifySuccess`,
`notifyWarning`).

### 4.7 Recording

`services/recorder.ts` owns the whole capture lifecycle. The non-obvious part is
permissions: `expo-av`'s `Audio.requestPermissionsAsync()` can hang indefinitely
on some Android devices, which is exactly what made the record button appear
dead. The fix is a three-step ladder — check the cache, then
`getPermissionsAsync()` (non-blocking read), then Android's core
`PermissionsAndroid.request()`, with `expo-av` only as the iOS path. On a failed
`startRecording`, the cache is invalidated so the next tap re-asks.

---

## 5. The analysis pipeline

```
audio → STT + diarization → deterministic metrics → norms → LLM scoring → Communication Index → report
```

The deliberate split is **deterministic where possible, LLM only where
judgment is required.**

**Computed in code** (`analysis/metrics.ts`) — reproducible, free, instant:
words per minute, filler count and rate, pause count and average length,
lexical diversity (length-corrected), sentence-length variety, STT confidence.

**Scored from those metrics** (`analysis/pipeline.ts`):

- *Fluency* — a weighted blend of pace, fillers and pauses (`0.4 / 0.35 / 0.25`)
  banded against age norms from `analysis/norms.ts`.
- *Clarity* — derived from STT confidence as an intelligibility proxy, floored
  at 30 and capped at 100.

**Scored by the LLM** (`analysis/llmScoring.ts` → `score` edge function):
*Language*, *Structure*, *Confidence*. The system prompt requires a verbatim
evidence snippet, one concrete tip and a one-line "why" per pillar, and returns
strict JSON. It carries an explicit fairness constraint:

> CRITICAL FAIRNESS RULE: never penalise regional or non-native accents.
> Judge intelligibility and growth.

The five pillars roll into the Communication Index via configurable weights in
`analysis/framework.ts` (`FRAMEWORK_VERSION = '1.0.0'`, equal weights by
default) so a school can re-emphasise clarity for younger grades or structure
for placement prep. A sixth pillar, *interaction*, is defined but applies only
to conversational contexts.

Every stage degrades gracefully. `analysis/stt.ts` resolves in order: backend
proxy → direct provider → a built-in mock transcript, so the app always produces
a report even with no network and no keys.

---

## 6. Backend

### 6.1 Schema

13 tables. Everything is `uuid`-keyed and UTC.

`institutions` · `classes` · `profiles` · `enrollments` · `parent_links` ·
`consents` · `sessions` · `transcripts` · `analyses` · `teaching_materials` ·
`teaching_coverage` · `devices` · `audit_log`

Five Postgres enums model the domain directly: `user_role`, `level_band`,
`session_kind`, `session_status`, `consent_status`.

`0005` adds `sessions.payload jsonb` — the client's full `Session` object is
round-tripped as JSONB rather than squeezed through a lossy normalised mapping,
and the same migration adds `sessions` to the `supabase_realtime` publication.

### 6.2 Row-Level Security

RLS is **deny-by-default** — enabled on every table, then granted back the
minimum. 31 policies in total. The access model:

- A user reads and writes **only their own** profile, sessions, devices.
- Staff read sessions for **their institution's** students (`sessions_staff_select`).
- Parents read **linked** children only (`sessions_parent_select`, `parent_links_self`).
- Child tables (`transcripts`, `analyses`, `teaching_*`) delegate through two
  SQL helpers, `can_read_session(session_id)` and `owns_session(session_id)`,
  so the rule lives in one place.
- `audit_log` is readable by institution admins only.

`0003_audit.sql` adds a `security definer` trigger that records actor, action,
table and row id for every write to student data.

`0004_storage.sql` creates a **private** `session-audio` bucket where object
paths are namespaced by uid — `(storage.foldername(name))[1] = auth.uid()::text`
— so a user physically cannot address another user's audio. Access is via
server-minted signed URLs; nothing is public.

There are RLS tests in `backend/supabase/test/rls_test.sql`.

### 6.3 Edge Functions (Deno)

Two functions, both auth-required and both keeping provider keys server-side:

- **`transcribe`** — multipart upload, Bearer JWT required, rate-limited to
  20 req/min per user, 1 byte–25 MB size gate, provider selected by the
  `STT_PROVIDER` secret (Deepgram nova-2 with `smart_format`, `punctuate`,
  `diarize`; or AssemblyAI).
- **`score`** — JSON in, JSON out, provider selected by `LLM_PROVIDER`
  (Anthropic or Gemini), responses filtered to the three allowed pillar ids.

Both wrap the entire handler in an outer try/catch that returns a JSON **502
with the real error message**. That exists because Supabase's platform-level
5xx codes (a 540, in practice) are undiagnosable from the client — the app was
falling back to mock transcripts with no way to see why.

---

## 7. Configuration and credentials

`src/config.ts` resolves credentials in priority order:

1. **In-app API Keys screen** — stored on-device. Testing only.
2. **Env vars** — `EXPO_PUBLIC_*`, for local dev and baked into EAS profiles.
3. **Nothing** → the built-in mock pipeline runs.

The file is explicit that tiers 1 and 2 put keys on the device where they can be
extracted, and that production must route through the backend proxy
(`EXPO_PUBLIC_API_BASE` → Edge Functions) so provider keys never touch the
client. `describeMode()` surfaces the active engine in the UI so it is never
ambiguous which path is live.

`eas.json` commits `EXPO_PUBLIC_SUPABASE_URL`, the **publishable** anon key, and
the functions base URL into both build profiles. That is safe only because the
anon key is designed to be public and RLS is the actual security boundary — the
provider API keys (Deepgram, Anthropic, Gemini) live in Supabase function
secrets and are never in the repo.

---

## 8. Build and release

**EAS Build**, two profiles:

| | `preview` | `production` |
|---|---|---|
| Artifact | APK | AAB (app bundle) |
| Distribution | internal | store |
| Channel | `preview` | `production` |
| Version | `autoIncrement: true` | `autoIncrement: true` |

`appVersionSource: "remote"` keeps the build number on EAS rather than in git.
Submit config targets the Play **internal** track with `releaseStatus: draft`.

**OTA updates** via `expo-updates`: `app.json` sets the update URL and
`runtimeVersion.policy: "appVersion"`, and `npm run update:preview` /
`update:prod` publish to the matching channel. Any change that is pure
JavaScript ships without a rebuild; anything touching native code or the SDK
needs a new binary.

One honest caveat: there is no explicit `Updates.checkForUpdateAsync()` call in
the app, so it relies on `expo-updates`' default check-on-launch — which means a
published update lands on the **next** cold start, not the current one.

Android identity is `com.eduband.app`, permissions `RECORD_AUDIO` and
`MODIFY_AUDIO_SETTINGS`, with the microphone usage string declared for both iOS
`infoPlist` and the `expo-av` plugin.

There is a `build-android.yml` GitHub Actions workflow that triggers an EAS
preview build on push to `main`; it needs an `EXPO_TOKEN` repo secret.

---

## 9. Observability

`src/services/logger.ts` is an in-memory ring of structured events exposed to
React through `useSyncExternalStore`, with `logEvent` / `logInfo` / `logWarn` /
`logError` and the `withTimeout` helper. `DebugLogPanel` renders it as a
floating pill that expands into a log view, and it hides itself in release
builds unless something has actually errored:

```ts
if (!open && !__DEV__ && errorCount === 0) return null;
```

This exists because the original record-button bug was invisible — a promise
that never settled, with no error and no UI change. On-device logs turned an
unreproducible "nothing happens" report into a precise stall point.

---

## 10. Privacy posture

- **Raw audio is deleted after analysis by default**; retention is an explicit
  opt-in toggle (`AppSettings.retainRawAudio`).
- Only transcript and scores are persisted in the default configuration.
- Consent is recorded before any capture is permitted, and the record flow is
  gated on it.
- Full **data export** (JSON) and **delete everything** (local + remote) are in
  the Privacy tab.
- The storage bucket is private and uid-namespaced; the audit log records every
  write to student data.
- Written against India's DPDP Act 2023, configurable for GDPR-K, COPPA and
  FERPA. `docs/PRIVACY_POLICY.md` holds the published text.

---

## 11. Known gaps

Stated plainly, because they matter for anyone picking this up:

1. **Verifiable parental consent is the main production blocker.** Consent is
   currently recorded device-locally. RLS only permits parent/admin writes to
   `consents`, so a student-side write can't sync — which is correct, but it
   means consent is re-asked after logout.
2. **Migrations `0005`/`0006` and both edge functions need deploying** to the
   live Supabase project, along with their secrets.
3. **The Supabase project must be un-paused** — a paused project stops resolving
   `<ref>.supabase.co`, which surfaces in the app as `Network request failed`
   and in a browser as `ERR_NAME_NOT_RESOLVED`.
4. **No automated tests on the client.** `npm run typecheck` (`tsc --noEmit`) is
   the only gate; the RLS tests are SQL-side only.
5. **The wearable "Language Lab" tab is a demo surface**, not connected
   hardware — it's labelled Phase 2 in-app.
6. **OTA updates apply one launch late** (see §8).
