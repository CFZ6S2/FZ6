#!/bin/bash
# Script para hacer deploy a producción de TuCitaSegura

echo "🚀 Desplegando TuCitaSegura a Producción"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📦 Lo que se va a desplegar:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "✅ CSP headers mejorados (firebase.json)"
echo "   - Permite Firebase Auth/Firestore/Storage"
echo "   - Bloquea XSS y clickjacking"
echo "   - HSTS, X-Frame-Options, etc."
echo ""
echo "✅ Firestore Rules actualizadas"
echo "   - Email verification obligatorio"
echo "   - Validaciones de seguridad"
echo ""
echo "✅ Código del frontend"
echo "   - Sistema de sanitización XSS"
echo "   - Logger profesional"
echo "   - API Key correcta"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Verificar que estamos en el directorio correcto
if [ ! -f "firebase.json" ]; then
    echo "❌ Error: No se encuentra firebase.json"
    echo "   Ejecuta este script desde el directorio raíz del proyecto"
    exit 1
fi

# Verificar que Firebase CLI está instalado
if ! command -v firebase &> /dev/null; then
    echo "❌ Error: Firebase CLI no está instalado"
    echo "   Instala con: npm install -g firebase-tools"
    exit 1
fi

# Verificar autenticación
echo "🔐 Verificando autenticación..."
if ! firebase projects:list &> /dev/null; then
    echo "❌ No estás autenticado en Firebase"
    echo "   Ejecuta: firebase login"
    exit 1
fi

echo "✅ Autenticación verificada"
echo ""

# Confirmar con el usuario
echo "⚠️  IMPORTANTE: Esto desplegará cambios a PRODUCCIÓN"
echo "   Proyecto: tuscitasseguras-2d1a6"
echo "   URL: https://tucitasegura.com"
echo ""
echo "❓ ¿Continuar? (s/n)"
read -r respuesta

if [ "$respuesta" != "s" ] && [ "$respuesta" != "S" ]; then
    echo "❌ Deploy cancelado"
    exit 0
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🚀 Iniciando Deploy..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Deploy de Firestore Rules primero
echo "📋 Desplegando Firestore Rules..."
if firebase deploy --only firestore:rules; then
    echo "✅ Firestore Rules desplegadas"
else
    echo "❌ Error desplegando Firestore Rules"
    exit 1
fi

echo ""

# Deploy de Hosting (CSP + código)
echo "🌐 Desplegando Hosting (CSP + Frontend)..."
if firebase deploy --only hosting; then
    echo "✅ Hosting desplegado"
else
    echo "❌ Error desplegando Hosting"
    exit 1
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🎉 Deploy Completado!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🌐 URLs de Producción:"
echo "   https://tucitasegura.com"
echo "   https://tuscitasseguras-2d1a6.web.app"
echo ""
echo "📋 Verificaciones Recomendadas:"
echo "   1. Abre https://tucitasegura.com"
echo "   2. Abre la consola del navegador (F12)"
echo "   3. Verifica que NO hay errores de CSP"
echo "   4. Prueba registro/login"
echo "   5. Verifica que Firebase funciona"
echo ""
echo "🔍 Si hay problemas:"
echo "   - Verifica los logs: firebase hosting:logs"
echo "   - Limpia cache: Ctrl+Shift+R en el navegador"
echo "   - Espera 2-3 minutos para propagación CDN"
echo ""
