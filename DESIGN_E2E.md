# EduBand — End-to-End Design Document

How the whole system works as one flow: the mobile app, authentication, the
analysis pipeline, the backend, and the external AI services. This is the
"how it all fits and what happens on each tap" document.

- Strategy & roadmap → `PLAN.md`
- Backend internals (schema/RLS/functions) → `backend/DESIGN.md`
- Backend setup steps → `backend/DEPLOY.md`

**Status legend:** ✅ built · 🟡 built, not yet connected to a live backend · ⬜ not built

---

## 1. System at a glance

```
                         ┌──────────────────────────────────────────┐
                         │  EduBand mobile app (Expo / React Native)  │
                         │                                            │
   Role select ✅ ──▶ Auth ✅ ──▶ per-role experience                  │
                         │   • Student: record / practice / lab        │
                         │   • Teacher: analyse teaching               │
                         │   • Parent: insights                        │
                         │   • Professional: practice modules          │
                         │                                            │
                         │   On-device: record audio, compute metrics │
                         │   Holds: Supabase JWT (after login)         │
                         └───────────────┬────────────────────────────┘
                                         │ HTTPS + Bearer JWT
                                         ▼
              ┌───────────────────────────────────────────────────────┐
              │  Supabase  🟡                                           │
              │  ┌─────────────┐  ┌──────────────┐  ┌───────────────┐  │
              │  │ Auth (JWT)   │  │ Edge Functions│  │ Postgres + RLS │  │
              │  │ email/Google │  │ /transcribe   │  │ + Storage      │  │
              │  └─────────────┘  │ /score        │  │ + audit + cron │  │
              │                   └──────┬────────┘  └───────────────┘  │
              └──────────────────────────┼───────────────────────────────┘
                                         │ keys (server-side secrets)
                                         ▼
                      ┌──────────────────────────────────────┐
                      │ Deepgram / AssemblyAI (STT) ✅ code     │
                      │ Anthropic Claude (scoring)  ✅ code     │
                      └──────────────────────────────────────┘
```

Today the app runs fully on-device with a mock pipeline (or direct API keys via
the in-app API Keys screen). The Supabase layer is **built and locally verified**
but **not yet provisioned** on a live project.

---

## 2. The personas & what each does

| Role | Entry | Core experience |
|------|-------|-----------------|
| Student | role → auth → onboarding → consent | record speaking, guided practice, progress, Language Lab (wearable) |
| Teacher | role → auth | record/attach a lesson → delivery + content-coverage report + next-session plan |
| Parent | role → auth | read-only child insights + home-support tips (consent-gated) |
| Professional | role → auth | interview / presentation / workplace practice modules |

All four share the **Communication Index** engine (five pillars, 0–100,
age/level-normed).

---

## 3. Authentication flow (end to end)  🟡

1. **Role select** → user taps Student/Teacher/Parent/Professional. ✅
2. **Auth screen** for that role: ✅
   - **Supabase configured** → email/password or **Google OAuth**.
   - **Not configured** → "Continue locally" (demo mode), no server.
3. On success, **Supabase Auth issues a JWT**; the client persists it in
   AsyncStorage and auto-refreshes it. 🟡
4. First sign-in **upserts a `profiles` row** (id = auth user id) with the chosen
   role + level. 🟡
5. Every backend call sends `Authorization: Bearer <jwt>`; **RLS** uses
   `auth.uid()` to scope every row. ✅ (verified locally)

**Student exception (planned ⬜):** younger students may have no email → join via
**school code + roster invite** instead of email/Google. Teachers/parents/
professionals use email or Google.

**Google setup (manual, one-time):** Google Cloud OAuth client → add to Supabase
Auth providers → register redirect URLs (app scheme `eduband://` already set).

---

## 4. The core flow: a student records a session

Step-by-step, with where each step runs and its status.

| # | Step | Where | Status |
|---|------|-------|--------|
| 1 | Consent must exist (granted) | DB trigger enforces it | ✅ verified |
| 2 | Tap record; capture audio | device (expo-av) | ✅ |
| 3 | Compute deterministic metrics (WPM, fillers, pauses, lexical diversity) | device | ✅ |
| 4 | Send audio → transcript | `POST /transcribe` → Deepgram | ✅ code / 🟡 live |
| 5 | Send transcript + metrics → pillar scores | `POST /score` → Claude (strict JSON) | ✅ code / 🟡 live |
| 6 | Assemble Communication Index + evidence + tips | device (`pipeline.ts`) | ✅ |
| 7 | Persist session/transcript/analysis | Supabase (RLS) — today: local storage | 🟡 |
| 8 | Delete raw audio (retention default) | server / device | ✅ policy |
| 9 | Render report (ring, radar, focus areas) | device | ✅ |

