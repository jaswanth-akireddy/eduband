# Using Gemini Instead of Claude

✅ **Good news!** I've added full Gemini support to your app. Gemini is Google's AI and offers:
- **FREE tier** with generous limits (1500 requests/day)
- Fast performance with `gemini-1.5-flash`
- Good quality for educational use
- No credit card required to start

---

## 🚀 Quick Setup

### 1. Get Your Gemini API Key (FREE)

1. Go to: **https://aistudio.google.com/app/apikey**
2. Click "Create API Key"
3. Copy the key (starts with `AIza...`)

### 2. Configure for Testing (Direct Mode)

Update your `.env` file:

```bash
# LLM Provider: Use Gemini
EXPO_PUBLIC_LLM_PROVIDER=gemini
EXPO_PUBLIC_GEMINI_KEY=AIzaSy...your_key_here
EXPO_PUBLIC_GEMINI_MODEL=gemini-1.5-flash
```

Then restart Expo:
```bash
npx expo start -c
```

The app will now use Gemini for scoring!

### 3. Configure for Production (Backend Mode)

When deploying to Supabase, set these secrets:

```bash
supabase secrets set \
  GEMINI_API_KEY=AIzaSy...your_key \
  LLM_PROVIDER=gemini \
  GEMINI_MODEL=gemini-1.5-flash \
  DEEPGRAM_API_KEY=your_deepgram_key \
  STT_PROVIDER=deepgram
```

Or use the automated script (it will ask which provider you want):
```bash
cd backend
./SETUP.sh
```

---

## 📊 Gemini vs Claude Comparison

| Feature | Gemini 1.5 Flash | Claude 3.5 Sonnet |
|---------|------------------|-------------------|
| **Cost** | FREE (1500 req/day) | ~$3-5 per 1M tokens |
| **Speed** | Very fast | Fast |
| **Quality** | Good | Excellent |
| **Context** | 1M tokens | 200k tokens |
| **Best for** | Testing, small schools | Production, large scale |
| **Free tier** | ✅ Yes | ❌ No (paid only) |

**Recommendation:** Start with Gemini for testing and early pilots. Switch to Claude if you need maximum quality for production.

---

## 🔧 Technical Details

### Files Modified

I've updated these files to support Gemini:

1. **`src/config.ts`** - Added LLM provider configuration
2. **`src/analysis/llmScoring.ts`** - Added `callGemini()` function
3. **`backend/supabase/functions/score/index.ts`** - Backend now supports both providers
4. **`.env`** - Added Gemini configuration
5. **`backend/SETUP.sh`** - Deployment script asks which provider to use

### How It Works

**Client-side (Direct Mode):**
```typescript
// In src/analysis/llmScoring.ts
if (config.llmProvider === 'gemini' && config.geminiKey) {
  const result = await callGemini(transcript, metrics, level);
}
```

**Server-side (Backend Mode):**
```typescript
// In backend/supabase/functions/score/index.ts
const LLM_PROVIDER = Deno.env.get('LLM_PROVIDER') ?? 'gemini';
const result = LLM_PROVIDER === 'claude' 
  ? await callClaude(text, body)
  : await callGemini(text, body);
```

### API Endpoints

**Gemini API:**
```
https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent
```

**Request format:**
```json
{
  "contents": [{
    "parts": [{"text": "your prompt here"}]
  }],
  "generationConfig": {
    "temperature": 0.7,
    "maxOutputTokens": 1024
  }
}
```

---

## 🎯 Usage Modes

### Mode 1: Testing with Direct Gemini (No Backend)

**Setup:**
```bash
# .env file
EXPO_PUBLIC_LLM_PROVIDER=gemini
EXPO_PUBLIC_GEMINI_KEY=your_key
EXPO_PUBLIC_DEEPGRAM_KEY=your_key
EXPO_PUBLIC_STT_PROVIDER=deepgram
```

**Result:** App calls Gemini directly from the device (keys visible in app).
**Use for:** Local testing, development

### Mode 2: Production with Backend Proxy (Recommended)

**Setup:**
```bash
# .env file
EXPO_PUBLIC_API_BASE=https://hdeswuxnsfesxpnrzokn.functions.supabase.co
EXPO_PUBLIC_SUPABASE_URL=https://hdeswuxnsfesxpnrzokn.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_anon_key

# Supabase secrets (server-side)
supabase secrets set \
  GEMINI_API_KEY=your_key \
  LLM_PROVIDER=gemini \
  DEEPGRAM_API_KEY=your_key
```

