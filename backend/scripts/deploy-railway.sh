#!/bin/bash
# ==============================================================================
# Deploy TuCitaSegura Backend to Railway
# ==============================================================================

set -e  # Exit on error

echo "🚀 Deploying TuCitaSegura Backend to Railway..."

# Check if Railway CLI is installed
if ! command -v railway &> /dev/null; then
    echo "❌ Railway CLI not found. Installing..."
    npm install -g @railway/cli
fi

# Check if logged in
if ! railway whoami &> /dev/null; then
    echo "🔑 Please login to Railway:"
    railway login
fi

# Check if project is linked
if [ ! -f ".railway/railway.toml" ]; then
    echo "🔗 Linking to Railway project..."
    railway link
fi

# Load environment variables
if [ -f ".env" ]; then
    echo "📦 Loading environment variables from .env..."
    railway variables set $(cat .env | grep -v '^#' | grep -v '^$' | xargs)
else
    echo "⚠️  No .env file found. Make sure to set environment variables in Railway dashboard."
fi

# Upload Firebase service account key
# Instead of uploading the JSON file directly, encode it and set as an environment variable
# so it can be provided securely via Railway variables: FIREBASE_SERVICE_ACCOUNT_B64
if [ -f "serviceAccountKey.json" ]; then
    echo "🔑 Setting FIREBASE_SERVICE_ACCOUNT_B64 in Railway variables (base64 encoded)..."
    # base64 -w 0 (Linux) or base64 (macOS) - remove newlines for portability
    if command -v base64 >/dev/null 2>&1; then
        B64=$(base64 -w 0 serviceAccountKey.json 2>/dev/null || base64 serviceAccountKey.json)
    else
        echo "⚠️  base64 command not found on this machine. Please install coreutils or set FIREBASE_SERVICE_ACCOUNT_B64 manually."
        B64=""
    fi
    if [ -n "$B64" ]; then
        echo "🔐 Setting FIREBASE_SERVICE_ACCOUNT_B64..."
        railway variables set FIREBASE_SERVICE_ACCOUNT_B64 "$B64"
        echo "✅ FIREBASE_SERVICE_ACCOUNT_B64 set. Note: this value is sensitive and stored in Railway variables."
    else
        echo "⚠️  Could not base64-encode serviceAccountKey.json. Upload manually in Railway Dashboard."
    fi
else
    echo "⚠️  serviceAccountKey.json not found. Configure FIREBASE_SERVICE_ACCOUNT_B64 in Railway Dashboard or upload manually."
fi

# Deploy
echo "🚢 Deploying to Railway..."
railway up --service backend

echo "✅ Deployment initiated!"
echo "📊 View logs: railway logs --service backend"
echo "🌐 Open app: railway open --service backend"
echo ""
echo "Next steps:"
echo "1. Check deployment status in Railway dashboard"
echo "2. Verify health endpoint: https://your-app.railway.app/health"
echo "3. Configure custom domain (optional)"