**Engine resolution** (per `src/config.ts`): backend proxy → direct keys →
mock. The Processing screen shows which is active. The mock is also an automatic
fallback if a real call fails, so the user is never blocked.

**Teacher variant:** steps add material parsing → planned-topic extraction →
transcript-vs-topics coverage → `teaching_coverage` (covered / missed / rushed /
next-session plan), alongside delivery scoring.

**Language Lab variant (⬜ hardware):** the band captures wearer-only speech all
day (speaker verification), discards bystanders on-device, and syncs a transcript
via BT/Wi-Fi → same steps 5–9. Same band used by teachers for lessons.

---

## 5. The Communication Index engine

- **Deterministic pillars** (code, reproducible): Fluency, Clarity — from WPM,
  filler rate, pause stats, STT confidence, normed by age/level band.
- **Judgment pillars** (Claude, strict JSON + evidence): Language, Structure,
  Confidence — accent-fair by instruction.
- **CI** = weighted average of the five (weights configurable per school).
- Every analysis stamped with `model_version` + `framework_version` so scores
  stay comparable as the system improves.

---

## 6. Data, privacy & security  ✅ (locally verified)

- **Deny-by-default RLS** on all 13 tables; role-scoped reads (student=self,
  teacher=institution, parent=consented child, admin=institution).
- **Consent enforced in the database** (trigger blocks unconsented student
  recordings) — can't be bypassed by the client.
- **Keys server-side only** (Edge Function secrets); app never holds provider
  keys in production.
- **Private audio bucket**, per-user namespacing, signed-URL access, auto-purge
  after analysis.
- **Audit log** of writes to student data (admin-readable).
- **Export / delete** per user and per institution.
- Verified locally: migrations apply (13 tables / 28 policies / 15 triggers),
  functions type-check + lint clean, and 4 behavioural security tests pass
  (consent block, consent allow, cross-user denial, owner access).

---

## 7. Tech stack

| Layer | Choice |
|-------|--------|
| Mobile app | React Native + Expo + TypeScript |
| Navigation | React Navigation (stacks + tabs) |
| Auth | Supabase Auth (email/password, Google OAuth) |
| Backend | Supabase: Postgres + RLS, Storage, Edge Functions (Deno) |
| STT | Deepgram (default) or AssemblyAI — swappable |
| Scoring | Anthropic Claude — strict JSON |
| Local state | AsyncStorage (pre-backend) |

---

## 8. Current status & what's next

**Built & verified:** multi-persona app, premium UI, on-device metrics, real
STT/Claude integration code, in-app API keys, full Supabase backend
(schema/RLS/consent/audit/storage/functions) verified against local Postgres +
Deno, client auth layer (email + Google) with local fallback.

**Not yet done (needs your accounts / next tasks):**
- ⬜ Provision the Supabase project; deploy functions; set secrets (`DEPLOY.md`).
- ⬜ Configure Google OAuth in Google Cloud + Supabase.
- 🟡 Migrate app reads/writes from local storage to Supabase tables.
- ⬜ Student school-code/roster-invite join path.
- ⬜ Teacher content-analysis pipeline on the server.
- ⬜ Wearable hardware (Phase 2) + legal review.

---

## 9. Sequence diagram (record → report)

```
User      App(device)        EdgeFn /transcribe   EdgeFn /score     Postgres(RLS)
 │  tap record  │                   │                  │                 │
 │─────────────▶│ capture audio     │                  │                 │
 │              │ compute metrics    │                  │                 │
 │              │──── audio + JWT ──▶│                  │                 │
 │              │                   │── Deepgram ─▶     │                 │
 │              │◀── transcript ─────│                  │                 │
 │              │──── transcript + metrics + JWT ──────▶│                 │
 │              │                                      │── Claude ─▶      │
 │              │◀──────────── pillar scores (JSON) ────│                 │
 │              │ assemble CI + evidence + tips         │                 │
 │              │──────────── write session/analysis (JWT) ─────────────▶│ RLS check
 │              │◀───────────────────── ok ─────────────────────────────│
 │◀── report ───│                                                        │
```
