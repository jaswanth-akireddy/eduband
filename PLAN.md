# EduBand — End-to-End Plan

> Single source of truth for building EduBand from today's MVP prototype through a
> production B2B platform sold to schools and colleges. Pairs with the original
> project brief; this document is the actionable roadmap.

**Last updated:** 18 Jun 2026
**One-liner:** EduBand helps schools measure and improve how people *actually communicate* — turning spoken communication (and, for teachers, what they teach) into trackable, coachable skill data.
**North-star metric:** Measurable improvement in a user's Communication Index across a term, visible to the user and (where applicable) their teacher, parent, or institution.

---

## 0a. Multi-persona product (role selection)

On app open, the user picks one of **four roles**. Each role has its own home and feature set, but all share the core Communication Index engine (Section 4).

| Role | Logs in to | Core jobs |
|------|-----------|-----------|
| **Student** | Student app | Record & analyse speaking, guided practice, progress, **Language Lab** (all-day wearable capture) |
| **Teacher** | Teaching analysis | **Analyse Teaching**: communication delivery + *content* analysis (attach teaching materials → what was covered, what was missed, what could be explained better, next-session plan) |
| **Parent** | Parent portal | View their child's communication insights, growth, and suggestions (read-only, consent-gated) |
| **Professional** | Professional app | Professional-level communication analysis & practice (interviews, presentations, workplace English) |

**Role selection screen:** four clear cards on app open. Role is remembered after first login. Each role authenticates separately (different permissions, different data scope).

### Teacher — "Analyse Teaching" (expanded)
Goes beyond delivery. Two layers analysed together:
1. **Communication delivery** — the five pillars applied to teaching (clarity of explanation, pacing, fluency, confidence, engagement cues).
2. **Content / pedagogy** — teacher attaches teaching materials (lesson plan, slides, syllabus topic list, notes). EduBand compares what was *planned* vs. what was *actually said* in the recorded session and reports:
   - Topics covered well.
   - **Topics missed or skipped** (planned but not taught).
   - Points that were rushed or could be explained better (with the moment cited).
   - Misconceptions or unclear explanations flagged.
   - **A suggested plan for the next session** (what to revisit, what to deepen).

Inputs: recorded teaching session (audio) + attached materials (PDF/DOCX/slides/plain text).
Capture options: **phone mic** (tap to record) **or the EduBand band** (worn during class — captures only the teacher via speaker verification, syncs the transcript afterward, exactly like the student Language Lab).
Pipeline addition: materials parsed → topic list extracted → transcript matched against topic list (coverage analysis) via LLM, alongside the standard delivery scoring.

### Student — Language Lab (all-day wearable) ⚠️ Phase 2 hardware
A small clip-on microphone the student wears. It records throughout the day, performs **on-device voice-activity detection + speaker verification** (captures only the wearer), runs **diarization**, and at day's end **uploads a transcript text file** to the app via **Bluetooth or Wi-Fi**. The app then runs the standard analysis over the day's real-world speech.
- Non-wearer speech is **discarded on-device, never stored or transmitted** (critical for bystander consent).
- The **same band is used by teachers** to capture teaching sessions (see Teacher above) — one device, speaker-verified to its wearer.
- Heavy hardware + legal track — see Section 5, Phase 2.
- *(A hardware design PDF was referenced for this; pending — design will be refined once received.)*

### Parent — Parent Portal
Read-only, consent-gated view of their child:
- Current Communication Index + trend.
- Plain-language strengths and focus areas.
- Suggestions for how to support practice at home.
- No raw audio access by default; respects retention settings.

### Professional — Professional Communication
Same engine, professional contexts and norms:
- Modules: interview prep, presentations, workplace English, client conversations.
- Higher/adult norming bands; module-specific pillar weights.
- Practice tasks + analysis + progress, like the student app but adult-framed.

---

## 0. Where we are today (status)

**Built (Phase 1 prototype, running locally):**
- React Native + Expo + TypeScript multi-persona app (Student / Teacher / Parent / Professional), runs in browser and on Android via Expo Go.
- Full analysis pipeline with swap points: `STT → deterministic metrics → LLM scoring → Communication Index`. Real Deepgram/AssemblyAI + Claude wired in; mock auto-fallback.
- In-app API Keys screen for testing; engine indicator.
- Five-pillar framework, age/level norming, evidence + tips per pillar.
- Teacher "Analyse Teaching" (delivery + content coverage + next-session plan); Language Lab wearable preview.
- Premium Obsidian & Iridescent theme; Figma mockups for all screens.
- **Backend built & ready to deploy** (`backend/`): Supabase schema, deny-by-default RLS, audit logging, DB-level consent enforcement, private audio storage + retention, and Edge Functions (`transcribe`, `score`) that hold the API keys server-side. Supabase client added to the app.

