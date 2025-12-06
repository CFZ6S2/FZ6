# Firebase App Check Registration Helper - PowerShell Version
# Script para registrar reCAPTCHA Enterprise con Firebase App Check

Write-Host "🔐 Firebase App Check Registration Helper" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# Project details
$PROJECT_ID = "tuscitasseguras-2d1a6"
<<<<<<< HEAD
$WEB_APP_ID = "1:924208562587:web:5291359426fe390b36213e"
$RECAPTCHA_SITE_KEY = "6LeKWiAsAAAAABCe8YQzXmO_dvBwAhOS-cQh_hzT"
=======
$WEB_APP_ID = "1:180656060538:web:3168487130aa126db663c3"
$RECAPTCHA_SITE_KEY = "6LeKWiAsAAAAABCe8YQzXmO_dvBwAhOS-cQh_hzT"
>>>>>>> c6ecb8b (Fix Dockerfile and opencv for Cloud Run)

Write-Host "📋 Project Information:" -ForegroundColor Yellow
Write-Host "  Project ID: $PROJECT_ID"
Write-Host "  Web App ID: $WEB_APP_ID"
Write-Host "  reCAPTCHA Site Key: $RECAPTCHA_SITE_KEY"
Write-Host ""

Write-Host "📝 Pasos para registrar App Check:" -ForegroundColor Green
Write-Host ""
Write-Host "1. Abre Firebase Console (se abrirá automáticamente)" -ForegroundColor White
Write-Host "2. Busca tu aplicación web en la lista" -ForegroundColor White
Write-Host "3. Haz clic en 'Register' o 'Manage'" -ForegroundColor White
Write-Host "4. Selecciona 'reCAPTCHA Enterprise' como provider" -ForegroundColor White
Write-Host "5. Ingresa el site key:" -ForegroundColor White
Write-Host "   $RECAPTCHA_SITE_KEY" -ForegroundColor Cyan
Write-Host "6. En 'Enforcement mode', selecciona: 'Not enforced'" -ForegroundColor White
Write-Host "7. Guarda la configuración" -ForegroundColor White
Write-Host "8. Espera 2-3 minutos para que los cambios se propaguen" -ForegroundColor White
Write-Host ""

$response = Read-Host "¿Quieres abrir Firebase Console ahora? (S/N)"

if ($response -eq "S" -or $response -eq "s" -or $response -eq "Y" -or $response -eq "y") {
    Write-Host ""
    Write-Host "🌐 Abriendo Firebase Console..." -ForegroundColor Green
    $url = "https://console.firebase.google.com/project/$PROJECT_ID/appcheck"
    Start-Process $url
    Write-Host "✅ Se abrió el navegador" -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "Abre manualmente este URL:" -ForegroundColor Yellow
    Write-Host "https://console.firebase.google.com/project/$PROJECT_ID/appcheck" -ForegroundColor Cyan
}

Write-Host ""
Write-Host "📚 Documentación adicional:" -ForegroundColor Yellow
Write-Host "  - Guía completa: docs/fixing-app-check-403-errors.md"
Write-Host "  - App Check docs: https://firebase.google.com/docs/app-check"
Write-Host ""
Write-Host "✅ Después de registrar en Firebase Console, los errores 403 desaparecerán." -ForegroundColor Green
Write-Host ""
