#!/bin/bash

# ============================================================================
# Script Completo de Configuración y Despliegue de PayPal
# ============================================================================
# Ejecutar desde la raíz del proyecto: bash deploy-paypal-complete.sh
# ============================================================================

set -e  # Salir si hay errores

echo "╔════════════════════════════════════════════════════════════════════╗"
echo "║   🚀 Configuración y Despliegue Completo de PayPal               ║"
echo "║   TuCitaSegura - PayPal Integration Setup                        ║"
echo "╚════════════════════════════════════════════════════════════════════╝"
echo ""

# ============================================================================
# PASO 1: Verificar que estamos en el directorio correcto
# ============================================================================
echo "📍 Paso 1/6: Verificando directorio..."
if [ ! -f "firebase.json" ]; then
  echo "❌ Error: No se encontró firebase.json"
  echo "   Ejecuta este script desde la raíz del proyecto"
  exit 1
fi
echo "✅ Directorio correcto"
echo ""

# ============================================================================
# PASO 2: Verificar Firebase CLI
# ============================================================================
echo "🔧 Paso 2/6: Verificando Firebase CLI..."
if ! command -v firebase &> /dev/null; then
  echo "⚠️  Firebase CLI no está instalado"
  echo ""
  echo "   Opciones:"
  echo "   1. Instalar globalmente: npm install -g firebase-tools"
  echo "   2. Usar npx: npx firebase-tools <comando>"
  echo ""
  read -p "   ¿Deseas instalar Firebase CLI globalmente ahora? (y/n): " install_firebase

  if [ "$install_firebase" = "y" ] || [ "$install_firebase" = "Y" ]; then
    echo "   Instalando Firebase CLI..."
    npm install -g firebase-tools
    echo "✅ Firebase CLI instalado"
  else
    echo "ℹ️  Continuaremos sin Firebase CLI (usaremos npx)"
    FIREBASE_CMD="npx firebase-tools"
  fi
else
  echo "✅ Firebase CLI encontrado"
  FIREBASE_CMD="firebase"
fi
echo ""

# ============================================================================
# PASO 3: Configurar credenciales de PayPal en Firebase Functions
# ============================================================================
echo "🔑 Paso 3/6: Configurando credenciales de PayPal..."
echo ""
echo "   Las credenciales actuales (SANDBOX) son:"
echo "   Client ID: AQouhwoeHU6p26B7mxYl5rYyl2Hj6xl2kfo11pQbLq6oUFDv12JQkZ5Kg-HN_kzU0wzvX6CbgNbPcNYI"
echo "   Secret: EClAPLW1_Vedhq_u19Ok5MYcyjLLwm_Kd5W-QhOMsbSrN8F3ynUZd5wuJmvOke6mLLMyyv-QGZ1MK6qd"
echo "   Mode: sandbox"
echo ""

read -p "   ¿Deseas usar estas credenciales SANDBOX? (y/n): " use_sandbox

if [ "$use_sandbox" = "y" ] || [ "$use_sandbox" = "Y" ]; then
  PAYPAL_CLIENT_ID="AQouhwoeHU6p26B7mxYl5rYyl2Hj6xl2kfo11pQbLq6oUFDv12JQkZ5Kg-HN_kzU0wzvX6CbgNbPcNYI"
  PAYPAL_SECRET="EClAPLW1_Vedhq_u19Ok5MYcyjLLwm_Kd5W-QhOMsbSrN8F3ynUZd5wuJmvOke6mLLMyyv-QGZ1MK6qd"
  PAYPAL_MODE="sandbox"
  echo "   ℹ️  Usando credenciales SANDBOX"
else
  echo ""
  echo "   Ingresa tus credenciales de PRODUCCIÓN:"
  read -p "   Client ID: " PAYPAL_CLIENT_ID
  read -p "   Secret: " PAYPAL_SECRET
  PAYPAL_MODE="live"
  echo "   ⚠️  Usando credenciales de PRODUCCIÓN"
fi

echo ""
echo "   Configurando en Firebase Functions..."

$FIREBASE_CMD functions:config:set \
  paypal.client_id="$PAYPAL_CLIENT_ID" \
  paypal.secret="$PAYPAL_SECRET" \
  paypal.mode="$PAYPAL_MODE"

echo ""
echo "✅ Credenciales configuradas en Firebase Functions"
echo ""

# ============================================================================
# PASO 4: Crear archivo .env para desarrollo local
# ============================================================================
echo "📝 Paso 4/6: Creando archivo .env para desarrollo local..."

cat > functions/.env << EOF
# PayPal Configuration - Local Development
# Generated: $(date)

PAYPAL_CLIENT_ID=$PAYPAL_CLIENT_ID
PAYPAL_SECRET=$PAYPAL_SECRET
PAYPAL_MODE=$PAYPAL_MODE

# Webhook ID - Configurar después de crear webhook en PayPal Dashboard
# PAYPAL_WEBHOOK_ID=WH-xxxxx
EOF

echo "✅ Archivo functions/.env creado"
echo ""

# ============================================================================
# PASO 5: Instalar dependencias de Cloud Functions
# ============================================================================
echo "📦 Paso 5/6: Instalando dependencias de Cloud Functions..."
cd functions

if [ -d "node_modules" ]; then
  echo "   ℹ️  node_modules ya existe, ejecutando npm install..."
else
  echo "   Instalando por primera vez..."
fi

npm install

echo "✅ Dependencias instaladas"
echo ""

cd ..

