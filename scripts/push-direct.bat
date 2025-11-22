@echo off
echo 🚀 Subiendo TuCitaSegura a GitHub con token...
echo.

:: Configuración
git remote remove origin 2>nul
git remote add origin https://ghp_1234567890abcdefghijklmnopqrstuvwxyz@github.com/cesarherrerarojo-ship-it/TuCitaSegura.git

echo 📤 Haciendo push al repositorio...
git push -u origin claude/paypal-insurance-retention-01KCDWh2xVbLZSmqH8kX3uhW

if %errorlevel% equ 0 (
    echo.
    echo ✅ ¡ÉXITO! Tu código está en GitHub.
    echo 📍 URL: https://github.com/cesarherrerarojo-ship-it/TuCitaSegura
) else (
    echo.
    echo ❌ Error. Necesitas un token válido.
    echo.
    echo Para obtener un token:
    echo 1. Ve a GitHub → Settings → Developer settings → Personal access tokens
    echo 2. Crea un token con permisos 'repo' y 'workflow'
    echo 3. Reemplaza el token en este archivo y ejecuta de nuevo
)

echo.
pause