**Not yet done:** Supabase project provisioned (needs your account) + functions deployed; client wired to Supabase Auth (login/roles) and reading/writing via the backend instead of local AsyncStorage; teacher content-analysis pipeline on the server; payments; wearable hardware.

**Immediate next step:** deploy the backend (see `backend/DEPLOY.md`), then migrate the client from local storage to Supabase Auth + tables.

---

## 0b. Authentication & accounts

On app open the user picks a role, then authenticates. Auth is handled by
**Supabase Auth** (no custom password store).

**Methods supported (client built):**
- Email + password (with email confirmation)
- Google OAuth (`expo-auth-session` + `expo-web-browser`, redirect scheme `eduband://`)
- (Magic link / Apple / Microsoft available via Supabase later)

**Flow:** sign in → Supabase issues a **JWT** → app persists it (AsyncStorage) →
every Edge Function / DB call sends `Authorization: Bearer <jwt>` → RLS scopes
data. On first sign-in a `profiles` row is created with the chosen role + level.

**Two runtime modes:**
- Supabase configured (`EXPO_PUBLIC_SUPABASE_URL/ANON_KEY`) → real auth + Google.
- Not configured → Auth screen offers "continue locally" (demo) so the app runs.

**Setup you must do for Google (cannot be automated):**
1. Create a Google Cloud OAuth client (web + iOS/Android as needed).
2. Add client ID/secret in Supabase dashboard → Auth → Providers → Google.
3. Add redirect URLs (Supabase callback + `eduband://auth-callback`).

**Open decision — student sign-in:** younger students often have no email.
Recommended pattern: **teachers/parents/professionals** use email or Google;
**students** join via **school code + roster invite** (no personal email). To be
confirmed before production.

---



1. **Child safety & consent first.** Users are minors; buyers are schools. Verifiable consent before any recording. Non-negotiable.
2. **Evidence-based trust.** Every score links to a real snippet of the student's speech.
3. **Accent fairness.** Judge intelligibility and growth, never accent conformity.
4. **Growth, not grading.** Framed as "where you are + next step," never pass/fail.
5. **Effortless for teachers.** One screen surfaces who needs help and why.
6. **Privacy as a moat.** No ads, no third-party tracking, no data selling. Configurable retention, one-click export/delete.

---

## 2. Architecture (target state)

```
┌─────────────────┐     ┌──────────────────┐     ┌────────────────────┐
│  Student app     │     │  Teacher / Admin  │     │  Supabase backend   │
│  (React Native,  │────▶│  dashboard        │────▶│  Postgres + Auth +  │
│   Expo)          │     │  (Next.js, Vercel)│     │  Storage + Edge Fns │
└─────────────────┘     └──────────────────┘     └─────────┬──────────┘
                                                            │
                                          ┌─────────────────┼─────────────────┐
                                          ▼                 ▼                 ▼
                                   ┌────────────┐    ┌────────────┐    ┌────────────┐
                                   │ STT provider│    │ Claude API  │    │  PDF gen    │
                                   │(Deepgram/   │    │ (scoring)   │    │ (reports)   │
                                   │ AssemblyAI) │    │             │    │             │
                                   └────────────┘    └────────────┘    └────────────┘
```

**Pipeline shape (production):**
`Phone mic → upload audio → STT + diarization → metric computation → LLM scoring (JSON) → store → render report + PDF`

**Tech choices (mainstream, AI-tool-friendly):**
- Mobile: React Native + Expo + TypeScript
- Web: Next.js + TypeScript on Vercel
- Backend: Supabase (Postgres, Auth, Storage, Edge Functions)
- STT: Deepgram (lean) or AssemblyAI (feature-rich) — behind one swappable function
- LLM: Anthropic Claude — strict JSON output
- Both STT and LLM already isolated in `src/analysis/stt.ts` and `src/analysis/llmScoring.ts`

---

## 3. Data model (starting schema)

