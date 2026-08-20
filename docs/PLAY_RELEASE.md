# Publishing EduBand to Play Store testing

Target: get the app into testers' hands. **Internal testing** is the fastest
route (live in minutes, no review wait, up to 100 testers). **Closed testing**
is the one that unlocks production later.

---

## Which track

| | Internal | Closed | Open |
| --- | --- | --- | --- |
| Testers | up to 100, by email | invited list / email | public |
| Live in | minutes, no review wait | after review | after review |
| Counts toward production access | **No** | **Yes** | — |

**Personal developer accounts created after 13 Nov 2023 must run a closed test
with at least 12 testers opted in continuously for 14 days before applying for
production access.** Play also measures engagement — testers who install but
never open the app get flagged inactive, so recruit people who will actually use it.

**Recommended path:** internal test first (catch crashes fast) → then start the
closed test so the 14-day clock begins.

---

## 1. Build the AAB

```bash
eas build --profile production --platform android
```

Produces an `.aab` (what Play requires). `autoIncrement` is enabled, so each
build gets a fresh versionCode — Play rejects duplicates.

Test the same code as an installable APK first:

```bash
eas build --profile preview --platform android
```

## 2. Upload

Either upload the `.aab` by hand in Play Console → Testing → Internal testing →
Create new release, or:

```bash
eas submit --platform android --latest
```

(Configured to land in the **internal** track as a **draft**.)

## 3. App content declarations — required before any rollout

Play Console → **App content**. Budget ~30 minutes.

### Privacy policy
Publish `docs/PRIVACY_POLICY.md` at a public URL and paste it in.
GitHub Pages works: Settings → Pages → deploy from `main` → `/docs`.
**Replace `CONTACT_EMAIL` with a real monitored address first.**

### Data safety form — answers for EduBand

**Does your app collect or share any of the required user data types?** → Yes
**Is all data encrypted in transit?** → Yes
**Do you provide a way for users to request data deletion?** → Yes (in-app: Privacy & data → Delete all my data)

| Data type | Collected | Shared | Purpose | Optional? |
| --- | --- | --- | --- | --- |
| Name | Yes | No | App functionality, personalisation | Required |
| Email address | Yes | No | App functionality, account management | Required |
| Voice or sound recordings | Yes | **Yes** (STT/AI provider) | App functionality | Required |
| Other user-generated content (transcripts) | Yes | **Yes** (AI provider) | App functionality | Required |
| Other info (level, school code, consent record) | Yes | No | App functionality | Required |

Declare **no** advertising/marketing purpose, **no** analytics SDKs, **no**
location, contacts, photos, or advertising ID.

> Audio is shared with the speech-to-text and AI scoring providers purely to
> process the session — declare it as shared, since it leaves the device.

### Content rating
Complete the questionnaire. EduBand is an education app with no violence,
sexual content, gambling, or user-to-user messaging → expect **Everyone / 3+**.

### Target audience and content
This is the sensitive one: the app **targets minors**, so it falls under the
**Families policy**. Declare the real target age group and be ready to explain
the parental-consent flow.

### Also declare
Ads: **No**. Government app: **No**. Financial features: **No**.
Data deletion: point at the in-app deletion (and `CONTACT_EMAIL`).

## 4. Store listing (minimum for testing)

- **App name:** EduBand
- **Short description (max 80 chars):**
  `Practise speaking and get AI feedback on how you actually communicate.`
- **Full description:** see below
- **Graphics:** 512×512 app icon, 1024×500 feature graphic, at least 2 phone
  screenshots (grab Home, Report, Record).

<details><summary>Full description draft</summary>

EduBand helps students become confident speakers.

Record a short speaking task — a guided prompt or free speech — and EduBand
turns it into a clear, growth-focused report. You get a Communication Index out
of 100 plus a breakdown across five skills: fluency, clarity, language,
structure and confidence. Every score comes with evidence from your own words
and one concrete thing to try next.

• Guided tasks matched to your level
• A friendly report, never a grade — feedback is designed to encourage
• Track your progress over time and see which skills are improving
• Accent-fair by design: we measure clarity and growth, never accent conformity

Privacy first. Recording happens only when you tap record — never in the
background — and is blocked until a parent or guardian grants consent. Raw audio
is deleted right after analysis by default. No ads, no third-party tracking, and
we never sell your data. You can export or permanently delete everything from
inside the app at any time.

</details>

## 5. Before you invite testers

- [ ] Supabase project **active** (free projects auto-pause after ~7 days idle)
- [ ] Migrations applied — `cd backend && supabase db push` (0001–0006)
- [ ] Edge functions deployed + API key secrets set, so analysis is **real**, not mock
- [ ] Sign up → record → report verified on a physical device
- [ ] Log out → log back in → name still there (profile restore)
- [ ] Tabs render below the status bar on a gesture-nav phone

## 6. Known gaps to close before *production*

- **Verifiable parental consent.** The current consent screen is a device-local
  record, not verified with a parent. Play's Families policy expects real
  verification. This is the main production blocker.
- **Consent doesn't sync.** `consents` RLS only allows a parent/admin to write,
  so consent is device-local and is re-asked after logout.
- **Cost controls.** Add per-user rate limits on the STT/AI calls before opening
  to a wider audience.
- **Terms of Service.** Not written yet; expected alongside a privacy policy.