# ============================================================================
# PASO 6: Desplegar Cloud Functions
# ============================================================================
echo "🚀 Paso 6/6: Desplegando Cloud Functions a Firebase..."
echo ""
echo "   Funciones que se desplegarán:"
echo "   - onUserDocCreate (configurar custom claims)"
echo "   - onUserDocUpdate (actualizar custom claims)"
echo "   - syncChatACL (sincronizar ACLs de Storage)"
echo "   - updateUserClaims (callable - admin)"
echo "   - getUserClaims (callable)"
echo "   - paypalWebhook (webhook de PayPal)"
echo "   - captureInsuranceAuthorization (callable)"
echo "   - voidInsuranceAuthorization (callable)"
echo "   - getInsuranceAuthorizationStatus (callable)"
echo ""

read -p "   ¿Proceder con el despliegue? (y/n): " proceed_deploy

if [ "$proceed_deploy" = "y" ] || [ "$proceed_deploy" = "Y" ]; then
  echo ""
  echo "   Desplegando..."
  $FIREBASE_CMD deploy --only functions

  echo ""
  echo "✅ Cloud Functions desplegadas exitosamente"
else
  echo ""
  echo "⏸️  Despliegue cancelado"
  echo "   Puedes desplegar manualmente con: firebase deploy --only functions"
fi

echo ""

# ============================================================================
# RESUMEN Y PRÓXIMOS PASOS
# ============================================================================
echo "╔════════════════════════════════════════════════════════════════════╗"
echo "║                    ✅ CONFIGURACIÓN COMPLETADA                    ║"
echo "╚════════════════════════════════════════════════════════════════════╝"
echo ""
echo "📊 Resumen:"
echo "   ✅ Credenciales configuradas en Firebase Functions"
echo "   ✅ Archivo .env creado para desarrollo local"
echo "   ✅ Dependencias instaladas (functions/node_modules)"
if [ "$proceed_deploy" = "y" ] || [ "$proceed_deploy" = "Y" ]; then
  echo "   ✅ Cloud Functions desplegadas"
else
  echo "   ⏸️  Cloud Functions NO desplegadas (hazlo manualmente)"
fi
echo ""

# ============================================================================
# PRÓXIMOS PASOS CRÍTICOS
# ============================================================================
echo "⚠️  PRÓXIMOS PASOS CRÍTICOS:"
echo ""
echo "1️⃣  CONFIGURAR WEBHOOK EN PAYPAL DASHBOARD"
echo "   ════════════════════════════════════════════════════════════"
echo "   a) Ve a: https://developer.paypal.com/dashboard/applications/$PAYPAL_MODE"
echo "   b) Selecciona tu app 'TuCitaSegura'"
echo "   c) Click en 'Add Webhook'"
echo "   d) Webhook URL:"
echo "      https://us-central1-tuscitasseguras-2d1a6.cloudfunctions.net/paypalWebhook"
echo ""
echo "   e) Selecciona estos eventos:"
echo "      ✅ BILLING.SUBSCRIPTION.ACTIVATED"
echo "      ✅ BILLING.SUBSCRIPTION.CANCELLED"
echo "      ✅ BILLING.SUBSCRIPTION.EXPIRED"
echo "      ✅ PAYMENT.SALE.COMPLETED"
echo "      ✅ PAYMENT.AUTHORIZATION.VOIDED"
echo ""
echo "   f) Click 'Save'"
echo "   g) Copia el Webhook ID (formato: WH-xxxxx)"
echo ""
echo "   h) Ejecuta:"
echo "      firebase functions:config:set paypal.webhook_id=\"WH-xxxxx\""
echo "      firebase deploy --only functions"
echo ""

echo "2️⃣  VERIFICAR CONFIGURACIÓN ACTUAL"
echo "   ════════════════════════════════════════════════════════════"
echo "   firebase functions:config:get"
echo ""

echo "3️⃣  TESTING"
echo "   ════════════════════════════════════════════════════════════"
echo "   a) Probar suscripción: /webapp/suscripcion.html"
echo "   b) Probar seguro: /webapp/seguro.html"
echo "   c) Verificar webhooks en PayPal Dashboard"
echo "   d) Ver logs: firebase functions:log"
echo ""

echo "4️⃣  CAMBIAR A PRODUCCIÓN (cuando estés listo)"
echo "   ════════════════════════════════════════════════════════════"
echo "   firebase functions:config:set paypal.mode=\"live\""
echo "   firebase functions:config:set paypal.client_id=\"PRODUCTION_CLIENT_ID\""
echo "   firebase functions:config:set paypal.secret=\"PRODUCTION_SECRET\""
echo "   firebase deploy --only functions"
echo ""
echo "   ⚠️  También actualizar Client ID en:"
echo "      - webapp/suscripcion.html (línea 15)"
echo "      - webapp/seguro.html (línea 15)"
echo ""

# ============================================================================
# DOCUMENTACIÓN
# ============================================================================
echo "📚 Documentación:"
echo "   - PAYPAL_INTEGRATION.md"
echo "   - PAYPAL_AUTHORIZATION_FUNCTIONS.md"
echo "   - PAYPAL_WEBHOOK_SECURITY.md"
echo ""

# ============================================================================
# SOPORTE
# ============================================================================
echo "🆘 Soporte:"
echo "   - PayPal Docs: https://developer.paypal.com/docs"
echo "   - Firebase Docs: https://firebase.google.com/docs/functions"
echo "   - Ver logs: firebase functions:log"
echo ""

echo "╔════════════════════════════════════════════════════════════════════╗"
echo "║              🎉 ¡Configuración PayPal Lista!                      ║"
echo "║     Recuerda configurar el Webhook ID para activar seguridad      ║"
echo "╚════════════════════════════════════════════════════════════════════╝"