| Table | Key fields | Notes |
|-------|-----------|-------|
| `institutions` | id, name, type, region, data_residency | school/college |
| `classes` | id, institution_id, name, level | |
| `users` | id, institution_id, role(student\|teacher\|parent\|professional\|admin), name, level | RLS by role |
| `parent_links` | parent_id, student_id, relationship, consent_status | parent ↔ child, consent-gated |
| `enrollments` | student_id, class_id | many-to-many |
| `consents` | student_id, type, granted_by, relationship, status, timestamp | block recording without it |
| `sessions` | id, user_id, kind(speaking\|teaching\|labday\|professional), task_id, audio_url, duration, status, created_at | audio_url null if not retained |
| `transcripts` | session_id, text, words_json, diarization_json | labday transcripts arrive from wearable |
| `analyses` | session_id, ci_score, pillar_scores_json, tips_json, evidence_json, model_version, framework_version | versioned |
| `teaching_materials` | id, teaching_session_id, file_url, parsed_topics_json | attached lesson plans/slides |
| `teaching_coverage` | teaching_session_id, covered_json, missed_json, rushed_json, next_session_plan_json | content/pedagogy analysis |
| `devices` | id, student_id, type(wearable), paired_at, last_sync | Language Lab wearables |
| `tasks` | id, prompt, target_level, target_pillars, persona | guided tasks per persona |

**Row-level security:** students see only themselves; teachers see only their classes; admins see only their institution.

---

## 4. The Communication Index (core IP)

Five pillars, each 0–100, age/level-normed, rolled into one CI (weighted average, weights configurable):

| Pillar | Source | Scoring |
|--------|--------|---------|
| Fluency & Delivery | transcript + timing | deterministic (WPM, fillers, pauses) |
| Clarity & Articulation | audio + STT confidence | deterministic (intelligibility proxy) |
| Language & Vocabulary | transcript | LLM + rules (lexical diversity) |
| Structure & Coherence | transcript | LLM judgment |
| Confidence & Expression | audio prosody / text cues | LLM + (later) prosody |
| *Interaction & Listening* | diarized transcript | conversational contexts only |

- Deterministic metrics in code = reproducible, cheap.
- Judgment metrics via Claude = score + evidence snippet + one concrete tip, strict JSON.
- Every analysis stamped with `model_version` + `framework_version` for comparability.

---

## 5. Phase plan

### Phase 1 — MVP (current)
**Goal:** a friendly school can run one class for one term.

**Milestones:**
1. **UI polish** — match app to Figma mockups (gradient theme, glass cards, charts). *(in progress)*
2. **Backend** — Supabase project, schema, RLS, auth with roles.
3. **Real pipeline** — wire Deepgram STT + Claude scoring behind existing swap points; store results.
4. **Teacher dashboard (Next.js)** — roster, "needs attention" list, per-student drill-down, assign tasks, export/print.
5. **Admin** — class/roster management, bulk import, consent dashboard, license/seat management, aggregate analytics, data controls.
6. **Consent system** — verifiable parental consent capture, status tracking, recording block.
7. **Hardening** — encryption at rest/transit, audit logs, low-end Android performance, report-quality tuning.

**Exit criteria:** end-to-end record→report on real audio; teacher dashboard usable; consent enforced; DPDP-aligned data handling.

### Phase 2 — Teaching analysis & Language Lab
**Goal:** unlock the teacher and all-day-capture experiences.

**2a. Teaching analysis (software only — can start sooner):**
- Teacher records a teaching session; attaches materials (lesson plan/slides/topics).
- Parse materials → extract planned topic list.
- Match transcript vs. topics → coverage report (covered / missed / rushed / unclear).
- Generate next-session plan.
- Delivery scoring via the five pillars, teaching-tuned.

**2b. Language Lab wearable (hardware + legal):**
- Clip-on mic, on-device voice-activity detection + speaker verification (wearer only).
- Diarization; non-wearer speech discarded on-device.
- Day-end transcript upload to app via Bluetooth/Wi-Fi → standard pipeline.
- Hardware partner + separate budget; recording-consent legal review per region before any pilot.
- *(Refine against the hardware design PDF once received.)*

### Phase 3 — Parent portal & Professional
- **Parent portal:** consent-gated read-only insights + home-support suggestions.
- **Professional:** adult norming, module-specific pillars (interview, presentation, workplace English).

---

## 6. Long-term feature backlog

**Student experience**
- Adaptive practice paths that target the weakest pillar over time.
- Daily/weekly speaking challenges; gentle streaks (no public leaderboards — child wellbeing).
- Personalized drills (filler reduction, pacing, vocabulary stretch).
- Multi-language analysis (Hindi + regional Indian languages, then beyond).
- Offline recording with deferred sync.
- Voice journaling / reflection prompts.

**Teacher experience**
- Cohort analytics: class trends, pillar heatmaps, term-over-term growth.
- Auto-generated parent-meeting summaries (PDF).
- Assignment workflows with due dates and completion tracking.
- Rubric customization (per-grade pillar weighting).
- Early-warning flags for sudden drops.

