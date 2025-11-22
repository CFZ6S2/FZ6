#!/bin/bash
# ==============================================================================
# Deploy TuCitaSegura Backend to Render
# ==============================================================================

set -e  # Exit on error

echo "🚀 Deploying TuCitaSegura Backend to Render..."

# Check if render.yaml exists
if [ ! -f "render.yaml" ]; then
    echo "❌ render.yaml not found in backend directory"
    exit 1
fi

echo "📋 Deployment steps for Render:"
echo ""
echo "1. Push code to GitHub:"
echo "   git add ."
echo "   git commit -m 'Deploy to Render'"
echo "   git push origin main"
echo ""
echo "2. Connect to Render:"
echo "   - Go to: https://dashboard.render.com/select-repo"
echo "   - Select your repository"
echo "   - Render will auto-detect render.yaml"
echo ""
echo "3. Set environment variables in Render Dashboard:"
echo "   - SECRET_KEY"
echo "   - STRIPE_SECRET_KEY"
echo "   - STRIPE_PUBLISHABLE_KEY"
echo "   - STRIPE_WEBHOOK_SECRET"
echo "   - GOOGLE_MAPS_API_KEY"
echo "   - FIREBASE_PROJECT_ID"
echo ""
echo "4. Upload Firebase service account:"
echo "   - Go to service settings → Environment"
echo "   - Add secret file: serviceAccountKey.json"
echo ""
echo "5. Wait for deployment (usually 5-10 minutes)"
echo ""
echo "6. Test your API:"
echo "   curl https://tucitasegura-api.onrender.com/health"
echo ""
echo "📚 Documentation: https://render.com/docs/deploy-fastapi"

# Optional: Auto-commit and push
read -p "Do you want to commit and push now? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    git add .
    git commit -m "Deploy backend to Render"
    git push origin main
    echo "✅ Code pushed! Check Render dashboard for deployment status."
fi
