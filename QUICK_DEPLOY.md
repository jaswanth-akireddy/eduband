# Quick Backend Deployment Guide

## 🚨 SECURITY FIRST

**IMPORTANT:** You've shared API keys publicly. Take these steps immediately:

### 1. Rotate Your Deepgram Key
1. Go to: https://console.deepgram.com
2. Navigate to API Keys
3. Delete the key ending in `...4526`
4. Create a new key
5. Update your `.env` file

### 2. Check Your Supabase Security
1. Go to: https://supabase.com/dashboard/project/hdeswuxnsfesxpnrzoknassembly/settings/api
2. Check if Row Level Security is enabled (it will be after running migrations)

---

## 📋 Your Project Details

**Supabase Project:**
- Project Ref: `hdeswuxnsfesxpnrzoknassembly`
- Dashboard: https://supabase.com/dashboard/project/hdeswuxnsfesxpnrzoknassembly
- Database: https://hdeswuxnsfesxpnrzoknassembly.supabase.co
- Functions: https://hdeswuxnsfesxpnrzoknassembly.functions.supabase.co

**APIs:**
- ✅ Deepgram (STT) - Key available
- ⚠️ Anthropic (LLM) - Need to get key from https://console.anthropic.com

---

## 🚀 Automated Deployment (Recommended)

I've created a deployment script for you:

```bash
cd backend
./SETUP.sh
```

This will:
1. Login to Supabase
2. Link your project
3. Apply all database migrations
4. Set up API keys as secrets
5. Deploy Edge Functions
6. Guide you to get your anon key

**Time:** ~5 minutes

---

## 🔧 Manual Deployment (If You Prefer)

### Prerequisites
```bash
# Install Supabase CLI
npm install -g supabase

# OR with Homebrew
brew install supabase/tap/supabase
```

### Step 1: Login & Link
```bash
cd backend
supabase login
supabase link --project-ref hdeswuxnsfesxpnrzoknassembly
```

### Step 2: Apply Migrations
```bash
supabase db push
```

This creates:
- All database tables
- Row-level security policies
- Audit logging
- Private audio storage

### Step 3: Configure Secrets
```bash
supabase secrets set \
  DEEPGRAM_API_KEY=your_new_key_here \
  ANTHROPIC_API_KEY=your_anthropic_key \
  STT_PROVIDER=deepgram \
  ANTHROPIC_MODEL=claude-3-5-sonnet-latest
```

### Step 4: Deploy Functions
```bash
supabase functions deploy transcribe --no-verify-jwt
supabase functions deploy score --no-verify-jwt
```

### Step 5: Get Anon Key
1. Go to: https://supabase.com/dashboard/project/hdeswuxnsfesxpnrzoknassembly/settings/api
2. Copy the "anon" "public" key
3. Update `.env`:
   ```
   EXPO_PUBLIC_SUPABASE_ANON_KEY=<paste_here>
   ```

---

## 📱 Update the App

### 1. Update .env
Your `.env` file has been created with your project details. You need to add:
- `EXPO_PUBLIC_SUPABASE_ANON_KEY` (from Supabase Dashboard)
- `EXPO_PUBLIC_ANTHROPIC_KEY` (from Anthropic Console)

### 2. Restart Expo
```bash
npx expo start -c
```

The `-c` flag clears the cache so it picks up the new environment variables.

---

## ✅ Verify Deployment

### Check Database
https://supabase.com/dashboard/project/hdeswuxnsfesxpnrzoknassembly/editor

You should see tables:
- institutions
- users
- sessions
- transcripts
- analyses
- consents
- etc.

### Check Functions
https://supabase.com/dashboard/project/hdeswuxnsfesxpnrzoknassembly/functions

You should see:
- transcribe (deployed)
- score (deployed)

### Test in App
1. Open the app
2. Go to Settings → API Keys
3. You should see "backend (https://...)" as the engine
4. Record a test session
5. Check if transcription and scoring work

### Check Logs
https://supabase.com/dashboard/project/hdeswuxnsfesxpnrzoknassembly/logs/edge-functions

Look for function invocations and any errors.

---

## 🏗️ Build APK After Setup

Once backend is deployed and working:

### Option 1: Cloud Build (Recommended)
```bash
eas build -p android --profile preview
```

### Option 2: Include Credentials in Build
Update `eas.json`:
```json
{
  "build": {
    "preview": {
      "distribution": "internal",
      "android": {
        "buildType": "apk"
      },
      "env": {
        "EXPO_PUBLIC_API_BASE": "https://hdeswuxnsfesxpnrzoknassembly.functions.supabase.co",
        "EXPO_PUBLIC_SUPABASE_URL": "https://hdeswuxnsfesxpnrzoknassembly.supabase.co",
        "EXPO_PUBLIC_SUPABASE_ANON_KEY": "your_anon_key"
      }
    }
  }
}
```

Then build:
```bash
eas build -p android --profile preview
```

---

## 🆘 Troubleshooting

### "Cannot read properties of undefined (reading 'stdout')"
- Update EAS CLI: `npm install -g eas-cli@latest`
- Try with npx: `npx eas-cli build -p android --profile preview`

### Functions not deploying
- Check Deno is available: `deno --version`
- Supabase CLI auto-installs Deno if needed
- Check function logs in Supabase Dashboard

### App still using mock mode
- Verify `.env` is in the root directory
- Restart with cache clear: `npx expo start -c`
- Check API Keys screen shows "backend (...)"

### Database migrations fail
- Check you have the correct project ref
- Verify you're logged in: `supabase status`
- Check project status in Supabase Dashboard

---

## 📞 Get Help

If you encounter issues:

1. **Check logs:**
   - Supabase: https://supabase.com/dashboard/project/hdeswuxnsfesxpnrzoknassembly/logs
   - Expo: Check terminal output

2. **Verify configuration:**
   ```bash
   cat .env                    # Check environment variables
   supabase status            # Check Supabase connection
   eas build:list             # Check previous builds
   ```

3. **Common fixes:**
   - Clear Expo cache: `npx expo start -c`
   - Clear npm cache: `npm cache clean --force`
   - Reinstall dependencies: `rm -rf node_modules && npm install`

---

## 🎯 Next Steps After Deployment

1. **Test thoroughly:**
   - Record multiple sessions
   - Check transcription quality
   - Verify scoring accuracy
   - Test different user roles

2. **Set up monitoring:**
   - Enable Supabase log persistence
   - Set up error alerts
   - Monitor API usage

3. **Prepare for production:**
   - Review RLS policies
   - Test consent enforcement
   - Verify audio retention/deletion
   - Load test with multiple users

4. **Teacher Dashboard:**
   - Deploy Next.js app (see PLAN.md)
   - Connect to same Supabase project
   - Implement class management

---

## 💰 Cost Estimates

Based on 100 students, 5-minute recordings, once per week:

- **Supabase:** Free tier covers testing; ~$25/month for production
- **Deepgram:** ~$0.0043/min = ~$8-12/month
- **Anthropic Claude:** ~$15-25/month (depends on prompt size)

**Total:** ~$50-65/month for 100 active students

---

**Need help? Check:**
- Full docs: `backend/DEPLOY.md`
- Backend overview: `backend/README.md`
- Project plan: `PLAN.md`
- Status report: `BACKEND_SETUP_STATUS.md`
