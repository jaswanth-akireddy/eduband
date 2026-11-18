# EduBand UI/UX Audit

Run against the `ux-ui-agent-skills` kit (v3.1.0) rubric at `workflows/design-review.md`,
with the React Native adapter at `frameworks/adapters/react-native.md` and the
anti-slop doctrine at `taste/design-taste.md`.

Audited at commit `e561322`. Date: 2026-11-18.

---

## Scope and method: read this first

**What ran.** Contrast ratios computed with the kit's own `scripts/contrast.py`
(WCAG 2.2 relative-luminance maths) against the real palette in
`src/theme/index.ts`. The kit's emoji/dash gate (`scripts/check_no_emoji.py`)
run against `src/`. Source-level checks for token adherence, spacing grid,
touch-target sizes and accessibility props.

**What could not run, and why it matters.** The kit's `critique` skill is blunt
about this: *"A critique written from source alone is worthless. Render the
target and look at it."* It is right. Most of the kit's 52 gates drive a real
browser through Playwright and axe-core against a DOM — `taste_audit`,
`slop_tells`, `verify_overflow`, `verify_responsive`, `verify_states`,
`axe_audit`, `verify_focustrap`, `verify_rtl`. **React Native has no DOM, and
this container has no emulator**, so none of them apply or could be run.

So this is a **source and colour-maths audit, not a visual one**. There are no
screenshots behind it. Every number below is computed or counted; nothing is
measured from a rendered screen. The visual half of the review is still
outstanding and needs a device or emulator.

---

## Scorecard

| # | Dimension | Weight | Score | Note |
|---|---|---|---|---|
| 1 | Visual Hierarchy | 20% | **8** | Decisive type scale, restrained colour, one accent |
| 2 | Consistency | 20% | **6** | 33 off-token colours, 17 surviving emoji, off-grid spacing |
| 3 | Accessibility | 20% | **4** | Measured contrast failures; `Button` has no a11y role |
| 4 | Usability | 20% | **8** | Strong error prevention, offline-first, honest states |
| 5 | Responsiveness | 10% | **7** | Safe areas handled; Dynamic Type unverified |
| 6 | Performance | 10% | **8** | Skeletons, native-driver animation, no heavy deps |

```
Overall = (8 x 0.2) + (6 x 0.2) + (4 x 0.2) + (8 x 0.2) + (7 x 0.1) + (8 x 0.1)
        = 6.7 / 10
```

**6.7** sits between the rubric's "Adequate: several issues to address before
shipping" and "Good: minor polish needed". Accessibility is what drags it: the
other five dimensions average 7.4. Fix dimension 3 and this is a 7.5+ product.

---

## Measured contrast: the hard failures

WCAG 2.2 AA needs **4.5:1** for normal text, **3:1** for large text (>=18.66px
bold or >=24px regular) and **3:1** for UI components and meaningful graphics.

### Light theme

| Token pair | Ratio | AA normal | Verdict |
|---|---:|---|---|
| `text #1B1B1F` on `surface #FFFFFF` | 17.17:1 | pass | excellent |
| `text` on `bg #F6F6F8` | 15.91:1 | pass | excellent |
| `textMuted #71717A` on `surface` | 4.83:1 | pass | fine |
| `textMuted` on `bg` | 4.48:1 | **fail by 0.02** | borderline |
| `textMuted` on `surfaceAlt #F1F1F4` | 4.29:1 | **fail** | |
| `textFaint #AFAFB8` on `surface` | **2.18:1** | **fail** | below even 3:1 |
| `textFaint` on `bg` | **2.02:1** | **fail** | below even 3:1 |
| `white` on `primary #FF385C` | 3.52:1 | **fail** | every primary button |
| `primary` as text on `surface` | 3.52:1 | **fail** | links, active states |
| `good #188A4C` on `surface` | 4.39:1 | **fail by 0.11** | score text |
| `mid #E8930C` on `surface` | **2.44:1** | **fail** | score text, warnings |
| `low #E5484D` on `surface` | 3.91:1 | **fail** | score text, errors |
| `accent #0E8488` on `surface` | 4.49:1 | **fail by 0.01** | |

### Dark theme

| Token pair | Ratio | AA normal | Verdict |
|---|---:|---|---|
| `text #F4F4F6` on `surface #1A1A20` | 15.77:1 | pass | excellent |
| `textMuted #9E9EA7` on `surface` | 6.52:1 | pass | good |
| `textMuted` on `bg #0C0C10` | 7.35:1 | pass | good |
| `textFaint #5E5E67` on `surface` | **2.70:1** | **fail** | below 3:1 |
| `textFaint` on `bg` | **3.04:1** | **fail** | UI threshold only |
| `good #34C77B` on `surface` | 7.92:1 | pass | |
| `mid #F5A623` on `surface` | 8.55:1 | pass | |
| `low #F2555A` on `surface` | 5.13:1 | pass | |
| `primary #FF385C` on `surface` | 4.93:1 | pass | |

