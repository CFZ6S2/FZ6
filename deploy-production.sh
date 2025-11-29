#!/bin/bash

# Script de Deployment a Producción - TuCitaSegura
# Ejecutar desde Bash/Zsh en Linux/Mac

set -e  # Exit on error

echo "========================================"
echo "  DEPLOYMENT A PRODUCCIÓN - TuCitaSegura"
echo "========================================"
echo ""

# 1. Verificar que estamos en la rama correcta
echo "[1/6] Verificando rama..."
BRANCH=$(git branch --show-current)
echo "✓ Rama actual: $BRANCH"

if [ "$BRANCH" != "claude/final-security-fixes-01BjGpKGPPPQ99KhLtREzxiA" ]; then
    echo "⚠️  No estás en la rama correcta"
    echo "Cambiando a rama correcta..."
    git checkout claude/final-security-fixes-01BjGpKGPPPQ99KhLtREzxiA
fi

# 2. Pull de últimos cambios
echo ""
echo "[2/6] Obteniendo últimos cambios..."
git pull origin claude/final-security-fixes-01BjGpKGPPPQ99KhLtREzxiA

# 3. Verificar archivos clave
echo ""
echo "[3/6] Verificando archivos clave..."

# Verificar que firebase-appcheck.js tiene la clave correcta
if grep -q "6Lc4QBcsAAAAACFZLEgaTz3DuLGiBuXpScrBKt7w" webapp/js/firebase-appcheck.js; then
    echo "✅ firebase-appcheck.js - Clave correcta"
else
    echo "❌ firebase-appcheck.js - Clave incorrecta o no encontrada"
    exit 1
fi

# Verificar que login.html NO tiene firebase-appcheck-disabled.js
if grep -q "firebase-appcheck-disabled" webapp/login.html; then
    echo "❌ login.html - Todavía tiene referencia al archivo viejo"
    exit 1
else
    echo "✅ login.html - Referencia correcta"
fi

# 4. Instalar dependencias de Functions (si es necesario)
echo ""
echo "[4/6] Verificando dependencias de Cloud Functions..."
if [ -d "functions/node_modules/@google-cloud/recaptcha-enterprise" ]; then
    echo "✅ Dependencias ya instaladas"
else
    echo "📦 Instalando dependencias..."
    cd functions
    npm install
    cd ..
fi

# 5. Desplegar a Firebase
echo ""
echo "[5/6] Desplegando a Firebase..."
echo "⚠️  Esto puede tardar 2-5 minutos..."
echo ""

# Desplegar hosting y functions
firebase deploy --only hosting,functions

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ DEPLOYMENT EXITOSO"
else
    echo ""
    echo "❌ ERROR EN DEPLOYMENT"
    echo "Revisa los errores arriba"
    exit 1
fi

# 6. Verificar deployment
echo ""
echo "[6/6] Verificando deployment..."

echo "Verificando firebase-appcheck.js en producción..."
if curl -s https://tucitasegura.com/webapp/js/firebase-appcheck.js | grep -q "6Lc4QBcsAAAAACFZLEgaTz3DuLGiBuXpScrBKt7w"; then
    echo "✅ Clave correcta en producción"
else
    echo "⚠️  Clave incorrecta en producción - puede ser cache del CDN"
fi

# Resumen final
echo ""
echo "========================================"
echo "  DEPLOYMENT COMPLETADO"
echo "========================================"
echo ""
echo "✅ Hosting desplegado"
echo "✅ Cloud Functions desplegadas"
echo ""
echo "🔗 URLs importantes:"
echo "   • Sitio: https://tucitasegura.com"
echo "   • Login: https://tucitasegura.com/webapp/login.html"
echo "   • Ejemplo reCAPTCHA: https://tucitasegura.com/webapp/example-recaptcha-login.html"
echo ""
echo "⚠️  IMPORTANTE: Limpia el cache del navegador"
echo "   1. Ctrl+Shift+Delete (Cmd+Shift+Delete en Mac)"
echo "   2. Marca: Cookies, Cache"
echo "   3. Periodo: Desde siempre"
echo "   4. Borrar datos"
echo ""
echo "O usa modo incógnito: Ctrl+Shift+N (Cmd+Shift+N en Mac)"
echo ""