**Institution / admin**
- Multi-campus rollups and benchmarking.
- Outcome reports for management/parents (proof of improvement).
- SSO (Google Workspace for Education, Microsoft).
- Roster sync (Clever, classroom management integrations).
- Configurable data residency and retention per institution.

**Platform / AI**
- Prosody analysis from audio (pitch, energy, tone) for the Confidence pillar.
- Real-time/live feedback mode (post-MVP).
- Fine-tuned scoring against hand-graded corpus for accuracy + fairness.
- Model/framework version migration tooling so historical scores stay comparable.
- A/B testing of scoring prompts; QA harness for accent fairness.

**Commercial**
- Self-serve onboarding for small institutions.
- Tiered licensing (seats, modules).
- In-app billing (B2B handled offline at first).
- Partner/reseller program for education distributors.

---

## 7. Privacy, consent & compliance (hard requirements)

- **Consent:** verifiable parental/guardian consent + school authorization before recording; tracked per student; recording blocked without it.
- **Data minimization:** collect only what's needed; default-delete raw audio after analysis (keep transcript/scores).
- **Control:** configurable retention; one-click per-student and per-institution export/delete.
- **No** advertising, third-party tracking, or data selling — stated plainly to schools.
- **Security:** encryption at rest + in transit; role-based access; audit logs; data-residency choice.
- **Compliance:** India DPDP Act 2023 first (verifiable parental consent, purpose limitation, no behavioural monitoring/targeted ads at children). Build **configurable** to add GDPR-K (EU), COPPA (US <13), FERPA (US schools).
- **Phase 2 wearable:** bystander capture is a distinct legal problem — non-wearer speech discarded on-device; legal review per region before any pilot.

> ⚠️ Informational, not legal advice. Engage a lawyer familiar with Indian DPDP and education data before recording real students.

---

## 8. Validation & rollout

1. **Validate framework:** hand-score ~20 real student recordings against the five pillars; confirm a teacher agrees with the scores. *(Do before scaling the build.)*
2. **Pilot:** one friendly school/college, one class, one term. Measure CI improvement and teacher time saved.
3. **Harden:** privacy/security review, low-end Android performance, report-quality tuning.
4. **Phase 2 scoping:** wearable feasibility + legal review.
5. **Phase 3 modules:** teacher and professional analysis.

---

## 9. Open decisions to confirm

These materially change the build:

- **Languages:** English only first? Which Indian languages, and when? (affects STT + prompts)
- **Student level:** K-12, higher-ed, or both? (affects norming bands + tone)
- **Regions:** India only first, or international? (affects compliance config)
- **Audio retention default:** delete after analysis (recommended) or retain for schools?
- **Pillar weighting:** equal to start, or emphasize specific pillars for the first customer?
- **Budget posture:** lean (Deepgram, minimal LLM calls) vs. feature-rich (AssemblyAI + richer analysis)?
- **STT provider** decision and **Claude model** tier.

---

## 10. Near-term task list (next sprint)

- [ ] **Role selection screen** on app open (Student / Teacher / Parent / Professional).
- [ ] Auth per role with correct data scope (RLS).
- [ ] Finish app restyle to match Figma mockups (Obsidian & Iridescent theme).
- [ ] Stand up Supabase project + schema (incl. new tables) + RLS.
- [ ] Wire Deepgram STT behind `src/analysis/stt.ts`.
- [ ] Wire Claude scoring behind `src/analysis/llmScoring.ts`.
- [ ] Move persistence from AsyncStorage to Supabase.
- [ ] Teaching analysis MVP: material upload + topic extraction + coverage report.
- [ ] Scaffold Next.js teacher dashboard.
- [ ] Consent capture + enforcement; parent linking.
- [ ] Validate framework on ~20 real recordings.

---

## 11. Risks & mitigations

| Risk | Mitigation |
|------|-----------|
| Scoring feels wrong to teachers | Validate on real recordings before scaling; expose pillar weights as config |
| Accent bias | Bake fairness into prompts + QA; judge intelligibility, not accent |
| Privacy/legal exposure (minors) | Consent-first design; DPDP alignment; legal review before real pilots |
| STT/LLM cost at scale | Deterministic metrics in code; cache; lean provider option; batch where possible |
| Low-end Android performance | Test on low-end devices; keep client light; offload heavy work to backend |
| Vendor lock-in (STT/LLM) | Single swappable function per provider already in place |
| Wearable complexity derails MVP | Keep Phase 2 a separate program with its own budget/partner |
```
