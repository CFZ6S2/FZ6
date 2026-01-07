# Deploy# Script de despliegue automático para Zombie Users
$ErrorActionPreference = "Stop"

# CRITICAL FIX: Unset GOOGLE_APPLICATION_CREDENTIALS if set, as it might point to a missing file
if (Test-Path Env:\GOOGLE_APPLICATION_CREDENTIALS) {
    Write-Host "⚠️  Removing stale GOOGLE_APPLICATION_CREDENTIALS environment variable..." -ForegroundColor Yellow
    Remove-Item Env:\GOOGLE_APPLICATION_CREDENTIALS
}

Write-Host "🚀 Starting Deployment Process..." -ForegroundColor Cyan

# 1. Deploy Cloud Functions
Write-Host "`n📦 Deploying Cloud Functions (cleanupZombieUsers, listZombieUsers)..." -ForegroundColor Yellow
Set-Location "C:\Users\cesar\FZ6"
firebase deploy --only "functions:cleanupZombieUsers,functions:listZombieUsers,functions:apiModerateMessage"

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Functions deployment failed. Stopping." -ForegroundColor Red
    exit
}

# 2. Build Webapp
Write-Host "`n🔨 Building Webapp..." -ForegroundColor Yellow
Set-Location "C:\Users\cesar\FZ6\webapp"
npm run build

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Webapp build failed. Stopping." -ForegroundColor Red
    exit
}

# 3. Deploy Hosting
Write-Host "`n🌐 Deploying Hosting..." -ForegroundColor Yellow
Set-Location "C:\Users\cesar\FZ6"
firebase deploy --only hosting

Write-Host "`n✅ Deployment Complete! You can now use the Zombie Cleanup feature." -ForegroundColor Green
Write-Host "👉 Admin Panel: https://tucitasegura-129cc.web.app/admin.html" -ForegroundColor Cyan
