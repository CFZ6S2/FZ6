# Verificacion simple del deployment
Write-Host "Verificando deployment..." -ForegroundColor Green
Write-Host "Tiempo: $(Get-Date -Format 'HH:mm:ss')" -ForegroundColor Gray

# URLs comunes de Render
$urls = @(
    "https://tucitasegura-api.onrender.com/health",
    "https://t2c06.onrender.com/health",
    "https://tucitasegura-api-main.onrender.com/health"
)

foreach ($url in $urls) {
    Write-Host "Probando: $url" -ForegroundColor White
    try {
        $response = Invoke-RestMethod -Uri $url -Method GET -TimeoutSec 5
        Write-Host "EXITO! Respuesta: $($response.status)" -ForegroundColor Green
        Write-Host "URL funcionando: $url" -ForegroundColor Magenta
        return
    } catch {
        $errorMsg = $_.Exception.Message
        if ($errorMsg -like "*404*") {
            Write-Host "No encontrado (404)" -ForegroundColor Yellow
        } elseif ($errorMsg -like "*503*" -or $errorMsg -like "*502*") {
            Write-Host "Aun desplegando..." -ForegroundColor Yellow
        } else {
            Write-Host "Error: Servicio no disponible" -ForegroundColor Red
        }
    }
}

Write-Host ""
Write-Host "El servicio aun no esta disponible publicamente" -ForegroundColor Yellow
Write-Host "Esto es normal - puede tardar 10-15 minutos el primer deployment" -ForegroundColor Yellow
Write-Host ""
Write-Host "Sigue estos pasos:" -ForegroundColor Cyan
Write-Host "1. Ve a: https://dashboard.render.com" -ForegroundColor White
Write-Host "2. Busca tu servicio" -ForegroundColor White
Write-Host "3. Cuando este en verde, prueba la URL" -ForegroundColor White