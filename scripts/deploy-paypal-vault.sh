#!/bin/bash

# Script de deploy para PayPal Vault Insurance System
# Autor: Claude
# Fecha: 2025-11-15

set -e  # Exit on error

echo "🚀 Deploy Script - PayPal Vault Insurance System"
echo "=================================================="
echo ""

# Colores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Verificar directorio
if [ ! -f "firebase.json" ]; then
    echo -e "${RED}❌ Error: Debes ejecutar este script desde /home/user/t2c06${NC}"
    exit 1
fi

echo -e "${YELLOW}📋 Paso 1: Verificando autenticación de Firebase...${NC}"
if ! firebase projects:list > /dev/null 2>&1; then
    echo -e "${RED}❌ Error: No estás autenticado en Firebase${NC}"
    echo ""
    echo "Por favor ejecuta primero:"
    echo "  firebase login"
    echo ""
    echo "O si estás en CI:"
    echo "  firebase use tuscitasseguras-2d1a6 --token YOUR_CI_TOKEN"
    exit 1
fi
echo -e "${GREEN}✅ Autenticado correctamente${NC}"
echo ""

echo -e "${YELLOW}📋 Paso 2: Verificando proyecto de Firebase...${NC}"
firebase use tuscitasseguras-2d1a6
echo -e "${GREEN}✅ Proyecto seleccionado: tuscitasseguras-2d1a6${NC}"
echo ""

echo -e "${YELLOW}📋 Paso 3: Verificando credenciales de PayPal...${NC}"
PAYPAL_CLIENT_ID=$(firebase functions:config:get paypal.client_id 2>/dev/null || echo "")
PAYPAL_MODE=$(firebase functions:config:get paypal.mode 2>/dev/null || echo "")

if [ -z "$PAYPAL_CLIENT_ID" ]; then
    echo -e "${RED}⚠️  Advertencia: Credenciales de PayPal NO configuradas${NC}"
    echo ""
    echo "Necesitas configurar las credenciales de PayPal:"
    echo ""
    echo -e "${YELLOW}firebase functions:config:set paypal.client_id=\"YOUR_CLIENT_ID\"${NC}"
    echo -e "${YELLOW}firebase functions:config:set paypal.secret=\"YOUR_SECRET\"${NC}"
    echo -e "${YELLOW}firebase functions:config:set paypal.mode=\"sandbox\"${NC}"
    echo ""
    read -p "¿Quieres continuar sin configurar credenciales? (y/N): " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${RED}Deploy cancelado${NC}"
        exit 1
    fi
else
    echo -e "${GREEN}✅ Credenciales de PayPal configuradas (modo: $PAYPAL_MODE)${NC}"
fi
echo ""

echo -e "${YELLOW}📋 Paso 4: Instalando dependencias de Cloud Functions...${NC}"
cd functions
npm install
cd ..
echo -e "${GREEN}✅ Dependencias instaladas${NC}"
echo ""

echo -e "${YELLOW}📋 Paso 5: Desplegando Cloud Functions...${NC}"
echo "   - createInsuranceVaultSetup"
echo "   - chargeInsuranceFromVault"
echo "   - deleteInsuranceVault"
echo "   + otras funciones existentes"
echo ""

firebase deploy --only functions

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Cloud Functions desplegadas correctamente${NC}"
else
    echo -e "${RED}❌ Error al desplegar Cloud Functions${NC}"
    exit 1
fi
echo ""

echo -e "${YELLOW}📋 Paso 6: Desplegando Frontend (Hosting)...${NC}"
firebase deploy --only hosting

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Frontend desplegado correctamente${NC}"
else
    echo -e "${RED}❌ Error al desplegar Hosting${NC}"
    exit 1
fi
echo ""

echo -e "${GREEN}=================================================="
echo "🎉 ¡Deploy Completado Exitosamente!"
echo "==================================================${NC}"
echo ""
echo "📝 Próximos pasos:"
echo ""
echo "1. Actualizar Client ID en webapp/seguro.html línea 15"
echo "   Cambiar YOUR_PAYPAL_CLIENT_ID por tu Client ID real"
echo ""
echo "2. Probar en Sandbox:"
echo "   - Ir a https://tuscitasseguras-2d1a6.web.app/webapp/seguro.html"
echo "   - Hacer clic en botón PayPal"
echo "   - Login con cuenta sandbox de PayPal"
echo ""
echo "3. Verificar en Firestore:"
echo "   - Revisar que se guarde insurancePaymentToken"
echo "   - Verificar hasAntiGhostingInsurance = true"
echo ""
echo "4. Documentación completa en:"
echo "   - PAYPAL_VAULT_INSURANCE.md"
echo ""
echo -e "${YELLOW}⚠️  IMPORTANTE: Si aún no has configurado las credenciales de PayPal,${NC}"
echo -e "${YELLOW}   las Cloud Functions fallarán. Configúralas con:${NC}"
echo ""
echo "   firebase functions:config:set paypal.client_id=\"YOUR_CLIENT_ID\""
echo "   firebase functions:config:set paypal.secret=\"YOUR_SECRET\""
echo "   firebase functions:config:set paypal.mode=\"sandbox\""
echo "   firebase deploy --only functions"
echo ""
