#!/bin/bash
# Script para subir TuCitaSegura a GitHub

echo "🚀 Subiendo TuCitaSegura a GitHub..."

# Verificar si hay cambios
if [ -n "$(git status --porcelain)" ]; then
    echo "📁 Hay cambios sin commitear. Haciendo commit..."
    git add .
    git commit -m "feat: Actualización de TuCitaSegura - $(date '+%Y-%m-%d %H:%M:%S')"
fi

# Configurar remote temporal con token
if [ -z "$1" ]; then
    echo "❌ Por favor proporciona tu token de GitHub:"
    echo "Uso: ./push-to-github.sh TU_TOKEN_GITHUB"
    echo ""
    echo "Para obtener un token, ve a:"
    echo "GitHub → Settings → Developer settings → Personal access tokens"
    echo "Crea un token con permisos 'repo' y 'workflow'"
    exit 1
fi

TOKEN=$1
USERNAME="cesarherrerarojo-ship-it"
REPO_NAME="TuCitaSegura"

echo "🔑 Configurando repositorio remoto..."
git remote remove origin 2>/dev/null || true
git remote add origin https://${TOKEN}@github.com/${USERNAME}/${REPO_NAME}.git

echo "📤 Haciendo push al repositorio..."
git push -u origin claude/paypal-insurance-retention-01KCDWh2xVbLZSmqH8kX3uhW

if [ $? -eq 0 ]; then
    echo "✅ ¡Éxito! Tu código ha sido subido a GitHub."
    echo "📍 URL del repositorio: https://github.com/${USERNAME}/${REPO_NAME}"
    echo ""
    echo "🎯 Características subidas:"
    echo "  • Integración frontend-backend completa"
    echo "  • Backend FastAPI con autenticación Firebase"
    echo "  • Frontend con monitoreo en tiempo real"
    echo "  • Tests de integración"
    echo "  • Documentación completa"
else
    echo "❌ Error al hacer push. Verifica tu token y permisos."
    echo "Asegúrate de que el token tenga permisos 'repo' y 'workflow'"
fi