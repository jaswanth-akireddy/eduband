# EduBand Backend — Design Document

How the backend works end-to-end: architecture, data flow, security model, and
the verification we've run. Pairs with `README.md` (overview) and `DEPLOY.md`
(setup steps).

**Status:** Built and **locally verified** (see §7). Not yet provisioned on a
live Supabase project (requires account + keys).

---

## 1. Goals & constraints

- Handle **minors' voice data** → security and consent are first-class, not
  bolted on.
- **API keys never touch the client** (STT + Claude live server-side).
- **Least privilege** everywhere: each role sees only what it must.
- Mainstream, AI-tool-friendly stack: **Supabase** (Postgres + Auth + Storage +
  Edge Functions). One platform, well documented.

---

## 2. Component overview

```
┌──────────────────────────┐
│  EduBand app (Expo RN)    │
│  • records audio          │
│  • computes metrics       │
│  • holds a Supabase JWT   │
└────────────┬─────────────┘
             │ HTTPS + Bearer JWT
             ▼
┌──────────────────────────────────────────────┐
│  Supabase Edge Functions (Deno)               │
│  • /transcribe  → Deepgram / AssemblyAI        │
│  • /score       → Anthropic Claude             │
│  (verify JWT, rate-limit, validate, proxy)     │
└───────┬───────────────────────────┬───────────┘
        │ secrets (keys)             │ caller JWT
        ▼                            ▼
┌────────────────┐        ┌──────────────────────────┐
│ External APIs   │        │  Postgres (RLS) + Storage  │
│ Deepgram/Claude │        │  • profiles, sessions, ... │
└────────────────┘        │  • RLS per role            │
                          │  • consent trigger          │
                          │  • audit log                │
                          │  • private audio bucket     │
                          └──────────────────────────┘
```

---

## 3. Data model (13 tables)

| Table | Purpose |
|-------|---------|
| `institutions` | schools/colleges (region, data residency) |
| `classes` | classes within an institution |
| `profiles` | one row per auth user; carries `role` and `institution_id` |
| `enrollments` | student ↔ class |
| `parent_links` | parent ↔ child (consent-gated) |
| `consents` | per-student consent records (granted/revoked) |
| `sessions` | a recording (kind: speaking/teaching/labday/professional) |
| `transcripts` | text + word timings + diarization for a session |
| `analyses` | CI score, pillar scores, tips, evidence, versions |
| `teaching_materials` | attached lesson plans + parsed planned topics |
| `teaching_coverage` | covered / missed / rushed / next-session plan |
| `devices` | Language Lab wearables (shared by students & teachers) |
| `audit_log` | append-only record of writes to student data |

Enums: `user_role`, `level_band`, `session_kind`, `session_status`,
`consent_status`. All ids `uuid`; all times `timestamptz` (UTC).

---

## 4. Security model

### 4.1 Authentication
Supabase Auth issues a JWT per signed-in user. The app sends it as
`Authorization: Bearer <jwt>` on every Edge Function call. `profiles.id` is a
1:1 foreign key to `auth.users.id`.

### 4.2 Row-Level Security (deny-by-default)
RLS is **enabled on all 13 tables**. With RLS on and no matching policy, access
is denied. We then grant the minimum:

- **Students** → only their own rows (`user_id = auth.uid()`).
- **Teachers / admins** → rows of users **in their institution** only.
- **Parents** → only **linked + consented** children (`parent_links.status =
  'granted'`).
- **Admins** → audit log for their institution.

Child tables (`transcripts`, `analyses`, `teaching_*`) inherit access from their
parent session via the `can_read_session()` / `owns_session()` security-definer
helpers, so the rules are defined once and reused.

### 4.3 Consent enforced in the database
A `before insert` trigger on `sessions` (`enforce_consent`) raises
`CONSENT_REQUIRED` if a **student** tries to create a `speaking`/`labday` session
without an active `granted` consent row. This means consent can't be bypassed by
a buggy or malicious client — it's enforced at the data layer. (Teachers and
professionals are not gated by parental consent.)

### 4.4 Keys server-side only
Deepgram/AssemblyAI and Anthropic keys are stored as **Edge Function secrets**.
The client never holds them. Functions verify the caller's JWT, rate-limit per
user, validate inputs (size/length), then call the provider and return only the
structured result.

