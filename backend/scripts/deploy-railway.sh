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
if [ -f "serviceAccountKey.json" ]; then
    echo "🔑 Uploading Firebase service account key..."
    railway run --service backend "cat > serviceAccountKey.json" < serviceAccountKey.json
else
    echo "⚠️  serviceAccountKey.json not found. Upload manually to Railway."
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
