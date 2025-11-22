# Script para verificar que el backend esté funcionando
Write-Host "Verificando estado del backend en Render..." -ForegroundColor Yellow

# URL base (necesitarás reemplazarla con tu URL real de Render)
$renderUrl = "https://tucitasegura-api.onrender.com"

Write-Host "Probando endpoint de health..." -ForegroundColor Cyan

try {
    # Verificar endpoint de health
    $healthResponse = Invoke-RestMethod -Uri "$renderUrl/health" -Method GET -TimeoutSec 10
    Write-Host "✅ Health check exitoso!" -ForegroundColor Green
    Write-Host "Respuesta: $($healthResponse | ConvertTo-Json -Compress)" -ForegroundColor White
} catch {
    Write-Host "❌ Health check falló" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "Probando endpoint raíz..." -ForegroundColor Cyan

try {
    # Verificar endpoint raíz
    $rootResponse = Invoke-RestMethod -Uri "$renderUrl/" -Method GET -TimeoutSec 10
    Write-Host "✅ Endpoint raíz funciona!" -ForegroundColor Green
} catch {
    Write-Host "❌ Endpoint raíz falló" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "Verificación completada!" -ForegroundColor Yellow
Write-Host ""
Write-Host "Para ver los logs completos de Render:" -ForegroundColor Magenta
Write-Host "1. Ve a: https://dashboard.render.com" -ForegroundColor White
Write-Host "2. Busca tu servicio: tucitasegura-api" -ForegroundColor White
Write-Host "3. Ve a la pestaña: Logs" -ForegroundColor White
Write-Host ""
Write-Host "Tu URL debería ser similar a: $renderUrl" -ForegroundColor Cyan