### 4.5 Storage
Audio lives in a **private** bucket (`session-audio`), namespaced per user
(`<uid>/...`). Access is via short-lived signed URLs only. `purge_old_audio()`
nulls audio paths after analysis to honour the default "delete raw audio"
policy (schedulable via pg_cron / cron function).

### 4.6 Audit
Triggers on `sessions`, `transcripts`, `analyses`, `consents` append to
`audit_log` (actor, action, table, row id, time). Readable only by admins.

---

## 5. End-to-end data flow (a student recording)

1. **Consent** exists (`consents.status = 'granted'`), enforced by trigger.
2. App records audio; computes deterministic metrics on-device (WPM, fillers,
   pauses, lexical diversity) — cheap, reproducible, no PII leaves yet.
3. App uploads audio to the private bucket (or streams to the function).
4. App → `POST /transcribe` (Bearer JWT). Function verifies auth, rate-limits,
   validates size, calls Deepgram/AssemblyAI, returns `{text, words[]}`.
5. App → `POST /score` with transcript + metrics. Function calls Claude with a
   strict-JSON system prompt (accent-fair), parses + clamps the result, returns
   pillar scores + evidence + tips.
6. App writes `sessions`, `transcripts`, `analyses` (RLS ensures it can only
   write its own rows). Raw audio path is cleared per retention policy.
7. Reads (student/teacher/parent) are all filtered by RLS automatically.

For **teaching** sessions, steps add: parse attached materials → planned topics
→ compare transcript vs. topics → write `teaching_coverage` (covered / missed /
rushed / next-session plan) alongside delivery scoring.

---

## 6. Edge Functions

| Function | Method | Auth | Does |
|----------|--------|------|------|
| `transcribe` | POST (multipart) | JWT required | STT proxy; size + rate limits |
| `score` | POST (json) | JWT required | Claude proxy; strict JSON, length caps |

Shared `_shared/util.ts`: JWT verification (`getAuthedUser`), locked CORS
(`ALLOWED_ORIGINS`), per-user rate limiting, and a least-privilege service
client used only after authorisation.

---

## 7. Verification performed (local)

Run against a real local Postgres 15 + real Deno toolchain:

- **Migrations apply cleanly** (`ON_ERROR_STOP=1`): 0001–0004 → **13 tables,
  13 RLS-enabled, 28 policies, 15 triggers**.
- **Edge Functions** `deno check` (type-check against the real `@supabase/
  supabase-js`) and `deno lint`: **0 problems**.
- **Behavioural security tests** (`test/rls_test.sql`):
  - TEST 1 — student session **blocked** without consent ✅
  - TEST 2 — session **succeeds** after consent granted ✅
  - TEST 3 — Student B **cannot** read Student A's session (RLS) ✅
  - TEST 4 — Student A **can** read their own session ✅

> The `test/` SQL and Supabase-schema stubs let you re-run this verification
> locally without a cloud project:
> `psql -f test/_stubs.sql -f migrations/000*.sql -f test/rls_test.sql`

### Not yet verified (needs your accounts)
- Live deployment to a Supabase project.
- Real Deepgram/Claude calls through the deployed functions (keys + billing).
- Auth round-trip from the app (login → JWT → function authorised).

---

## 8. What the app still needs (client side)

The backend is ready; the client must be migrated from local AsyncStorage to:
1. **Supabase Auth** login per role (sign up/in, store session).
2. **Profiles** row creation on first login (role, institution, level).
3. Reading/writing **sessions/transcripts/analyses** via Supabase instead of
   local storage.
4. Setting the **Backend proxy URL** (already supported in the API Keys screen)
   so STT/scoring route through the functions.

---

## 9. Threat-model notes

- **Stolen JWT** → scoped to one user by RLS; short expiry + refresh rotation.
- **Malicious client** → cannot bypass consent (DB trigger) or read others'
  data (RLS); cannot reach provider keys (server-side only).
- **Bystander capture (wearable, Phase 2)** → non-wearer speech discarded
  on-device; never stored/transmitted. Legal review precedes any pilot.
- **Data deletion / export** → per-user and per-institution; retention defaults
  to deleting raw audio after analysis.