**The dark theme is substantially more accessible than the light theme**, which
is the opposite of the usual result and worth knowing: light is the default
(`scheme` defaults to `'light'`), so most users get the worse one.

---

## Findings

| # | Severity | Category | Location | Finding | Recommendation | Heuristic |
|---|---|---|---|---|---|---|
| 1 | **Critical** | A11y | `src/theme/index.ts` `textFaint` | 2.18:1 light, 2.70:1 dark. Used in 23 places at 11-13px. Below even the 3:1 non-text floor, so it is not a tertiary label, it is decoration that happens to contain words. | Darken light to `#6E6E78` (verified 5.04:1 on surface, 4.67:1 on bg) and lighten dark to `#8A8A94` (5.07:1 on surface, 5.71:1 on bg). It will look less delicate. That is the trade. | - |
| 2 | **Critical** | A11y | `src/components/Button.tsx` | The app's primary button has **no `accessibilityRole` and no `accessibilityState`**, so every button in the app is an unlabelled view to a screen reader. The kit's own RN adapter example sets both. | Add `accessibilityRole="button"` and `accessibilityState={{ disabled: disabled \|\| loading, busy: loading }}`. One file, fixes every screen. | - |
| 3 | **Critical** | A11y | `Button` primary variant | Label is `#FFFFFF` on `#FF385C` at 16px semibold: **3.52:1**. 16px semibold is not WCAG "large text", so this needs 4.5:1 and misses. | Darken the button fill to `#D91F45` (verified 4.96:1 with white) while keeping `#FF385C` for non-text accents, or raise the label to 18px bold to qualify for the 3:1 threshold. | - |
| 4 | **Major** | A11y | `mid #E8930C` on white | **2.44:1**. This is the amber used for mid-band scores and warning text. | Use `#8A5300` for amber *text* (verified 6.33:1 on surface, 5.86:1 on bg); keep `#E8930C` for fills and ring strokes, where 3:1 applies. | - |
| 5 | **Major** | A11y | `low`, `good`, `accent` | 3.91:1, 4.39:1, 4.49:1 as text. All three miss 4.5:1, the last two by a hair. | Nudge each until `contrast.py` returns >=4.5. Verified replacements: `good` -> `#14793F` (5.47:1 / 5.07:1), `accent` -> `#0C7579` (5.47:1 / 5.07:1), `low` -> `#C9343A` (5.20:1 / 4.82:1), quoting surface then bg. | - |
| 6 | **Major** | A11y | 10 of 19 `Pressable`s | `DebugLogPanel` (3 of 3 missing 2), `RoleSelectScreen`, `ProfessionalHomeScreen`, `TeacherSessionsScreen`, `TeacherHomeScreen` (2), `TeacherRecordScreen`, `AuthScreen` have interactive elements with no role or label. | Add role plus label. `RecordScreen` is the reference: it sets role, label and `accessibilityState={{ busy }}`. | H4 |
| 7 | **Major** | Consistency | 17 emoji still in UI | The icon migration missed: `ProfessionalHomeScreen.tsx:16-19` uses four emoji as feature icons; `LanguageLabScreen.tsx:41`; `TeacherHomeScreen.tsx:60`; four `⚠`; four `✓`. The typed `IconName` union could not catch these because they are raw strings inside `Text`, not `Icon` props. | Replace with the in-house set, which already has `check`, `shield`, `mic`, `chart`. `ProfessionalHomeScreen` looks like it was skipped entirely. | H4, H6 |
| 8 | **Major** | Usability | 6 `<Text onPress>` | `RoleSelectScreen:109`, `SwitchRoleScreen:69`, `OnboardingScreen:59`, `AuthScreen:113`, `AuthScreen:171`, `ProfileScreen:193`. Text with a tap handler: no role, no pressed state, no guaranteed 44pt target, and at `font.small` the hit area is roughly 18pt tall. | Wrap each in a `Pressable` with `hitSlop` and `accessibilityRole="button"`, or use the `ghost` Button variant, which already sets `minHeight: 44`. | H4 |
| 9 | **Minor** | Consistency | 33 hardcoded hex values | Colours outside the theme in `.tsx` files, including a second `#E8930C` and `#FF385C` typed by hand rather than referenced, plus one-off `#6366F1`, `#9AA0A6`, `#FBBF24`. | Promote the ones that recur into the palette; delete the rest. Pre-flight check 12: every value traces to a token. | H4 |
| 10 | **Minor** | Consistency | Spacing off the 4px grid | The scale is 4/8/16/24/32/48, but `2px` (16 uses), `6px` (16), `10px` (13), `14px` (4), plus stray 1/3/5/7/9/13 appear inline. | Add `xxs: 2` and `smd: 12` if those are wanted deliberately, then replace the literals. Right now the grid is aspirational, not enforced. | H4 |
| 11 | **Minor** | Taste | `surface: '#FFFFFF'` | Pre-flight check 5 asks for an off-white surface, not pure `#FFFFFF`. Text is correctly off-black `#1B1B1F`, so this is half-done. | Warm or cool it a touch, e.g. `#FDFDFE`. Minor, but it is why the card edges need a hairline to read at all against `#F6F6F8`. | - |
| 12 | **Minor** | Taste | Em-dashes in UI copy | 6 user-facing strings use `—`: `RecordScreen:53`, `PrivacyScreen:166`, `LanguageLabScreen:78`, `TeacherHomeScreen:45`, `ReportScreen:261`, and `ProgressScreen:73` uses a bare `—` as an empty-value placeholder. | The kit bans these outright as an AI tell. Judgement call: `"Removes everything — cannot be undone"` reads fine to most people. The `ProgressScreen` bare dash is the one to change, to `No data yet`. | - |
| 13 | **Enhancement** | Responsiveness | Dynamic Type untested | No evidence of testing at large system font sizes. This matters more than usual here: `src/theme/fonts.tsx` patches `Text.render` to force `fontFamily` and strip `fontWeight`, and several layouts use fixed heights (`ListRow` 32, `waveSlot` 40). | Test at 1.3x and 2x system font scale. Fixed-height rows holding scaled text is the classic clipping bug. | - |
| 14 | **Enhancement** | A11y | No `accessibilityLiveRegion` | Score reveals and the processing screen update silently for screen-reader users. | Add a live region to the Processing status line and the Report's Communication Index. | H1 |

