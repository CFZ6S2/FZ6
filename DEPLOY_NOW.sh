#!/bin/bash
# Quick Deploy Script - Run this from your local machine

echo "🚀 Deploying Frontend to Firebase Hosting"
echo "=========================================="
echo ""

# Check if we're in the right directory
if [ ! -f "firebase.json" ]; then
    echo "❌ Error: Not in project root (firebase.json not found)"
    echo "Run this script from the FZ6 directory"
    exit 1
fi

echo "📋 What will be deployed:"
echo "   ✅ index.html (Updated API URL to fz6-production.up.railway.app)"
echo "   ✅ firebase.json (Updated CSP)"
echo "   ✅ functions/index.js (Updated proxy)"
echo ""
echo "🎯 Target: tucitasegura.com"
echo ""

# Deploy
echo "🚀 Deploying..."
firebase deploy --only hosting

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ ¡Deploy exitoso!"
    echo ""
    echo "📝 Próximos pasos:"
    echo "   1. Espera 30-60 segundos"
    echo "   2. Abre https://tucitasegura.com"
    echo "   3. Presiona Ctrl+Shift+R (hard refresh)"
    echo "   4. Abre consola (F12) y verifica:"
    echo "      console.log(window.API_BASE_URL)"
    echo "      Debe mostrar: https://fz6-production.up.railway.app"
    echo ""
    echo "   5. Test de conexión:"
    echo "      fetch(window.API_BASE_URL + '/health').then(r=>r.json()).then(console.log)"
    echo "      Debe mostrar: {status: 'healthy', ...}"
    echo ""
else
    echo ""
    echo "❌ Error en el deploy"
    echo ""
    echo "Posibles soluciones:"
    echo "   1. Verifica que estés autenticado:"
    echo "      firebase login"
    echo ""
    echo "   2. Verifica el proyecto:"
    echo "      firebase projects:list"
    echo "      firebase use tuscitasseguras-2d1a6"
    echo ""
    echo "   3. Intenta de nuevo:"
    echo "      firebase deploy --only hosting"
    echo ""
fi
