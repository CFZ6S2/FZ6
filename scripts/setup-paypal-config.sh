#!/bin/bash

# Script para configurar credenciales de PayPal en Firebase Functions
# Ejecutar desde la raíz del proyecto: bash setup-paypal-config.sh

echo "🔧 Configurando credenciales de PayPal en Firebase Functions..."

# Configurar Client ID
firebase functions:config:set paypal.client_id="AQouhwoeHU6p26B7mxYl5rYyl2Hj6xl2kfo11pQbLq6oUFDv12JQkZ5Kg-HN_kzU0wzvX6CbgNbPcNYI"

# Configurar Secret Key
firebase functions:config:set paypal.secret="EClAPLW1_Vedhq_u19Ok5MYcyjLLwm_Kd5W-QhOMsbSrN8F3ynUZd5wuJmvOke6mLLMyyv-QGZ1MK6qd"

# Configurar modo (sandbox para desarrollo, live para producción)
firebase functions:config:set paypal.mode="sandbox"

echo ""
echo "✅ Configuración de PayPal completada"
echo ""
echo "Para verificar la configuración:"
echo "  firebase functions:config:get"
echo ""
echo "Próximo paso: Instalar dependencias y desplegar funciones"
echo "  cd functions"
echo "  npm install"
echo "  cd .."
echo "  firebase deploy --only functions"
