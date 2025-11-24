#!/bin/bash
# SCRIPT PARA ARREGLAR PRODUCCIÓN

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔥 ARREGLANDO PRODUCCIÓN - tucitasegura.com"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📋 Esto va a arreglar:"
echo "   ✅ CSP bloqueando Firebase"
echo "   ✅ CSP bloqueando Font Awesome"
echo "   ✅ Email verification en reglas"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Paso 1: Login
echo "🔐 PASO 1/3: Autenticación Firebase"
echo "   (Se abrirá tu navegador)"
echo ""
firebase login
if [ $? -ne 0 ]; then
    echo "❌ Error en login. Intenta: firebase login --reauth"
    exit 1
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Paso 2: Deploy Firestore Rules
echo "📋 PASO 2/3: Desplegando Firestore Rules"
echo "   (Email verification)"
echo ""
firebase deploy --only firestore:rules
if [ $? -ne 0 ]; then
    echo "❌ Error desplegando rules"
    exit 1
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Paso 3: Deploy Hosting
echo "🌐 PASO 3/3: Desplegando Hosting"
echo "   (CSP nuevo + código)"
echo ""
firebase deploy --only hosting
if [ $? -ne 0 ]; then
    echo "❌ Error desplegando hosting"
    exit 1
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🎉 ¡DEPLOY COMPLETADO!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "✅ CSP actualizado - Firebase y Font Awesome permitidos"
echo "✅ Firestore Rules - Email verification activo"
echo ""
echo "🌐 Abre tu sitio:"
echo "   https://tucitasegura.com"
echo ""
echo "⏱️  Espera 2-3 minutos para propagación CDN"
echo "🔄 Limpia cache del navegador: Ctrl + Shift + R"
echo ""
echo "🔍 Verifica en la consola (F12):"
echo "   ❌ ANTES: Errores de CSP bloqueando Firebase"
echo "   ✅ AHORA: Sin errores de CSP"
echo ""
