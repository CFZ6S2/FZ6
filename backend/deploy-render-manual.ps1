# Deploy TuCitaSegura Backend to Render
# Render deployment is simpler - just connect your GitHub repository

Write-Host "🚀 TuCitaSegura Backend Render Deployment" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Green
Write-Host ""

Write-Host "📋 Render Deployment Steps:" -ForegroundColor Cyan
Write-Host "===========================" -ForegroundColor Cyan
Write-Host ""

Write-Host "1. 🌐 Go to Render Dashboard:" -ForegroundColor Yellow
Write-Host "   https://dashboard.render.com/select-repo" -ForegroundColor Blue
Write-Host ""

Write-Host "2. 🔗 Connect GitHub Repository:" -ForegroundColor Yellow
Write-Host "   - Click 'Connect GitHub'" -ForegroundColor White
Write-Host "   - Select your repository: t2c06" -ForegroundColor White
Write-Host "   - Authorize Render to access your repo" -ForegroundColor White
Write-Host ""

Write-Host "3. ⚙️  Configure Services:" -ForegroundColor Yellow
Write-Host "   Render will auto-detect render.yaml and create 3 services:" -ForegroundColor White
Write-Host "   - tucitasegura-api (FastAPI backend)" -ForegroundColor Green
Write-Host "   - tucitasegura-db (PostgreSQL database)" -ForegroundColor Green
Write-Host "   - tucitasegura-redis (Redis cache)" -ForegroundColor Green
Write-Host ""

Write-Host "4. 🔐 Set Environment Variables:" -ForegroundColor Yellow
Write-Host "   Go to each service → Settings → Environment Variables:" -ForegroundColor White
Write-Host ""

Write-Host "   📱 For tucitasegura-api, set these secrets:" -ForegroundColor Magenta
Write-Host "   - SECRET_KEY: Generate with: python -c 'import secrets; print(secrets.token_urlsafe(32))'" -ForegroundColor White
Write-Host "   - STRIPE_SECRET_KEY: Your Stripe secret key" -ForegroundColor White
Write-Host "   - STRIPE_PUBLISHABLE_KEY: Your Stripe publishable key" -ForegroundColor White
Write-Host "   - STRIPE_WEBHOOK_SECRET: Your Stripe webhook secret" -ForegroundColor White
Write-Host "   - GOOGLE_MAPS_API_KEY: Your Google Maps API key" -ForegroundColor White
Write-Host "   - OPENAI_API_KEY: Your OpenAI API key (optional)" -ForegroundColor White
Write-Host "   - SENTRY_DSN: Your Sentry DSN (optional)" -ForegroundColor White
Write-Host ""

Write-Host "5. 📁 Upload Firebase Service Account:" -ForegroundColor Yellow
Write-Host "   - Download serviceAccountKey.json from Firebase Console" -ForegroundColor White
Write-Host "   - Go to tucitasegura-api → Settings → Files" -ForegroundColor White
Write-Host "   - Upload serviceAccountKey.json" -ForegroundColor White
Write-Host ""

Write-Host "6. 🚀 Deploy:" -ForegroundColor Yellow
Write-Host "   - Click 'Deploy' on each service" -ForegroundColor White
Write-Host "   - Wait for deployment to complete (5-10 minutes)" -ForegroundColor White
Write-Host ""

Write-Host "7. ✅ Verify Deployment:" -ForegroundColor Yellow
Write-Host "   - Check health endpoint: https://your-app.onrender.com/health" -ForegroundColor White
Write-Host "   - Test API endpoints" -ForegroundColor White
Write-Host "   - Check logs in Render dashboard" -ForegroundColor White
Write-Host ""

Write-Host "📊 Render Dashboard:" -ForegroundColor Cyan
Write-Host "https://dashboard.render.com" -ForegroundColor Blue
Write-Host ""

Write-Host "💰 Pricing Information:" -ForegroundColor Yellow
Write-Host "- Starter (Free): $0/month, sleeps after 15 min inactivity" -ForegroundColor Green
Write-Host "- Standard: $7/month, always on" -ForegroundColor Green
Write-Host "- Database: 90 days free, then $7/month" -ForegroundColor Green
Write-Host ""

Write-Host "⚠️  Important Notes:" -ForegroundColor Red
Write-Host "- Your code is already pushed to GitHub ✓" -ForegroundColor Green
Write-Host "- render.yaml is configured ✓" -ForegroundColor Green
Write-Host "- Set production keys in Render dashboard" -ForegroundColor Yellow
Write-Host "- Database and Redis will be auto-created by Render" -ForegroundColor Green
Write-Host ""

Write-Host "🎯 Ready to deploy! Follow the steps above to complete deployment." -ForegroundColor Green
Write-Host ""
Write-Host "Need help? Check the deployment guide:" -ForegroundColor Cyan
Write-Host "https://github.com/tucitasegura/tucitasegura/blob/main/backend/DEPLOYMENT_GUIDE.md" -ForegroundColor Blue