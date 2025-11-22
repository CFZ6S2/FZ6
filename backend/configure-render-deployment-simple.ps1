# Script para configurar el deployment en Render
Write-Host "Preparando configuracion para Render deployment..." -ForegroundColor Green

# Crear archivo de configuracion con todas las variables
$configContent = @"
# Configuracion de Render Deployment
# Fecha: $(Get-Date)

## Variables de Entorno para Render:

SECRET_KEY=g79Aa-XCHKU5zr7Du2t8ZGm9TFKuUwAHjzJeUMRQxp4

STRIPE_PUBLIC_KEY=pk_test_51R31JLHdpQPdr46sBrwaHhZctgmhyHsVKwVIM8lnf2bwrHzjGnUwlCIuI9YzgdRZoKTWQ7WYWNmU3WD5DqAbN42p0001gnrQMH
STRIPE_SECRET_KEY=sk_test_51R31JLHdpQPdr46s2BWNG2zQMhhuSzmVprC24atBQ6eZPDTPHIcJawwy0aJTsEOVzpSD7BffNOG9Kpcu3jAcRV7G008Qxd6nU4
STRIPE_WEBHOOK_SECRET=rk_test_51R31JLHdpQPdr46sBSNnbQcm8IGMiaGwkPS5PsWDdHscsF2B2xVFMPpMIzr3i5ABzlnWNOwDmZbqrKDH92PzIjb700BgiGxDz0

GOOGLE_MAPS_API_KEY=AIzaSyAb8RN6I6FQgaC1SltCBdMTyt6mM49BUATqwB32I7g5crKb91Vg

OPENAI_API_KEY=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

FIREBASE_PROJECT_ID=tuscitasseguras-2d1a6

ENVIRONMENT=production
DEBUG=false
API_WORKERS=4
DATABASE_POOL_SIZE=20
CORS_ORIGINS=https://tucitasegura.com,https://www.tucitasegura.com
"@

# Guardar configuracion
$configContent | Out-File -FilePath "render-config.txt" -Encoding UTF8
Write-Host "Configuracion guardada en render-config.txt" -ForegroundColor Green

# Preparar archivo de credenciales de Firebase
try {
    $firebaseCredentials = Get-Content -Path "C:\Users\cesar\Downloads\tuscitasseguras-2d1a6-firebase-adminsdk-fbsvc-fb73f633c9.json" -Raw
    $firebaseCredentials | Out-File -FilePath "firebase-credentials.json" -Encoding UTF8
    Write-Host "Credenciales de Firebase preparadas" -ForegroundColor Green
} catch {
    Write-Host "Error al leer el archivo de Firebase. Asegurate de que el archivo existe." -ForegroundColor Red
}

Write-Host ""
Write-Host "INSTRUCCIONES PARA CONFIGURAR EN RENDER:" -ForegroundColor Yellow
Write-Host "1. Ve a: https://dashboard.render.com" -ForegroundColor White
Write-Host "2. Busca tu servicio: tucitasegura-api" -ForegroundColor White
Write-Host "3. Ve a la pestana: Environment" -ForegroundColor White
Write-Host "4. Añade todas las variables del archivo render-config.txt" -ForegroundColor White
Write-Host "5. En la seccion 'Files', añade un nuevo archivo:" -ForegroundColor White
Write-Host "   - Filename: firebase-credentials.json" -ForegroundColor Cyan
Write-Host "   - Mount Path: /app/firebase-credentials.json" -ForegroundColor Cyan
Write-Host "   - Content: Copia todo de firebase-credentials.json" -ForegroundColor Cyan
Write-Host ""
Write-Host "Una vez configurado, el deployment empezara automaticamente!" -ForegroundColor Green

# Mostrar resumen
Write-Host ""
Write-Host "RESUMEN DE CONFIGURACION:" -ForegroundColor Magenta
Write-Host "- Variables de entorno: 11" -ForegroundColor White
Write-Host "- Archivo de credenciales: firebase-credentials.json" -ForegroundColor White
Write-Host "- Auto-deploy: Habilitado" -ForegroundColor White
Write-Host "- Health check: /health" -ForegroundColor White
Write-Host "- Puerto: 8000" -ForegroundColor White

Write-Host ""
Write-Host "Tu backend estara listo en minutos!" -ForegroundColor Green