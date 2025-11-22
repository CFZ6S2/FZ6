@echo off
echo 🚀 Subiendo TuCitaSegura a GitHub...
echo.
echo 📋 INSTRUCCIONES:
echo 1. Ve a GitHub → Settings → Developer settings → Personal access tokens
echo 2. Crea un token con permisos 'repo' y 'workflow'
echo 3. Copia el token (empieza con ghp_)
echo.

set /p TOKEN="Ingresa tu token de GitHub: "

if "%TOKEN%"=="" (
    echo ❌ Debes proporcionar un token
echo.
    echo Ejemplo de token: ghp_1234567890abcdefghijklmnopqrstuvwxyz
    pause
    exit /b 1
)

echo 🔑 Configurando repositorio...
git remote remove origin 2>nul
git remote add origin https://%TOKEN%@github.com/cesarherrerarojo-ship-it/TuCitaSegura.git

echo 📤 Subiendo código a GitHub...
git push -u origin claude/paypal-insurance-retention-01KCDWh2xVbLZSmqH8kX3uhW

if %errorlevel% equ 0 (
    echo.
    echo ✅ ¡ÉXITO! Tu código está en GitHub.
    echo 📍 URL: https://github.com/cesarherrerarojo-ship-it/TuCitaSegura
    echo.
    echo 🎯 Tu proyecto incluye:
    echo   • Backend FastAPI con autenticación Firebase
    echo   • Frontend integrado con backend
    echo   • Tests de integración funcionando
    echo   • Documentación completa
) else (
    echo.
    echo ❌ Error. Verifica:
    echo   • El token sea correcto
    echo   • Tengas permisos en el repositorio
    echo   • Estés conectado a internet
)

echo.
echo 🚀 ¡Listo! Tu proyecto TuCitaSegura está en GitHub.
pause