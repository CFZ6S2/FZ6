@echo off
echo 🚀 Subiendo TuCitaSegura a GitHub...
echo.

:: Verificar si hay cambios sin commitear
git status --porcelain > temp_status.txt
set /p HAS_CHANGES=<temp_status.txt
del temp_status.txt

if not "%HAS_CHANGES%"=="" (
    echo 📁 Hay cambios sin commitear. Haciendo commit...
    git add .
    git commit -m "feat: Actualizacion de TuCitaSegura - %date% %time%"
)

:: Pedir el token de GitHub
set /p TOKEN="Ingresa tu token de GitHub: "

if "%TOKEN%"=="" (
    echo ❌ Debes proporcionar un token de GitHub
    echo.
    echo Para obtener un token, ve a:
    echo GitHub → Settings → Developer settings → Personal access tokens
    echo Crea un token con permisos 'repo' y 'workflow'
    pause
    exit /b 1
)

set USERNAME=cesarherrerarojo-ship-it
set REPO_NAME=TuCitaSegura

echo 🔑 Configurando repositorio remoto...
git remote remove origin 2>nul
git remote add origin https://%TOKEN%@github.com/%USERNAME%/%REPO_NAME%.git

echo 📤 Haciendo push al repositorio...
git push -u origin claude/paypal-insurance-retention-01KCDWh2xVbLZSmqH8kX3uhW

if %errorlevel% equ 0 (
    echo.
    echo ✅ ¡Éxito! Tu código ha sido subido a GitHub.
    echo 📍 URL del repositorio: https://github.com/%USERNAME%/%REPO_NAME%
    echo.
    echo 🎯 Características subidas:
    echo   • Integración frontend-backend completa
    echo   • Backend FastAPI con autenticación Firebase
    echo   • Frontend con monitoreo en tiempo real
    echo   • Tests de integración
    echo   • Documentación completa
) else (
    echo.
    echo ❌ Error al hacer push. Verifica tu token y permisos.
    echo Asegúrate de que el token tenga permisos 'repo' y 'workflow'
)

echo.
pause