#!/bin/bash

# Script para desplegar Cloud Functions con las nuevas funciones de PayPal
# Ejecutar desde la raíz del proyecto: bash deploy-functions.sh

set -e  # Exit on error

echo "🚀 Deployment de Cloud Functions - TuCitaSegura"
echo "================================================"
echo ""

# Verificar que estamos en el directorio correcto
if [ ! -f "firebase.json" ]; then
    echo "❌ Error: Debes ejecutar este script desde la raíz del proyecto"
    exit 1
fi

# Paso 1: Instalar dependencias
echo "📦 Paso 1/3: Instalando dependencias..."
cd functions
npm install
cd ..
echo "✅ Dependencias instaladas"
echo ""

# Paso 2: Verificar configuración de PayPal
echo "🔍 Paso 2/3: Verificando configuración de PayPal..."
if firebase functions:config:get paypal > /dev/null 2>&1; then
    echo "✅ Configuración de PayPal encontrada:"
    firebase functions:config:get paypal
else
    echo "⚠️  No se encontró configuración de PayPal"
    echo "Ejecuta primero: bash setup-paypal-config.sh"
    echo ""
    read -p "¿Deseas continuar sin configuración? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi
echo ""

# Paso 3: Desplegar funciones
echo "🚀 Paso 3/3: Desplegando Cloud Functions..."
firebase deploy --only functions

echo ""
echo "✅ ¡Deployment completado!"
echo ""
echo "Funciones desplegadas:"
echo "  • captureInsuranceAuthorization - Capturar retención cuando hay plantón"
echo "  • voidInsuranceAuthorization - Liberar retención al cancelar cuenta"
echo "  • getInsuranceAuthorizationStatus - Consultar estado de autorización"
echo ""
echo "Para ver logs:"
echo "  firebase functions:log"
echo ""
