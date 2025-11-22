# Script para verificar el estado actual del deployment
Write-Host "Verificando estado del deployment en Render..." -ForegroundColor Yellow
Write-Host "Tiempo: $(Get-Date -Format 'HH:mm:ss')" -ForegroundColor Gray

# Verificar posibles URLs de tu servicio
$posiblesUrls = @(
    "https://tucitasegura-api.onrender.com",
    "https://t2c06.onrender.com",
    "https://tucitasegura-api-main.onrender.com",
    "https://backend-t2c06.onrender.com"
)

Write-Host "Probando posibles URLs..." -ForegroundColor Cyan

foreach ($url in $posiblesUrls) {
    Write-Host "Probando: $url" -ForegroundColor White -NoNewline
    try {
        $response = Invoke-RestMethod -Uri "$url/health" -Method GET -TimeoutSec 5
        Write-Host " ✅ FUNCIONA!" -ForegroundColor Green
        Write-Host "Respuesta health check: $($response | ConvertTo-Json -Compress)" -ForegroundColor Green
        
        # También probar root endpoint
        try {
            $root = Invoke-RestMethod -Uri $url -Method GET -TimeoutSec 5
            Write-Host "Endpoint root también funciona ✅" -ForegroundColor Green
        } catch {
            Write-Host "Root endpoint no disponible" -ForegroundColor Yellow
        }
        
        Write-Host ""
        Write-Host "🎉 ¡BACKEND DESPLEGADO EXITOSAMENTE!" -ForegroundColor Green -BackgroundColor Black
        Write-Host "URL: $url" -ForegroundColor Magenta
        Write-Host "Health: $url/health" -ForegroundColor Cyan
        exit 0
        
    } catch {
        $statusCode = $_.Exception.Response.StatusCode.value__
        if ($statusCode -eq 404) {
            Write-Host " ❌ No encontrado (404)" -ForegroundColor Red
        } elseif ($statusCode -eq 503 -or $statusCode -eq 502) {
            Write-Host " ⏳ Aún desplegando ($statusCode)" -ForegroundColor Yellow
        } else {
            Write-Host " ❌ Error: $($_.Exception.Message)" -ForegroundColor Red
        }
    }
}

Write-Host ""
Write-Host "El servicio aún no está disponible públicamente." -ForegroundColor Yellow
Write-Host "Esto es normal - el deployment puede tardar 10-15 minutos en total." -ForegroundColor Yellow
Write-Host ""
Write-Host "📋 ¿Qué hacer ahora?" -ForegroundColor Cyan
Write-Host "1. Revisa el dashboard de Render: https://dashboard.render.com" -ForegroundColor White
Write-Host "2. Busca tu servicio y copia la URL exacta" -ForegroundColor White
Write-Host "3. Cuando esté en verde, prueba la URL en tu navegador" -ForegroundColor White
Write-Host ""
Write-Host "⏰ El deployment está en proceso - ¡falta poco!" -ForegroundColor Green