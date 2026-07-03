# EduBand — Feature Ideas & Use Cases

A backlog of features to make EduBand genuinely *usable and sticky*, not just
functional. Grouped by priority. Each item has a **user case**, the **value**
(why it matters), an **effort** estimate (S / M / L), and **dependencies**.

Review notes: tick the ones you want, strike the ones you don't. Nothing here is
built yet — this is for you to prioritise.

**Legend** — Effort: `S` ≈ hours, `M` ≈ a day or two, `L` ≈ multi-day.
Personas: 🎓 student · 🧑‍🏫 teacher · 👪 parent.

---

## Tier 1 — High-impact, low-effort (do these first)

### 1. Daily streaks + a simple daily goal 🎓
- **User case:** "I opened EduBand 4 days in a row and it shows a 🔥 4-day streak; my goal is 1 session a day."
- **Value:** The single biggest retention lever for learning apps (Duolingo's core loop). Turns a one-off demo into a habit.
- **Effort:** S–M · **Depends on:** existing sessions + dates.

### 2. Practice reminders (push notifications) 🎓👪
- **User case:** "At 6pm I get a gentle nudge: *'2 minutes of speaking keeps your streak alive.'*"
- **Value:** Drives the daily habit; without reminders, streaks die.
- **Effort:** M · **Depends on:** `expo-notifications`, permission flow.

### 3. "Say it better" rewrite in the report 🎓
- **User case:** "The report shows *You said:* 'the thing is like it was good' → *Try:* 'the main point is that it worked well.'"
- **Value:** The highest-value feedback upgrade — shows students *how*, not just *what*. (From the analysis discussion.)
- **Effort:** M · **Depends on:** prompt + schema + Report UI changes.

### 4. Playback with synced transcript + filler/pause highlights 🎓
- **User case:** "I tap play and watch my words scroll by, with every 'um' and long pause highlighted where it happened."
- **Value:** Self-review is where real improvement happens; makes abstract metrics concrete.
- **Effort:** M · **Depends on:** retaining audio (opt-in), word timings (already captured).

### 5. Compare to your last attempt on the same task 🎓
- **User case:** "I re-did the 'describe your hometown' task; it shows +6 CI and 'half as many fillers as last time.'"
- **Value:** Makes progress visible and motivating; encourages retrying tasks.
- **Effort:** S–M · **Depends on:** sessions grouped by task.

---

## Tier 2 — Core learning-loop upgrades

### 6. Adaptive practice plan (target the weakest pillar) 🎓
- **User case:** "My structure score is lowest, so the app suggests 'Open with your point' tasks until it improves."
- **Value:** Personalised path beats a flat task list; feels like a real coach. (Partly there via `practiceSuggestionTaskId`.)
- **Effort:** M · **Depends on:** analysis history, task tagging by pillar.

### 7. Scenario-based task library 🎓
- **User case:** "I pick 'Mock job interview' or 'Class presentation' or 'Tell a story' instead of a generic prompt."
- **Value:** Relevance = motivation; real-world contexts make it feel useful, not academic.
- **Effort:** M · **Depends on:** curated prompt sets by scenario/level.

### 8. Progress dashboard with per-pillar trends 🎓👪
- **User case:** "A line chart shows my Communication Index over 30 days and which pillar is climbing fastest."
- **Value:** Turns single scores into a growth story; great for parents too. (ProgressScreen exists — deepen it.)
- **Effort:** M · **Depends on:** sessions history, a chart component.

### 9. Weekly report card (in-app + optional email) 🎓👪
- **User case:** "Every Sunday I get 'This week: 5 sessions, CI up 4, strongest = clarity, focus = confidence.'"
- **Value:** A recurring reason to come back; a shareable artifact of progress.
- **Effort:** M–L · **Depends on:** history; email needs a backend job.

### 10. Achievements / badges 🎓
- **User case:** "I unlocked 'Filler Slayer' for a session under 2% fillers."
- **Value:** Cheap, effective motivation; celebrates specific wins beyond the score.
- **Effort:** S–M · **Depends on:** rules over existing metrics.

### 11. Goals you set yourself 🎓
- **User case:** "I set a goal: reach CI 80 by month-end; the app tracks me toward it."
- **Value:** Ownership and direction; ties daily practice to a personal target.
- **Effort:** S–M.

---

## Tier 3 — Multi-user value (teacher & parent)

### 12. Teacher class dashboard 🧑‍🏫
- **User case:** "I see my 30 students' latest scores, who's practising, and who needs a nudge."
- **Value:** Unlocks the school/B2B use case; the app's real distribution channel.
- **Effort:** L · **Depends on:** classes/enrollments (schema exists), RLS, teacher UI.

### 13. Assignments with due dates 🧑‍🏫🎓
- **User case:** "Teacher assigns 'Persuasive speech, due Friday'; students see it in their task list."
- **Value:** Embeds EduBand into real coursework → sustained usage.
- **Effort:** L · **Depends on:** assignments table, notifications.

### 14. Parent weekly digest + conversation starters 👪
- **User case:** "I get 'Aarav improved in clarity this week. Try asking him to explain his day in one minute.'"
- **Value:** Keeps parents engaged and supportive without surveillance; strengthens the home loop.
- **Effort:** M · **Depends on:** parent links (schema exists), a summary job.

### 15. Verifiable parental consent flow 👪🎓
- **User case:** "A parent confirms consent via email/link before recording is enabled."
- **Value:** **Required** for a kids' app on the Play Store (COPPA/DPDP). Compliance blocker, not optional.
- **Effort:** M–L · **Depends on:** email/link verification, backend.

---

## Tier 4 — Bigger bets / differentiators

### 16. AI conversation partner (interactive speaking) 🎓
- **User case:** "The app asks me follow-up questions and I answer out loud — a back-and-forth mock interview."
- **Value:** Moves from 'record a monologue' to real conversational practice — a standout differentiator.
- **Effort:** L · **Depends on:** LLM turn-taking + STT/TTS.

### 17. Live coaching while recording 🎓
- **User case:** "As I speak, a subtle meter shows my pace and counts fillers in real time."
- **Value:** Immediate feedback changes behaviour in the moment.
- **Effort:** L · **Depends on:** on-device metering / streaming STT (Android metering is limited — scope carefully).

### 18. Pronunciation / clarity drills 🎓
- **User case:** "The app noticed I drop word endings, so it gives me targeted 'crisp endings' drills."
- **Value:** Turns diagnosis into targeted remediation.
- **Effort:** L · **Depends on:** phoneme-level STT or a drills content set.

### 19. Vocabulary builder from your own transcripts 🎓
- **User case:** "It spots that I overuse 'good' and suggests 'effective, solid, impressive' with examples."
- **Value:** Personalised, contextual vocabulary growth beats generic word lists.
- **Effort:** M · **Depends on:** transcript analysis + LLM.

### 20. Multi-language support 🎓
- **User case:** "I practise in Hindi and get feedback in Hindi."
- **Value:** Massively widens the audience (esp. India-first); accent-fairness already baked in.
- **Effort:** L · **Depends on:** multi-lingual STT/LLM + UI localisation.

---

## Cross-cutting (do alongside features)

- **Accessibility pass** (S–M): screen-reader labels, dynamic type, WCAG contrast — also improves Play review outcomes.
- **Offline-first polish** (S): already caching sessions; extend to queue-and-sync recordings made offline.
- **Share a result card** (S): export a nice CI/achievement image to share — organic growth loop.
- **Onboarding tour** (S): a 3-screen "how it works" so first-time users get value fast.
- **Cost/rate controls** (M): per-user limits on STT/LLM calls before any public launch.

---

## Suggested sequencing

1. **Habit + feedback quality first:** #1 streaks, #2 reminders, #3 "say it better", #4 playback, #5 compare-to-last. These make the *existing* single-user loop genuinely sticky.
2. **Then depth:** #6 adaptive plan, #7 scenarios, #8 trends, #10 badges.
3. **Then reach:** #12 teacher dashboard + #13 assignments (unlocks schools) and #15 verifiable consent (unlocks Play launch).
4. **Then differentiate:** #16 AI conversation partner.

> Recommendation: knock out Tier 1 as one focused release — it's the highest
> ratio of "feels like a real product" to effort, and every item builds on data
> you already capture.
