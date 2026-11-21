# EduBand UI/UX Redesign Plan

Status: **Iteration 1 of 3: choosing a direction.** No app code changes until the
design is signed off.

Design intelligence: [`nextlevelbuilder/ui-ux-pro-max-skill`](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill)
v2.15.0 (MIT), installed at `.claude/skills/ui-ux-pro-max/`.

---

## 1. Goal

Make EduBand feel designed by a professional product team: pleasant to open every
day, clear about what to do next, and honest and encouraging about a student's
speaking. Every screen, every role, light and dark.

"Done" means a student can open the app, record, and understand their report
without help, and nothing on the way looks unfinished.

## 2. Who it is for, and what that rules out

- **Students from roughly 12 to 22**, plus teachers, parents and working professionals.
- Not small children. This matters: the skill's design-system generator mapped
  "education" to children's apps (Comic Neue, toy-like Claymorphism) on every
  query containing "learning". Those picks were rejected for this audience and
  replaced from the skill's own typography and style data (see section 4).
- Android first (Play Store), iOS-ready.
- Feedback about speech is personal. The visual tone must encourage, never shame:
  no harsh reds for low scores, no leaderboards that compare students.

## 3. Constraints that shape every design decision

| Constraint | Consequence |
|---|---|
| React Native 0.74.5, Expo SDK 51, React Navigation v6 | No Expo Router, no `@expo/ui`. Designs must be buildable with `View`/`Text`/`react-native-svg`. |
| Current animation uses RN `Animated` | The skill recommends Reanimated for complex motion (`--stack react-native`). That is a native dependency and needs a new build, not an OTA update. Only adopt it if the chosen direction needs complex motion. |
| WCAG 2.2 AA, measured | Every text pair at least 4.5:1, meaningful graphics at least 3:1, measured with `scripts/contrast.py`, light and dark. |
| Touch targets | At least 48dp on Android, 44pt on iOS (skill `pro-rules.md`). |
| Offline-first | Every screen needs designed loading, empty and offline states, not just the happy path. |
| No emoji, consistent stroke icons | The app already has an in-house SVG icon set; it gets extended, not replaced. |
| Dark mode | The skill has **no** React Native dark-mode guidance (two queries returned 0 results). Dark mode follows the skill's mobile `pro-rules.md` "Light/Dark Mode Contrast" rules instead. |

## 4. Iteration 1: three directions

Each direction was produced by the skill's `--design-system` generator or its
`--domain` searches, then contrast-checked. All three are mocked on the three
screens that matter most: **Home**, **Record**, **Report**.

### A. Focus (calm, Swiss minimal)

- **Skill style:** Minimalism & Swiss Style. Lowest accessibility risk of the three.
- **Palette:** warm paper `#FFFBEB`, ink `#0F172A`, amber `#D97706`, green CTA `#059669` with **black** text.
- **Type:** Plus Jakarta Sans (skill pairing "Friendly SaaS"; replaced the generator's Varela Round, which it tags for children's products).
- **Feel:** a well-made notebook. Big numbers, hairlines, no shadows, lots of air.

### B. Pulse (performance, dark)

- **Skill style:** Vibrant & Block-based on a dark canvas.
- **Palette:** slate `#1F2937`, card `#313742`, energy orange `#F97316`, green `#22C55E`, dark text on both.
- **Type:** Barlow Condensed + Barlow (skill pairing for athletic, performance products).
- **Feel:** Whoop for your voice. Rings, stats, trends. Dark by default.

### C. Bloom (playful, soft 3D)

