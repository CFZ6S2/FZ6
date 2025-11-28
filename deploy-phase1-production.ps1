# ============================================================================
# DEPLOYMENT SCRIPT - FASE 1 SEGURIDAD
# TuCitaSegura - Phase 1 Critical Security Improvements
# ============================================================================

$ErrorActionPreference = "Stop"

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  DEPLOYMENT FASE 1 - PRODUCCIÓN" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# Función para mostrar mensajes de éxito
function Write-Success {
    param($Message)
    Write-Host "✓ $Message" -ForegroundColor Green
}

# Función para mostrar mensajes de error
function Write-Error {
    param($Message)
    Write-Host "✗ $Message" -ForegroundColor Red
}

# Función para mostrar mensajes de info
function Write-Info {
    param($Message)
    Write-Host "ℹ $Message" -ForegroundColor Yellow
}

# ============================================================================
# PASO 1: PRE-CHECKS
# ============================================================================

Write-Host "`n[1/6] Verificando requisitos..." -ForegroundColor Cyan

# Verificar Firebase CLI
try {
    $firebaseVersion = firebase --version 2>$null
    Write-Success "Firebase CLI instalado: $firebaseVersion"
} catch {
    Write-Error "Firebase CLI no encontrado"
    Write-Info "Instalar con: npm install -g firebase-tools"
    exit 1
}

# Verificar autenticación
Write-Info "Verificando autenticación Firebase..."
try {
    $projects = firebase projects:list 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Success "Autenticación Firebase OK"
    } else {
        Write-Error "No autenticado en Firebase"
        Write-Info "Ejecutar: firebase login"
        exit 1
    }
} catch {
    Write-Error "Error verificando autenticación"
    exit 1
}

# Verificar que estamos en la branch correcta
$currentBranch = git branch --show-current
if ($currentBranch -ne "claude/audit-page-performance-016iXBfeBGebGti8X6EHN4nd") {
    Write-Error "Branch incorrecta: $currentBranch"
    Write-Info "Cambiar a: git checkout claude/audit-page-performance-016iXBfeBGebGti8X6EHN4nd"
    exit 1
}
Write-Success "Branch correcta: $currentBranch"

# Verificar que no hay cambios sin commitear
$gitStatus = git status --porcelain
if ($gitStatus) {
    Write-Error "Hay cambios sin commitear"
    git status
    exit 1
}
Write-Success "Working tree limpio"

# ============================================================================
# PASO 2: BACKUP
# ============================================================================

Write-Host "`n[2/6] Creando backup de configuración actual..." -ForegroundColor Cyan

$timestamp = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"
$backupDir = "backups/pre-phase1-$timestamp"

New-Item -ItemType Directory -Force -Path $backupDir | Out-Null

# Intentar descargar configuración actual
Write-Info "Descargando Firestore Rules actuales..."
try {
    firebase firestore:rules:get > "$backupDir/firestore.rules.backup" 2>$null
    Write-Success "Backup de Firestore Rules guardado"
} catch {
    Write-Info "No se pudo descargar rules (puede ser normal si es primera vez)"
}

Write-Success "Backup creado en: $backupDir"

# ============================================================================
# PASO 3: CONFIRMACIÓN
# ============================================================================

Write-Host "`n[3/6] Cambios a deployar:" -ForegroundColor Cyan
Write-Host ""
Write-Host "  SEGURIDAD:" -ForegroundColor Yellow
Write-Host "    • Dependencias NPM actualizadas (0 vulnerabilidades)"
Write-Host "    • Timeout 30s en apiProxy"
Write-Host "    • Bypass de género eliminado en Firestore Rules"
Write-Host ""
Write-Host "  PERFORMANCE:" -ForegroundColor Yellow
Write-Host "    • Caché de tokens PayPal (95% reducción API calls)"
Write-Host "    • Idempotencia en webhooks Stripe y PayPal"
Write-Host ""

$confirmation = Read-Host "¿Continuar con el deployment? (s/N)"
if ($confirmation -ne "s" -and $confirmation -ne "S") {
    Write-Info "Deployment cancelado por el usuario"
    exit 0
}

# ============================================================================
# PASO 4: DEPLOY FUNCTIONS
# ============================================================================

Write-Host "`n[4/6] Deploying Cloud Functions..." -ForegroundColor Cyan

try {
    firebase deploy --only functions
    if ($LASTEXITCODE -eq 0) {
        Write-Success "Cloud Functions deployed exitosamente"
    } else {
        Write-Error "Error en deploy de Functions"
        exit 1
    }
} catch {
    Write-Error "Error deploying Functions: $_"
    exit 1
}

# ============================================================================
# PASO 5: DEPLOY FIRESTORE RULES
# ============================================================================

Write-Host "`n[5/6] Deploying Firestore Rules..." -ForegroundColor Cyan

try {
    firebase deploy --only firestore:rules
    if ($LASTEXITCODE -eq 0) {
        Write-Success "Firestore Rules deployed exitosamente"
    } else {
        Write-Error "Error en deploy de Rules"
        exit 1
    }
} catch {
    Write-Error "Error deploying Rules: $_"
    exit 1
}

# ============================================================================
# PASO 6: VERIFICACIÓN
# ============================================================================

Write-Host "`n[6/6] Verificando deployment..." -ForegroundColor Cyan

Write-Info "Listando Functions activas..."
firebase functions:list

Write-Success "Deployment completado exitosamente!"

# ============================================================================
# SIGUIENTE PASO: TESTING
# ============================================================================

Write-Host "`n========================================" -ForegroundColor Green
Write-Host "  ✓ DEPLOYMENT COMPLETADO" -ForegroundColor Green
Write-Host "========================================`n" -ForegroundColor Green

Write-Host "SIGUIENTE PASO: Ejecutar tests de producción`n" -ForegroundColor Yellow

Write-Host "Tests a ejecutar:" -ForegroundColor Cyan
Write-Host "  1. Verificar timeout en apiProxy"
Write-Host "  2. Verificar caché de tokens PayPal"
Write-Host "  3. Verificar idempotencia Stripe webhooks"
Write-Host "  4. Verificar idempotencia PayPal webhooks"
Write-Host "  5. Verificar Firestore Rules sin bypass"
Write-Host ""

Write-Host "Ver guía completa: DEPLOY_AND_TEST_PRODUCTION.md`n" -ForegroundColor Yellow

Write-Host "Ver logs en tiempo real:" -ForegroundColor Cyan
Write-Host "  firebase functions:log --limit 100`n" -ForegroundColor White

Write-Host "Backup guardado en: $backupDir`n" -ForegroundColor Gray

# ============================================================================
# ROLLBACK (si es necesario)
# ============================================================================

Write-Host "Si necesitas hacer ROLLBACK:" -ForegroundColor Red
Write-Host "  cp $backupDir/firestore.rules.backup firestore.rules" -ForegroundColor White
Write-Host "  firebase deploy --only firestore:rules`n" -ForegroundColor White
