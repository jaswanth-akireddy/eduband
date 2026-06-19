#!/bin/bash
# EduBand Backend Deployment Script
# This script will guide you through deploying the backend to Supabase

set -e  # Exit on error

PROJECT_REF="hdeswuxnsfesxpnrzokn"
DEEPGRAM_KEY="6443b05995d06286eefe97a4e2515aa494654526"

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║          EduBand Backend Deployment to Supabase                ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI not found."
    echo ""
    echo "Please install it first:"
    echo "  brew install supabase/tap/supabase"
    echo "  OR"
    echo "  npm install -g supabase"
    exit 1
fi

echo "✅ Supabase CLI found: $(supabase --version)"
echo ""

# Step 1: Login
echo "────────────────────────────────────────────────────────────────"
echo "Step 1: Login to Supabase"
echo "────────────────────────────────────────────────────────────────"
read -p "Press Enter to login (browser will open)..." 
supabase login
echo "✅ Logged in"
echo ""

# Step 2: Link Project
echo "────────────────────────────────────────────────────────────────"
echo "Step 2: Link to your Supabase project"
echo "────────────────────────────────────────────────────────────────"
echo "Project Ref: $PROJECT_REF"
read -p "Press Enter to link..." 
supabase link --project-ref "$PROJECT_REF"
echo "✅ Project linked"
echo ""

# Step 3: Apply Migrations
echo "────────────────────────────────────────────────────────────────"
echo "Step 3: Apply database migrations"
echo "────────────────────────────────────────────────────────────────"
echo "This will create all tables, RLS policies, audit logs, and storage."
read -p "Press Enter to apply migrations..." 
supabase db push
echo "✅ Migrations applied"
echo ""

# Step 4: Get API Key
echo "────────────────────────────────────────────────────────────────"
echo "Step 4: Configure API Keys"
echo "────────────────────────────────────────────────────────────────"
echo "Choose your LLM provider:"
echo "  1) Gemini (Google AI) - FREE tier, good performance"
echo "  2) Claude (Anthropic) - Premium, best quality"
echo ""
read -p "Enter choice (1 or 2): " LLM_CHOICE

if [ "$LLM_CHOICE" = "1" ]; then
    echo ""
    echo "Get your Gemini API key from: https://aistudio.google.com/app/apikey"
    echo "(It's free with generous limits!)"
    echo ""
    read -p "Enter your Gemini API key: " GEMINI_KEY
    
    if [ -z "$GEMINI_KEY" ]; then
        echo "⚠️  No key entered. You can set it later with:"
        echo "   supabase secrets set GEMINI_API_KEY=your_key LLM_PROVIDER=gemini"
    else
        echo ""
        echo "Setting secrets (API keys will be stored server-side)..."
        supabase secrets set \
            DEEPGRAM_API_KEY="$DEEPGRAM_KEY" \
            GEMINI_API_KEY="$GEMINI_KEY" \
            LLM_PROVIDER=gemini \
            GEMINI_MODEL=gemini-1.5-flash \
            STT_PROVIDER=deepgram
        echo "✅ Secrets configured with Gemini"
    fi
else
    echo ""
    echo "Get your Anthropic API key from: https://console.anthropic.com"
    echo ""
    read -p "Enter your Anthropic API key: " ANTHROPIC_KEY
    
    if [ -z "$ANTHROPIC_KEY" ]; then
        echo "⚠️  No key entered. You can set it later with:"
        echo "   supabase secrets set ANTHROPIC_API_KEY=your_key LLM_PROVIDER=claude"
    else
        echo ""
        echo "Setting secrets (API keys will be stored server-side)..."
        supabase secrets set \
            DEEPGRAM_API_KEY="$DEEPGRAM_KEY" \
            ANTHROPIC_API_KEY="$ANTHROPIC_KEY" \
            LLM_PROVIDER=claude \
            ANTHROPIC_MODEL=claude-3-5-sonnet-latest \
            STT_PROVIDER=deepgram
        echo "✅ Secrets configured with Claude"
    fi
fi
echo ""

# Step 5: Deploy Edge Functions
echo "────────────────────────────────────────────────────────────────"
echo "Step 5: Deploy Edge Functions"
echo "────────────────────────────────────────────────────────────────"
read -p "Press Enter to deploy functions..." 

echo "Deploying transcribe function..."
supabase functions deploy transcribe --no-verify-jwt

echo "Deploying score function..."
supabase functions deploy score --no-verify-jwt

echo "✅ Functions deployed"
echo ""

# Step 6: Get Supabase Keys
echo "────────────────────────────────────────────────────────────────"
echo "Step 6: Get Supabase Keys"
echo "────────────────────────────────────────────────────────────────"
echo "Go to: https://supabase.com/dashboard/project/$PROJECT_REF/settings/api"
echo ""
echo "Copy the 'anon' 'public' key and update your .env file:"
echo "  EXPO_PUBLIC_SUPABASE_ANON_KEY=<paste_here>"
echo ""
read -p "Press Enter when done..."

# Step 7: Test
echo ""
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║                    Deployment Complete! 🎉                     ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""
echo "Your backend is now live at:"
echo "  Database: https://$PROJECT_REF.supabase.co"
echo "  Functions: https://$PROJECT_REF.functions.supabase.co"
echo ""
echo "Next Steps:"
echo "  1. Update .env with your EXPO_PUBLIC_SUPABASE_ANON_KEY"
echo "  2. Restart Expo: npx expo start -c"
echo "  3. Test recording → transcription → scoring"
echo ""
echo "To verify deployment:"
echo "  - Check tables: https://supabase.com/dashboard/project/$PROJECT_REF/editor"
echo "  - Check functions: https://supabase.com/dashboard/project/$PROJECT_REF/functions"
echo "  - Check logs: https://supabase.com/dashboard/project/$PROJECT_REF/logs/edge-functions"
echo ""