- **Skill style:** Claymorphism, the skill's top pick for learning apps.
- **Palette:** indigo mist `#EEF2FF`, ink `#312E81`, indigo `#4F46E5` (white text), green `#16A34A` (black text).
- **Type:** Baloo 2 headings + Nunito Sans body (replaced the generator's Comic Neue, which reads as written for young children).
- **Feel:** encouraging and warm. Chunky rounded cards, soft depth, streaks.

### Contrast, measured before anything was drawn

| Pair | A Focus | B Pulse | C Bloom |
|---|---|---|---|
| Body text on background | 17.22:1 | 14.03:1 | 10.22:1 |
| Muted text on its surface | 7.31:1 | 8.06:1 | 6.54:1 |
| Label on primary button | 6.59:1 | 6.37:1 | 6.29:1 |
| Label on accent | 5.57:1 (black) | 7.83:1 | 6.37:1 |
| Meaningful graphic on background | 3.07:1 | 5.24:1 | **2.67:1, fails** |

Two failures found and designed around rather than shipped:

- **A:** white on its green is 3.77:1, so the green always carries black text, as the skill's palette specifies.
- **C:** light indigo `#818CF8` is 2.67:1, too faint for a score ring. Rings use the main indigo; light indigo is decoration only.

### What I need from you to finish iteration 1

Pick a direction, or a mix ("B's rings with A's calm"). Also tell me what you
dislike; that is usually more useful than what you like.

## 5. Iteration 2: refine the chosen direction

- Full token set: colour (light **and** dark), type scale, spacing (4/8 rhythm),
  radius, elevation, motion durations and easing, icon sizes.
- Core components in every state: Button (primary, secondary, ghost, destructive;
  default, pressed, disabled, loading), Card, ListRow, score ring/bar, chip,
  input with error, tab bar, header, empty state, skeleton, toast.
- Home, Record and Report redrawn in light and dark, with loading, empty and
  offline states.
- Persist the system with the skill (`--persist` writes
  `design-system/eduband/MASTER.md` plus per-page overrides) so implementation
  has one source of truth.

## 6. Iteration 3: every remaining screen

22 screens today. Grouped by how often a student sees them:

| Priority | Screens |
|---|---|
| Every session | Home, Record, Processing, Report |
| Weekly | Practice, Progress, Profile |
| First run | Role select, Auth, Onboarding, Consent |
| Settings | Privacy, API keys, Switch role |
| Other roles | Teacher home, sessions, record, report, profile; Parent portal; Professional home |
| Preview | Language Lab (Phase 2 wearable) |

Iteration 3 ends with your sign-off on every screen.

## 7. Implementation, after sign-off

Each phase ships on its own through an over-the-air update, so you can try it on
your phone before the next phase starts.

1. **Tokens and theme.** Replace the palette, type scale and spacing in
   `src/theme/`. Load the chosen fonts. Everything still renders, now on the new system.
2. **Core components.** Button, Card, ListRow, rings and bars, chips, inputs, tab
   bar, header, empty and loading states.
3. **The four every-session screens.**
4. **Weekly and first-run screens.**
5. **Settings and the other roles.** This is also where the 18 remaining emoji go.
6. **QA.** Contrast gate on every token pair; emoji gate on `src/`; every
   `Pressable` labelled; Dynamic Type at 1.3x and 2x; dark mode on every screen;
   TalkBack walkthrough of record to report; a test on your phone.

## 8. Definition of done

- Every screen matches the signed-off mockups in light and dark.
- Every text pair is at least 4.5:1 and every meaningful graphic at least 3:1, measured.
- Every interactive element is at least 48dp, labelled, and has a visible pressed state.
- No emoji in the UI. No hardcoded colours outside `src/theme/`.
- Loading, empty, error and offline states exist for every data screen.
- Nothing clips at 2x system font size.
- Typecheck clean, CI green, and confirmed on a real Android device.

## 9. Risks

| Risk | Mitigation |
|---|---|
| A new font changes text metrics, so labels wrap or clip | Test at 1x, 1.3x and 2x font scale in QA. |
| Direction B is dark by default; some students find dark-only harder to read | Ship a light variant too; dark is the default, not the only mode. |
| Reanimated needs a native rebuild | Only adopt it if the chosen direction needs complex motion. |
| Two design rule sets in the repo | The earlier kit (`plugin87/ux-ui-agent-skills`) is still installed and its `CLAUDE.md` loads on every turn. Decide whether it stays alongside this skill or is removed before implementation. |
| The Supabase project is paused | Sync and sign-in cannot be tested end to end until it is restored. Offline paths can be. |

## 10. Decisions log

| Date | Decision |
|---|---|
| 2026-11-21 | Use `ui-ux-pro-max-skill` for design direction. Installed only the core skill; excluded its `stack/` folder, whose `settings.json` enables all project MCP servers and grants broad read access. |
| 2026-11-21 | Rejected the generator's children's-app picks (Comic Neue, Varela Round) for this audience. |
