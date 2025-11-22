# Deploy TuCitaSegura Backend to Railway
# Manual deployment instructions since Railway CLI has authentication issues in this environment

Write-Host "🚀 TuCitaSegura Backend Railway Deployment" -ForegroundColor Green
Write-Host "=========================================" -ForegroundColor Green
Write-Host ""

# Check if Railway CLI is available
try {
    $railwayVersion = railway --version 2>$null
    Write-Host "✅ Railway CLI found: $railwayVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Railway CLI not found. Please install it first:" -ForegroundColor Red
    Write-Host "   npm install -g @railway/cli" -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "📋 Manual Deployment Steps:" -ForegroundColor Cyan
Write-Host "============================" -ForegroundColor Cyan
Write-Host ""

Write-Host "1. 🔑 Login to Railway:" -ForegroundColor Yellow
Write-Host "   railway login" -ForegroundColor White
Write-Host "   (This will open a browser for authentication)" -ForegroundColor Gray
Write-Host ""

Write-Host "2. 📝 Create/Link Railway Project:" -ForegroundColor Yellow
Write-Host "   railway init" -ForegroundColor White
Write-Host "   OR" -ForegroundColor Gray
Write-Host "   railway link" -ForegroundColor White
Write-Host "   (To link to existing project)" -ForegroundColor Gray
Write-Host ""

Write-Host "3. 📦 Set Environment Variables:" -ForegroundColor Yellow
Write-Host "   railway variables set ENVIRONMENT=production" -ForegroundColor White
Write-Host "   railway variables set DEBUG=false" -ForegroundColor White
Write-Host "   railway variables set API_WORKERS=4" -ForegroundColor White
Write-Host "   railway variables set PYTHON_VERSION=3.11.0" -ForegroundColor White
Write-Host ""

Write-Host "4. 🔐 Set Secret Environment Variables:" -ForegroundColor Yellow
Write-Host "   railway variables set SECRET_KEY=your-secret-key-here" -ForegroundColor White
Write-Host "   railway variables set FIREBASE_PROJECT_ID=tuscitasseguras-2d1a6" -ForegroundColor White
Write-Host "   railway variables set STRIPE_SECRET_KEY=your-stripe-key" -ForegroundColor White
Write-Host "   railway variables set STRIPE_PUBLISHABLE_KEY=your-stripe-publishable-key" -ForegroundColor White
Write-Host "   railway variables set GOOGLE_MAPS_API_KEY=your-google-maps-key" -ForegroundColor White
Write-Host ""

Write-Host "5. 📁 Upload Firebase Service Account:" -ForegroundColor Yellow
Write-Host "   - Download serviceAccountKey.json from Firebase Console" -ForegroundColor White
Write-Host "   - Upload to Railway as secret file" -ForegroundColor White
Write-Host "   - Path should be: ./serviceAccountKey.json" -ForegroundColor White
Write-Host ""

Write-Host "6. 🚀 Deploy:" -ForegroundColor Yellow
Write-Host "   railway up" -ForegroundColor White
Write-Host ""

Write-Host "7. 📊 Monitor Deployment:" -ForegroundColor Yellow
Write-Host "   railway logs" -ForegroundColor White
Write-Host "   railway open" -ForegroundColor White
Write-Host ""

Write-Host "8. ✅ Verify Deployment:" -ForegroundColor Yellow
Write-Host "   - Check health endpoint: https://your-app.railway.app/health" -ForegroundColor White
Write-Host "   - Test API endpoints" -ForegroundColor White
Write-Host ""

Write-Host "📝 Configuration Files Created:" -ForegroundColor Green
Write-Host "- railway.toml (Railway configuration)" -ForegroundColor White
Write-Host "- .env (Environment variables template)" -ForegroundColor White
Write-Host ""

Write-Host "⚠️  Important Notes:" -ForegroundColor Red
Write-Host "- Set STRIPE_SECRET_KEY in Railway Dashboard (production key)" -ForegroundColor Yellow
Write-Host "- Set GOOGLE_MAPS_API_KEY in Railway Dashboard" -ForegroundColor Yellow
Write-Host "- Upload serviceAccountKey.json as secret file" -ForegroundColor Yellow
Write-Host "- Use strong SECRET_KEY (generate with: python -c 'import secrets; print(secrets.token_urlsafe(32))')" -ForegroundColor Yellow
Write-Host ""

Write-Host "🌐 Railway Dashboard:" -ForegroundColor Cyan
Write-Host "https://railway.app/dashboard" -ForegroundColor Blue
Write-Host ""

Write-Host "✅ Ready to deploy! Follow the steps above to complete deployment." -ForegroundColor Green