# Script de Deployment a Producción - TuCitaSegura
# Ejecutar desde PowerShell en Windows

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  DEPLOYMENT A PRODUCCIÓN - TuCitaSegura" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 1. Verificar que estamos en la rama correcta
Write-Host "[1/6] Verificando rama..." -ForegroundColor Yellow
$branch = git branch --show-current
Write-Host "Rama actual: $branch" -ForegroundColor Green

if ($branch -ne "claude/final-security-fixes-01BjGpKGPPPQ99KhLtREzxiA") {
    Write-Host "⚠️  No estás en la rama correcta" -ForegroundColor Red
    Write-Host "Cambiando a rama correcta..." -ForegroundColor Yellow
    git checkout claude/final-security-fixes-01BjGpKGPPPQ99KhLtREzxiA
}

# 2. Pull de últimos cambios
Write-Host ""
Write-Host "[2/6] Obteniendo últimos cambios..." -ForegroundColor Yellow
git pull origin claude/final-security-fixes-01BjGpKGPPPQ99KhLtREzxiA

# 3. Verificar archivos clave
Write-Host ""
Write-Host "[3/6] Verificando archivos clave..." -ForegroundColor Yellow

# Verificar que firebase-appcheck.js tiene la clave correcta
$appCheckContent = Get-Content "webapp\js\firebase-appcheck.js" | Select-String "6Lc4QBcsAAAAACFZLEgaTz3DuLGiBuXpScrBKt7w"
if ($appCheckContent) {
    Write-Host "✅ firebase-appcheck.js - Clave correcta" -ForegroundColor Green
} else {
    Write-Host "❌ firebase-appcheck.js - Clave incorrecta o no encontrada" -ForegroundColor Red
    exit 1
}

# Verificar que login.html NO tiene firebase-appcheck-disabled.js
$loginContent = Get-Content "webapp\login.html" | Select-String "firebase-appcheck-disabled"
if ($loginContent) {
    Write-Host "❌ login.html - Todavía tiene referencia al archivo viejo" -ForegroundColor Red
    exit 1
} else {
    Write-Host "✅ login.html - Referencia correcta" -ForegroundColor Green
}

# 4. Instalar dependencias de Functions (si es necesario)
Write-Host ""
Write-Host "[4/6] Verificando dependencias de Cloud Functions..." -ForegroundColor Yellow
if (Test-Path "functions\node_modules\@google-cloud\recaptcha-enterprise") {
    Write-Host "✅ Dependencias ya instaladas" -ForegroundColor Green
} else {
    Write-Host "📦 Instalando dependencias..." -ForegroundColor Yellow
    Push-Location functions
    npm install
    Pop-Location
}

# 5. Desplegar a Firebase
Write-Host ""
Write-Host "[5/6] Desplegando a Firebase..." -ForegroundColor Yellow
Write-Host "⚠️  Esto puede tardar 2-5 minutos..." -ForegroundColor Cyan
Write-Host ""

# Desplegar hosting y functions
firebase deploy --only hosting,functions

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✅ DEPLOYMENT EXITOSO" -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "❌ ERROR EN DEPLOYMENT" -ForegroundColor Red
    Write-Host "Revisa los errores arriba" -ForegroundColor Yellow
    exit 1
}

# 6. Verificar deployment
Write-Host ""
Write-Host "[6/6] Verificando deployment..." -ForegroundColor Yellow

Write-Host "Verificando firebase-appcheck.js en producción..." -ForegroundColor Cyan
try {
    $response = Invoke-WebRequest -Uri "https://tucitasegura.com/webapp/js/firebase-appcheck.js" -UseBasicParsing
    if ($response.Content -match "6Lc4QBcsAAAAACFZLEgaTz3DuLGiBuXpScrBKt7w") {
        Write-Host "✅ Clave correcta en producción" -ForegroundColor Green
    } else {
        Write-Host "⚠️  Clave incorrecta en producción - puede ser cache del CDN" -ForegroundColor Yellow
    }
} catch {
    Write-Host "⚠️  No se pudo verificar (puede ser normal)" -ForegroundColor Yellow
}

# Resumen final
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  DEPLOYMENT COMPLETADO" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "✅ Hosting desplegado" -ForegroundColor Green
Write-Host "✅ Cloud Functions desplegadas" -ForegroundColor Green
Write-Host ""
Write-Host "🔗 URLs importantes:" -ForegroundColor Cyan
Write-Host "   • Sitio: https://tucitasegura.com" -ForegroundColor White
Write-Host "   • Login: https://tucitasegura.com/webapp/login.html" -ForegroundColor White
Write-Host "   • Ejemplo reCAPTCHA: https://tucitasegura.com/webapp/example-recaptcha-login.html" -ForegroundColor White
Write-Host ""
Write-Host "⚠️  IMPORTANTE: Limpia el cache del navegador" -ForegroundColor Yellow
Write-Host "   1. Ctrl+Shift+Delete" -ForegroundColor White
Write-Host "   2. Marca: Cookies, Cache" -ForegroundColor White
Write-Host "   3. Periodo: Desde siempre" -ForegroundColor White
Write-Host "   4. Borrar datos" -ForegroundColor White
Write-Host ""
Write-Host "O usa modo incógnito: Ctrl+Shift+N" -ForegroundColor Cyan
Write-Host ""