**Result:** App calls your backend, backend calls Gemini (keys secure on server).
**Use for:** Production, real students

### Mode 3: Mock (No API Keys)

**Setup:** Leave all keys empty in `.env`

**Result:** App uses built-in mock scoring (rules-based).
**Use for:** UI testing, no internet

---

## 💰 Cost Estimates

### Gemini Pricing

**Free Tier:**
- 1,500 requests per day
- 1 million tokens per request
- No credit card required

**Paid Tier** (if you exceed free limits):
- Gemini 1.5 Flash: $0.075 per 1M input tokens
- $0.30 per 1M output tokens

**Example:** 100 students, 5-minute recordings, once per week:
- ~400 requests/month
- **Cost: $0** (within free tier)
- If paid: ~$2-3/month

### Full Stack Cost (with Gemini)

For 100 active students:
- **Supabase:** Free tier or ~$25/month
- **Deepgram:** ~$8-12/month (STT)
- **Gemini:** $0 (free tier)
- **Total:** ~$8-37/month

Compare to Claude:
- **Supabase:** ~$25/month
- **Deepgram:** ~$8-12/month
- **Claude:** ~$15-25/month
- **Total:** ~$48-62/month

**Savings with Gemini: ~$15-25/month**

---

## ✅ Testing Gemini

### 1. Test Direct Mode

```bash
# Update .env
EXPO_PUBLIC_LLM_PROVIDER=gemini
EXPO_PUBLIC_GEMINI_KEY=AIza...

# Restart app
npx expo start -c
```

### 2. Record Test Session

1. Open app
2. Go to Practice
3. Record a short speech
4. Check the report

### 3. Verify It's Using Gemini

Check the report screen - it should show:
- Model version: `gemini-1.5-flash`
- Scores for language, structure, confidence
- Evidence snippets and tips

### 4. Check API Keys Screen

Go to Settings → API Keys, you should see:
```
Engine: direct · stt=deepgram, scoring=gemini
```

---

## 🔄 Switching Between Providers

You can switch anytime by changing the configuration:

### Switch to Gemini:
```bash
# .env
EXPO_PUBLIC_LLM_PROVIDER=gemini
EXPO_PUBLIC_GEMINI_KEY=your_gemini_key

# Backend (if using)
supabase secrets set LLM_PROVIDER=gemini GEMINI_API_KEY=your_key
```

### Switch to Claude:
```bash
# .env
EXPO_PUBLIC_LLM_PROVIDER=claude
EXPO_PUBLIC_ANTHROPIC_KEY=your_claude_key

# Backend (if using)
supabase secrets set LLM_PROVIDER=claude ANTHROPIC_API_KEY=your_key
```

Then restart:
```bash
npx expo start -c
```

---

## 🆘 Troubleshooting

### Error: "Gemini error 400"
- Check your API key is correct
- Verify key is enabled at https://aistudio.google.com/app/apikey
- Make sure you've set `EXPO_PUBLIC_LLM_PROVIDER=gemini`

### Error: "Rate limit exceeded"
- Free tier: 1500 requests/day
- Wait 24 hours or upgrade to paid tier
- Or switch to Claude temporarily

### App still shows "mock" mode
- Verify `.env` file exists in project root
- Restart with cache clear: `npx expo start -c`
- Check Settings → API Keys screen shows your configuration

### Backend not using Gemini
- Check secrets: `supabase secrets list`
- Make sure `LLM_PROVIDER=gemini` is set
- Redeploy function: `supabase functions deploy score`

---

## 📚 Additional Resources

- **Gemini API Docs:** https://ai.google.dev/docs
- **Get API Key:** https://aistudio.google.com/app/apikey
- **Pricing:** https://ai.google.dev/pricing
- **Models:** https://ai.google.dev/models/gemini

---

## ✨ Summary

✅ **You can now use Gemini for FREE!**

**Quick Start:**
1. Get key: https://aistudio.google.com/app/apikey
2. Add to `.env`: `EXPO_PUBLIC_GEMINI_KEY=your_key`
3. Set provider: `EXPO_PUBLIC_LLM_PROVIDER=gemini`
4. Restart: `npx expo start -c`

**For Production:**
```bash
cd backend
./SETUP.sh  # Choose option 1 (Gemini) when asked
```

**Need help?** Check `QUICK_DEPLOY.md` for full deployment guide.
