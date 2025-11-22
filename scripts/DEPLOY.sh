#!/bin/bash

# Script de deployment para TuCitaSegura
# Ejecutar DESPUÉS de hacer firebase login

echo "=================================================="
echo "🚀 TuCitaSegura - Deployment Script"
echo "=================================================="
echo ""

# Verificar autenticación
echo "🔐 Verificando autenticación..."
if firebase projects:list > /dev/null 2>&1; then
    echo "✅ Autenticado correctamente"
else
    echo "❌ No estás autenticado con Firebase"
    echo "   Ejecuta: firebase login"
    exit 1
fi
echo ""

# Mostrar proyecto actual
echo "📊 Proyecto Firebase:"
cat .firebaserc | grep "default" | cut -d'"' -f4
echo ""

# Confirmar deployment
echo "⚠️  Vas a deployar los siguientes componentes:"
echo "   1. Cloud Functions (3 funciones)"
echo "      - onUserDocCreate (auto-set custom claims)"
echo "      - onUserDocUpdate (sync custom claims)"
echo "      - syncChatACL (manage chat permissions)"
echo ""
echo "   2. Firestore Security Rules"
echo "      - Rules con custom claims (role, gender)"
echo "      - Protección por género"
echo "      - Chat ACL"
echo ""
echo "   3. Storage Security Rules"
echo "      - Profile photos por género"
echo "      - Chat attachments"
echo ""

read -p "¿Continuar con el deployment? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Deployment cancelado"
    exit 1
fi

echo ""
echo "=================================================="
echo "🚀 Iniciando Deployment..."
echo "=================================================="
echo ""

# Deploy Functions
echo "📦 1/3: Deploying Cloud Functions..."
echo "-----------------------------------"
firebase deploy --only functions
FUNCTIONS_STATUS=$?
echo ""

# Deploy Firestore Rules
echo "🔒 2/3: Deploying Firestore Rules..."
echo "-----------------------------------"
firebase deploy --only firestore:rules
FIRESTORE_STATUS=$?
echo ""

# Deploy Storage Rules
echo "💾 3/3: Deploying Storage Rules..."
echo "-----------------------------------"
firebase deploy --only storage
STORAGE_STATUS=$?
echo ""

# Resumen
echo "=================================================="
echo "📊 Deployment Summary"
echo "=================================================="
echo ""

if [ $FUNCTIONS_STATUS -eq 0 ]; then
    echo "✅ Cloud Functions: SUCCESS"
else
    echo "❌ Cloud Functions: FAILED"
fi

if [ $FIRESTORE_STATUS -eq 0 ]; then
    echo "✅ Firestore Rules: SUCCESS"
else
    echo "❌ Firestore Rules: FAILED"
fi

if [ $STORAGE_STATUS -eq 0 ]; then
    echo "✅ Storage Rules: SUCCESS"
else
    echo "❌ Storage Rules: FAILED"
fi

echo ""

# Verificar si todo fue exitoso
if [ $FUNCTIONS_STATUS -eq 0 ] && [ $FIRESTORE_STATUS -eq 0 ] && [ $STORAGE_STATUS -eq 0 ]; then
    echo "🎉 ¡DEPLOYMENT COMPLETADO EXITOSAMENTE!"
    echo ""
    echo "📋 Próximos pasos:"
    echo "   1. Verifica las funciones en:"
    echo "      https://console.firebase.google.com/project/tuscitasseguras-2d1a6/functions"
    echo ""
    echo "   2. Prueba tu app:"
    echo "      firebase serve"
    echo "      Abre: http://localhost:5000"
    echo ""
    echo "   3. Registra el debug token para App Check:"
    echo "      Token: BCF51A42-7B5F-4009-B8D7-30AF50EA661B"
    echo "      https://console.firebase.google.com/project/tuscitasseguras-2d1a6/appcheck"
    echo ""
    exit 0
else
    echo "⚠️  Deployment completado con errores"
    echo "   Revisa los logs arriba para más detalles"
    exit 1
fi
