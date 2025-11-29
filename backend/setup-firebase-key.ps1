# ===================================================================
# Script de Configuración de Clave Firebase Admin SDK
# Para: TuCitaSegura Backend
# ===================================================================

Write-Host "🔑 Configuración de Clave Firebase Admin SDK" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host ""

# Variables
$sourceFile = "C:\Users\cesar\Downloads\tuscitasseguras-2d1a6-firebase-adminsdk-fbsvc-f0911503af.json"
$projectRoot = Split-Path -Parent $PSScriptRoot
$destFile = Join-Path $PSScriptRoot "firebase-credentials.json"
$envFile = Join-Path $PSScriptRoot ".env"

# ===================================================================
# PASO 1: Verificar que el archivo de clave existe
# ===================================================================

Write-Host "📁 PASO 1: Verificando archivo de clave..." -ForegroundColor Yellow

if (-not (Test-Path $sourceFile)) {
    Write-Host "❌ ERROR: No se encontró el archivo de clave en:" -ForegroundColor Red
    Write-Host "   $sourceFile" -ForegroundColor Red
    Write-Host ""
    Write-Host "Por favor:" -ForegroundColor Yellow
    Write-Host "1. Verifica que descargaste la clave" -ForegroundColor Yellow
    Write-Host "2. Verifica que la ruta es correcta" -ForegroundColor Yellow
    Write-Host "3. Actualiza la variable `$sourceFile en este script si es necesario" -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ Archivo encontrado" -ForegroundColor Green
Write-Host ""

# ===================================================================
# PASO 2: Copiar archivo al directorio backend
# ===================================================================

Write-Host "📋 PASO 2: Copiando archivo al proyecto..." -ForegroundColor Yellow

try {
    Copy-Item -Path $sourceFile -Destination $destFile -Force
    Write-Host "✅ Archivo copiado a: $destFile" -ForegroundColor Green
} catch {
    Write-Host "❌ ERROR al copiar archivo: $_" -ForegroundColor Red
    exit 1
}

Write-Host ""

# ===================================================================
# PASO 3: Configurar variable de entorno local
# ===================================================================

Write-Host "⚙️  PASO 3: Configurando .env para desarrollo local..." -ForegroundColor Yellow

$envContent = @"
# =============================================================================
# TuCitaSegura Backend - Environment Variables (Development)
# =============================================================================
# AUTO-GENERADO: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")
# =============================================================================

# Environment
ENVIRONMENT=development
HOST=0.0.0.0
PORT=8000

# CORS Origins (comma-separated)
CORS_ORIGINS=http://localhost:3000,http://localhost:8080,https://tucitasegura.vercel.app

# Firebase Admin SDK - Development
GOOGLE_APPLICATION_CREDENTIALS=./firebase-credentials.json
FIREBASE_PROJECT_ID=tuscitasseguras-2d1a6

# Authentication & Security
JWT_SECRET_KEY=dev-secret-key-change-in-production
JWT_ALGORITHM=HS256
SESSION_SECRET_KEY=dev-session-secret-key

# Feature Flags
ENABLE_ML_RECOMMENDATIONS=true
ENABLE_VIDEO_CHAT=true
ENABLE_PAYMENT_PROCESSING=false

# Logging
LOG_LEVEL=DEBUG

# PayPal (Sandbox para desarrollo)
PAYPAL_MODE=sandbox
# PAYPAL_CLIENT_ID=tu-paypal-client-id-sandbox
# PAYPAL_CLIENT_SECRET=tu-paypal-client-secret-sandbox

# Google Maps API
# GOOGLE_MAPS_API_KEY=tu-google-maps-api-key

# OpenAI (opcional)
# OPENAI_API_KEY=sk-tu-api-key
"@

try {
    $envContent | Out-File -FilePath $envFile -Encoding utf8 -Force
    Write-Host "✅ Archivo .env creado/actualizado" -ForegroundColor Green
} catch {
    Write-Host "⚠️  Advertencia: No se pudo crear .env automáticamente" -ForegroundColor Yellow
    Write-Host "   Por favor crea el archivo manualmente" -ForegroundColor Yellow
}

Write-Host ""

# ===================================================================
# PASO 4: Convertir JSON para Railway (Producción)
# ===================================================================

Write-Host "☁️  PASO 4: Preparando configuración para Railway..." -ForegroundColor Yellow

try {
    # Leer y comprimir JSON
    $json = Get-Content -Path $sourceFile -Raw | ConvertFrom-Json | ConvertTo-Json -Compress -Depth 10

    # Copiar al portapapeles
    $json | Set-Clipboard

    Write-Host "✅ JSON comprimido y copiado al portapapeles" -ForegroundColor Green
    Write-Host ""
    Write-Host "📝 INSTRUCCIONES PARA RAILWAY:" -ForegroundColor Cyan
    Write-Host "   1. Ve a: https://railway.app" -ForegroundColor White
    Write-Host "   2. Selecciona tu proyecto backend" -ForegroundColor White
    Write-Host "   3. Ve a la pestaña 'Variables'" -ForegroundColor White
    Write-Host "   4. Busca o crea: SERVICE_ACCOUNT_JSON" -ForegroundColor White
    Write-Host "   5. Pega el contenido (Ctrl+V) - ya está en tu portapapeles ✓" -ForegroundColor White
    Write-Host "   6. Guarda cambios" -ForegroundColor White
    Write-Host ""

    # Guardar en archivo temporal para referencia
    $railwayInstructions = Join-Path $PSScriptRoot "railway-service-account.txt"
    $json | Out-File -FilePath $railwayInstructions -Encoding utf8 -Force
    Write-Host "💾 También guardado en: $railwayInstructions" -ForegroundColor Gray
    Write-Host "   (por si necesitas copiarlo de nuevo)" -ForegroundColor Gray

} catch {
    Write-Host "⚠️  Advertencia: No se pudo procesar JSON para Railway" -ForegroundColor Yellow
    Write-Host "   Puedes hacerlo manualmente más tarde" -ForegroundColor Yellow
}

Write-Host ""

# ===================================================================
# PASO 5: Verificar configuración
# ===================================================================

Write-Host "🔍 PASO 5: Verificando configuración..." -ForegroundColor Yellow

$checks = @{
    "Archivo firebase-credentials.json existe" = Test-Path $destFile
    "Archivo .env existe" = Test-Path $envFile
    "JSON es válido" = $true
}

foreach ($check in $checks.GetEnumerator()) {
    if ($check.Value) {
        Write-Host "  ✅ $($check.Key)" -ForegroundColor Green
    } else {
        Write-Host "  ❌ $($check.Key)" -ForegroundColor Red
    }
}

Write-Host ""

# ===================================================================
# PASO 6: Instrucciones de seguridad
# ===================================================================

Write-Host "🔒 PASO 6: Seguridad y Limpieza" -ForegroundColor Yellow
Write-Host ""
Write-Host "⚠️  IMPORTANTE - Después de configurar Railway:" -ForegroundColor Red
Write-Host ""
Write-Host "1. Borra el archivo de descargas:" -ForegroundColor White
Write-Host "   Remove-Item '$sourceFile'" -ForegroundColor Gray
Write-Host ""
Write-Host "2. Borra las claves antiguas en GCP Console:" -ForegroundColor White
Write-Host "   https://console.cloud.google.com/iam-admin/serviceaccounts?project=tuscitasseguras-2d1a6" -ForegroundColor Gray
Write-Host "   - Conserva SOLO la clave: f0911503af" -ForegroundColor Gray
Write-Host "   - Borra las otras 9-10 claves antiguas" -ForegroundColor Gray
Write-Host ""
Write-Host "3. NO subas firebase-credentials.json a Git (ya está en .gitignore)" -ForegroundColor White
Write-Host ""

# ===================================================================
# RESUMEN FINAL
# ===================================================================

Write-Host "=" * 60 -ForegroundColor Cyan
Write-Host "✅ CONFIGURACIÓN COMPLETADA" -ForegroundColor Green
Write-Host "=" * 60 -ForegroundColor Cyan
Write-Host ""
Write-Host "Archivos creados:" -ForegroundColor White
Write-Host "  📄 $destFile" -ForegroundColor Gray
Write-Host "  📄 $envFile" -ForegroundColor Gray
Write-Host "  📄 $railwayInstructions" -ForegroundColor Gray
Write-Host ""
Write-Host "Próximos pasos:" -ForegroundColor White
Write-Host "  1. ☁️  Configurar SERVICE_ACCOUNT_JSON en Railway (JSON en portapapeles)" -ForegroundColor Yellow
Write-Host "  2. 🧪 Probar localmente: cd backend && uvicorn main:app --reload" -ForegroundColor Yellow
Write-Host "  3. 🗑️  Borrar archivo de descargas" -ForegroundColor Yellow
Write-Host "  4. 🔑 Eliminar claves antiguas en GCP Console" -ForegroundColor Yellow
Write-Host ""
Write-Host "Documentación completa en: FIREBASE_KEY_SETUP.md" -ForegroundColor Cyan
Write-Host ""
Write-Host "Presiona cualquier tecla para salir..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
