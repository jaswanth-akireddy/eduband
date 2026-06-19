# EduBand Backend — Deploy Guide

Step-by-step to stand up the secure backend. ~20 minutes.

## 0. Accounts you need
- **Supabase** account (free tier ok) — https://supabase.com
- **Deepgram** (or AssemblyAI) API key — https://deepgram.com
- **Anthropic** API key — https://console.anthropic.com

## 1. Install the CLI
```bash
brew install supabase/tap/supabase   # or: npm i -g supabase
supabase --version
```

## 2. Create & link a project
1. Create a new project in the Supabase dashboard. Note the **Project Ref**
   (looks like `abcdefghijklmnop`) and your DB password.
2. From this `backend/` folder:
```bash
supabase login
supabase link --project-ref YOUR_PROJECT_REF
```

## 3. Apply the database schema (migrations)
```bash
supabase db push
```
This runs, in order:
- `0001_init.sql` — tables, types, indexes
- `0002_rls.sql` — row-level security (deny-by-default)
- `0003_audit.sql` — audit log + consent enforcement trigger
- `0004_storage.sql` — private audio bucket + retention helper

## 4. Set function secrets (keys live here, never in the app)
```bash
supabase secrets set \
  DEEPGRAM_API_KEY=dg_xxx \
  ANTHROPIC_API_KEY=sk-ant-xxx \
  STT_PROVIDER=deepgram \
  ANTHROPIC_MODEL=claude-3-5-sonnet-latest \
  ALLOWED_ORIGINS=https://yourapp.example,http://localhost:8081
```
`SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` are provided
to functions automatically by the platform.

## 5. Deploy the Edge Functions
```bash
supabase functions deploy transcribe
supabase functions deploy score
```
Your function base URL will be:
```
https://YOUR_PROJECT_REF.functions.supabase.co
```

## 6. Point the app at the backend
In the app's **API Keys** screen:
- Set **Backend proxy URL** = `https://YOUR_PROJECT_REF.functions.supabase.co`
- Leave the direct Deepgram/Anthropic keys **blank** (the server holds them).

The app will now call `…/transcribe` and `…/score`; keys never touch the device.

## 7. Verify
- Sign up a test user, create a profile row (role=student), add a consent row.
- Record a session → it should transcribe + score via the functions.
- Check **Table Editor → audit_log** to confirm writes are being recorded.
- Try reading another user's session via the API → should be denied by RLS.

## Notes
- **Auth**: the app must send the user's Supabase JWT as `Authorization: Bearer …`.
  Wiring Supabase Auth into the client is the next client task (see plan).
- **Retention**: schedule `purge_old_audio()` (pg_cron) or call it from a cron
  Edge Function to delete raw audio after analysis.
- **Least privilege**: functions use the caller's JWT for reads; the service-role
  key is only used for privileged writes after authorisation checks.
