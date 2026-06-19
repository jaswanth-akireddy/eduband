# EduBand Backend (Supabase)

Production-grade backend: Postgres + Auth + Storage + Edge Functions, built to
the standards required for handling minors' data (DPDP-aligned).

## What's here

```
backend/
  supabase/
    config.toml                  Supabase project config
    migrations/                  Versioned SQL schema (run in order)
      0001_init.sql              Tables, types, indexes
      0002_rls.sql               Row-level security policies (deny-by-default)
      0003_audit.sql             Audit logging + triggers
      0004_storage.sql           Private audio bucket + access policies
    functions/
      _shared/                   Shared helpers (auth, cors, validation)
      transcribe/                STT proxy (keys server-side)
      score/                     Claude scoring proxy (keys server-side)
      analyze/                   Full pipeline orchestrator
```

## Security model (high standards)

- **Deny-by-default RLS** on every table. No row is readable/writable unless a
  policy explicitly allows it.
- **Role-scoped access**: students see only themselves; teachers see only their
  classes; parents see only linked children; admins see only their institution.
- **Consent enforced in the database**: a DB trigger blocks creating a student
  speaking session unless an active consent row exists.
- **Keys never on the client**: STT + Anthropic keys live in Edge Function
  secrets. The app calls the functions, never the providers directly.
- **Audit log**: every read/write to student data is recorded with actor + time.
- **Private storage**: audio bucket is private; access via short-lived signed
  URLs only. Raw audio auto-deletion job included.
- **Input validation** on all function inputs; size and rate limits.

## One-time setup

1. Install the CLI: `npm i -g supabase` (or `brew install supabase/tap/supabase`).
2. Create a project at https://supabase.com (free tier is fine to start).
3. From `backend/`:
   ```bash
   supabase login
   supabase link --project-ref YOUR_PROJECT_REF
   supabase db push                      # applies all migrations
   supabase secrets set DEEPGRAM_API_KEY=... ANTHROPIC_API_KEY=...
   supabase functions deploy transcribe score analyze
   ```
4. In the app's API Keys screen, set the **Backend proxy URL** to:
   `https://YOUR_PROJECT_REF.functions.supabase.co`
   (Leave the direct keys blank — the server holds them now.)

See `DEPLOY.md` for the full step-by-step.
