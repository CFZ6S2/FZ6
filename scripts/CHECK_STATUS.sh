#!/bin/bash

# Script para verificar el estado de Firebase y App Check

echo "=================================================="
echo "🔍 Verificación de Estado - TuCitaSegura"
echo "=================================================="
echo ""

# Check if Firebase CLI is installed
echo "📦 Verificando Firebase CLI..."
if command -v firebase &> /dev/null; then
    echo "✅ Firebase CLI instalado: $(firebase --version)"
else
    echo "❌ Firebase CLI no instalado"
    echo "   Instalar con: npm install -g firebase-tools"
fi
echo ""

# Check Firebase project
echo "🔥 Verificando proyecto Firebase..."
if [ -f .firebaserc ]; then
    PROJECT=$(cat .firebaserc | grep "default" | cut -d'"' -f4)
    echo "✅ Proyecto configurado: $PROJECT"
else
    echo "❌ No se encontró .firebaserc"
fi
echo ""

# Check Node.js for Functions
echo "📦 Verificando Node.js (para Functions)..."
if command -v node &> /dev/null; then
    echo "✅ Node.js instalado: $(node --version)"
else
    echo "❌ Node.js no instalado"
fi
echo ""

# Check Functions dependencies
echo "📦 Verificando dependencias de Functions..."
if [ -f functions/package.json ]; then
    echo "✅ package.json encontrado"
    if [ -d functions/node_modules ]; then
        echo "✅ node_modules instalado"
    else
        echo "⚠️  node_modules no instalado"
        echo "   Ejecutar: cd functions && npm install"
    fi
else
    echo "❌ No se encontró functions/package.json"
fi
echo ""

# Check Debug Token
echo "🔑 Debug Token actual:"
echo "   BCF51A42-7B5F-4009-B8D7-30AF50EA661B"
echo ""

# Check Google Maps API
echo "🗺️  Google Maps API Key:"
if grep -q "AQ.Ab8RN6I6FQgaC1SltCBdMTyt6mM49BUATqwB32I7g5crKb91Vg" webapp/buscar-usuarios.html; then
    echo "✅ Integrada en buscar-usuarios.html"
else
    echo "❌ No encontrada en buscar-usuarios.html"
fi

if grep -q "AQ.Ab8RN6I6FQgaC1SltCBdMTyt6mM49BUATqwB32I7g5crKb91Vg" webapp/cita-detalle.html; then
    echo "✅ Integrada en cita-detalle.html"
else
    echo "❌ No encontrada en cita-detalle.html"
fi
echo ""

# Check backend .env
echo "🔧 Backend configuración:"
if [ -f backend/.env ]; then
    echo "✅ backend/.env existe"
    if grep -q "GOOGLE_MAPS_API_KEY=AQ.Ab8RN6I6FQgaC1SltCBdMTyt6mM49BUATqwB32I7g5crKb91Vg" backend/.env; then
        echo "✅ Google Maps API key configurada"
    else
        echo "⚠️  Google Maps API key no configurada"
    fi
else
    echo "❌ backend/.env no existe"
    echo "   Copiar desde: cp backend/.env.example backend/.env"
fi
echo ""

# Check git status
echo "📊 Estado Git:"
BRANCH=$(git branch --show-current)
echo "   Branch actual: $BRANCH"
UNPUSHED=$(git log origin/$BRANCH..$BRANCH --oneline 2>/dev/null | wc -l)
if [ $UNPUSHED -eq 0 ]; then
    echo "✅ Todo pusheado al remoto"
else
    echo "⚠️  $UNPUSHED commits sin pushear"
fi
echo ""

echo "=================================================="
echo "📋 SIGUIENTE PASOS RECOMENDADOS:"
echo "=================================================="
echo ""
echo "1. Verificar App Check en Firebase Console:"
echo "   https://console.firebase.google.com/project/tuscitasseguras-2d1a6/appcheck"
echo ""
echo "2. Registrar debug token si no lo has hecho:"
echo "   Token: BCF51A42-7B5F-4009-B8D7-30AF50EA661B"
echo ""
echo "3. Usar herramientas de diagnóstico:"
echo "   - /webapp/test-firebase-connection.html"
echo "   - /webapp/generate-new-debug-token.html"
echo ""
echo "4. Deploy de Cloud Functions:"
echo "   cd functions && npm install"
echo "   firebase deploy --only functions"
echo ""
echo "5. Deploy de Firestore Rules:"
echo "   firebase deploy --only firestore:rules,storage"
echo ""