---

## Nielsen heuristics

Violations, by number:

- **H4 Consistency and standards** — findings 6, 7, 8, 9, 10. This is the pattern: the system exists and is good, but it is not applied uniformly. Emoji sit beside a bespoke icon set; `Text onPress` sits beside a well-built `Button`; a spacing scale sits beside inline literals.
- **H6 Recognition over recall** — finding 7. Emoji as feature icons on `ProfessionalHomeScreen` while every other screen uses the stroke set.
- **H1 Visibility of system status** — finding 14, for screen-reader users only. Visually this heuristic passes well: `Skeleton` shimmer, `Button` loading state, the Processing screen, and the on-device log panel.

**Passing clearly:** H3 (user control: the discard-recording guard, back links everywhere), H5 (error prevention: destructive confirms, the five-second minimum take, the consent gate), H8 (aesthetic and minimalist: this is the app's strongest dimension), H9 (error recovery: real messages, the "Open Settings" path on denied mic permission).

---

## What is genuinely good

Worth stating, because the findings table is long and one-sided by design.

- **The type scale does the work.** 34/28/22/17/15/13/11 with hierarchy carried by weight, not colour. Pre-flight checks 1, 4 and 6 pass.
- **Reduced motion is respected everywhere**, via `useReducedMotion()` on every animated component. Pre-flight check 11 passes, and most codebases fail it.
- **Error prevention is better than most shipped apps.** Intercepting back-navigation mid-recording and naming the consequence is the kind of thing that normally gets added after a support ticket.
- **Dark mode is genuinely accessible** — every pair tested passes AA, several at AAA.
- **Zero UI dependencies.** Every chart, ring, gauge and icon is hand-built SVG. That is why the visual language is coherent.
- **`RecordScreen` is the a11y reference implementation** in this codebase: role, label, and `accessibilityState={{ busy }}`. Finding 6 is really "make the other nine look like this one."

---

## Remediation batches

**Batch 1 — palette, about one hour, fixes 6 findings.** Edit `lightColors` only:
`textFaint`, `good`, `mid`, `low`, `accent`, and the primary-button fill. Re-run
`python3 scripts/contrast.py <fg> <bg>` on each pair until all return >=4.5.
Nothing else changes; every screen inherits it. Findings 1, 3, 4, 5, 11.

**Batch 2 — `Button.tsx`, about ten minutes, fixes the whole app.** Two props.
Finding 2.

**Batch 3 — a11y props, about two hours.** The ten Pressables and six
`Text onPress` sites. Copy the `RecordScreen` pattern. Findings 6, 8.

**Batch 4 — consistency sweep, about two hours.** Emoji to `Icon`, hardcoded hex
to tokens, off-grid spacing to the scale (or extend the scale honestly).
Findings 7, 9, 10, 12.

**Batch 5 — verify on a device.** Dynamic Type at 2x, TalkBack and VoiceOver
walkthroughs of the record-to-report flow, and the visual critique that this
audit could not perform. Findings 13, 14, plus everything the source cannot show.

---

## Caveat on the scores

Dimension scores are judgement, not measurement. The kit says this of its own
rubric, and it is worth repeating: the contrast table is arithmetic and will
reproduce exactly, but "Visual Hierarchy 8" is an opinion formed from reading
source, without having looked at a single rendered screen. Treat the findings
table as the deliverable and the scorecard as a summary of it.
