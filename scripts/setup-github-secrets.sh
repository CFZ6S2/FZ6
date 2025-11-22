#!/bin/bash

# 🔐 GitHub Secrets Setup Helper - TuCitaSegura
# Este script te ayuda a recopilar todos los secrets necesarios para CI/CD

set -e

echo "🚀 GitHub Secrets Setup Helper"
echo "================================"
echo ""
echo "Este script te ayudará a recopilar todos los secrets necesarios."
echo "Al final, te mostraré los comandos exactos para configurarlos en GitHub."
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Temporary file to store secrets
SECRETS_FILE="/tmp/github-secrets.txt"
> "$SECRETS_FILE"

echo "📋 Secrets necesarios: 11 en total"
echo ""

# ===== RAILWAY SECRETS =====
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "1️⃣  RAILWAY SECRETS (2)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

echo -e "${YELLOW}RAILWAY_TOKEN${NC}"
echo "Obtenerlo de: https://railway.app/account/tokens"
echo ""
read -p "Ingresa tu RAILWAY_TOKEN (o presiona Enter para omitir): " RAILWAY_TOKEN
if [ ! -z "$RAILWAY_TOKEN" ]; then
    echo "RAILWAY_TOKEN=$RAILWAY_TOKEN" >> "$SECRETS_FILE"
    echo -e "${GREEN}✓ Guardado${NC}"
else
    echo -e "${RED}⚠ Omitido - deberás configurarlo manualmente${NC}"
fi
echo ""

echo -e "${YELLOW}BACKEND_URL${NC}"
echo "URL de tu backend en Railway (ej: https://tu-app.railway.app)"
echo ""
read -p "Ingresa tu BACKEND_URL (o presiona Enter para omitir): " BACKEND_URL
if [ ! -z "$BACKEND_URL" ]; then
    echo "BACKEND_URL=$BACKEND_URL" >> "$SECRETS_FILE"
    echo -e "${GREEN}✓ Guardado${NC}"
else
    echo -e "${RED}⚠ Omitido - deberás configurarlo manualmente${NC}"
fi
echo ""

# ===== FIREBASE SECRETS =====
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "2️⃣  FIREBASE SECRETS (7)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Obtener de: https://console.firebase.google.com"
echo "Project Settings → General → Your apps → Web app"
echo ""

# Firebase Project ID (ya lo tenemos)
FIREBASE_PROJECT_ID="tuscitasseguras-2d1a6"
echo -e "${GREEN}✓ VITE_FIREBASE_PROJECT_ID: $FIREBASE_PROJECT_ID (auto-detectado)${NC}"
echo "VITE_FIREBASE_PROJECT_ID=$FIREBASE_PROJECT_ID" >> "$SECRETS_FILE"
echo ""

echo -e "${YELLOW}VITE_FIREBASE_API_KEY${NC}"
read -p "Ingresa VITE_FIREBASE_API_KEY: " VITE_FIREBASE_API_KEY
if [ ! -z "$VITE_FIREBASE_API_KEY" ]; then
    echo "VITE_FIREBASE_API_KEY=$VITE_FIREBASE_API_KEY" >> "$SECRETS_FILE"
    echo -e "${GREEN}✓ Guardado${NC}"
fi
echo ""

echo -e "${YELLOW}VITE_FIREBASE_AUTH_DOMAIN${NC}"
echo "Generalmente: $FIREBASE_PROJECT_ID.firebaseapp.com"
SUGGESTED_AUTH_DOMAIN="$FIREBASE_PROJECT_ID.firebaseapp.com"
read -p "Ingresa VITE_FIREBASE_AUTH_DOMAIN [$SUGGESTED_AUTH_DOMAIN]: " VITE_FIREBASE_AUTH_DOMAIN
VITE_FIREBASE_AUTH_DOMAIN=${VITE_FIREBASE_AUTH_DOMAIN:-$SUGGESTED_AUTH_DOMAIN}
echo "VITE_FIREBASE_AUTH_DOMAIN=$VITE_FIREBASE_AUTH_DOMAIN" >> "$SECRETS_FILE"
echo -e "${GREEN}✓ Guardado${NC}"
echo ""

echo -e "${YELLOW}VITE_FIREBASE_STORAGE_BUCKET${NC}"
echo "Generalmente: $FIREBASE_PROJECT_ID.appspot.com"
SUGGESTED_STORAGE_BUCKET="$FIREBASE_PROJECT_ID.appspot.com"
read -p "Ingresa VITE_FIREBASE_STORAGE_BUCKET [$SUGGESTED_STORAGE_BUCKET]: " VITE_FIREBASE_STORAGE_BUCKET
VITE_FIREBASE_STORAGE_BUCKET=${VITE_FIREBASE_STORAGE_BUCKET:-$SUGGESTED_STORAGE_BUCKET}
echo "VITE_FIREBASE_STORAGE_BUCKET=$VITE_FIREBASE_STORAGE_BUCKET" >> "$SECRETS_FILE"
echo -e "${GREEN}✓ Guardado${NC}"
echo ""

echo -e "${YELLOW}VITE_FIREBASE_MESSAGING_SENDER_ID${NC}"
read -p "Ingresa VITE_FIREBASE_MESSAGING_SENDER_ID: " VITE_FIREBASE_MESSAGING_SENDER_ID
if [ ! -z "$VITE_FIREBASE_MESSAGING_SENDER_ID" ]; then
    echo "VITE_FIREBASE_MESSAGING_SENDER_ID=$VITE_FIREBASE_MESSAGING_SENDER_ID" >> "$SECRETS_FILE"
    echo -e "${GREEN}✓ Guardado${NC}"
fi
echo ""

echo -e "${YELLOW}VITE_FIREBASE_APP_ID${NC}"
read -p "Ingresa VITE_FIREBASE_APP_ID: " VITE_FIREBASE_APP_ID
if [ ! -z "$VITE_FIREBASE_APP_ID" ]; then
    echo "VITE_FIREBASE_APP_ID=$VITE_FIREBASE_APP_ID" >> "$SECRETS_FILE"
    echo -e "${GREEN}✓ Guardado${NC}"
fi
echo ""

echo -e "${YELLOW}FIREBASE_SERVICE_ACCOUNT${NC}"
echo "⚠️  IMPORTANTE: Este debe ser el JSON completo del service account"
echo "Descargar de: Firebase Console → Settings → Service Accounts → Generate new private key"
echo ""
read -p "Ruta al archivo JSON del service account (o Enter para omitir): " SERVICE_ACCOUNT_PATH
if [ ! -z "$SERVICE_ACCOUNT_PATH" ] && [ -f "$SERVICE_ACCOUNT_PATH" ]; then
    SERVICE_ACCOUNT_JSON=$(cat "$SERVICE_ACCOUNT_PATH" | tr -d '\n')
    echo "FIREBASE_SERVICE_ACCOUNT=$SERVICE_ACCOUNT_JSON" >> "$SECRETS_FILE"
    echo -e "${GREEN}✓ Guardado desde archivo${NC}"
elif [ ! -z "$SERVICE_ACCOUNT_PATH" ]; then
    echo -e "${RED}❌ Archivo no encontrado${NC}"
fi
echo ""

# ===== PAYPAL SECRETS =====
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "3️⃣  PAYPAL SECRET (1)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Obtener de: https://developer.paypal.com/dashboard/"
echo "Apps & Credentials → Live (PRODUCCIÓN, no sandbox)"
echo ""

echo -e "${YELLOW}VITE_PAYPAL_CLIENT_ID${NC}"
read -p "Ingresa VITE_PAYPAL_CLIENT_ID (LIVE): " VITE_PAYPAL_CLIENT_ID
if [ ! -z "$VITE_PAYPAL_CLIENT_ID" ]; then
    echo "VITE_PAYPAL_CLIENT_ID=$VITE_PAYPAL_CLIENT_ID" >> "$SECRETS_FILE"
    echo -e "${GREEN}✓ Guardado${NC}"
fi
echo ""

# ===== RECAPTCHA SECRETS =====
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "4️⃣  RECAPTCHA SECRET (1)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Obtener de: https://www.google.com/recaptcha/admin"
echo ""

echo -e "${YELLOW}VITE_RECAPTCHA_SITE_KEY${NC}"
read -p "Ingresa VITE_RECAPTCHA_SITE_KEY: " VITE_RECAPTCHA_SITE_KEY
if [ ! -z "$VITE_RECAPTCHA_SITE_KEY" ]; then
    echo "VITE_RECAPTCHA_SITE_KEY=$VITE_RECAPTCHA_SITE_KEY" >> "$SECRETS_FILE"
    echo -e "${GREEN}✓ Guardado${NC}"
fi
echo ""

# ===== SUMMARY =====
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 RESUMEN"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

TOTAL_SECRETS=$(grep -c "=" "$SECRETS_FILE" 2>/dev/null || echo "0")
echo "Secrets configurados: $TOTAL_SECRETS / 11"
echo ""

if [ "$TOTAL_SECRETS" -lt 11 ]; then
    echo -e "${YELLOW}⚠️  Faltan $(( 11 - TOTAL_SECRETS )) secrets${NC}"
    echo "Puedes configurarlos después manualmente en GitHub"
    echo ""
fi

# ===== GITHUB CLI COMMANDS =====
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔧 COMANDOS PARA GITHUB CLI"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Si tienes GitHub CLI instalado (gh), ejecuta estos comandos:"
echo ""

OUTPUT_SCRIPT="/tmp/set-github-secrets.sh"
echo "#!/bin/bash" > "$OUTPUT_SCRIPT"
echo "# Auto-generated GitHub secrets setup" >> "$OUTPUT_SCRIPT"
echo "" >> "$OUTPUT_SCRIPT"

while IFS='=' read -r key value; do
    if [ ! -z "$key" ] && [ ! -z "$value" ]; then
        echo "gh secret set $key --body '$value'" >> "$OUTPUT_SCRIPT"
        echo "gh secret set $key --body 'HIDDEN'"
    fi
done < "$SECRETS_FILE"

chmod +x "$OUTPUT_SCRIPT"

echo ""
echo -e "${GREEN}✓ Script generado en: $OUTPUT_SCRIPT${NC}"
echo ""

# ===== MANUAL SETUP INSTRUCTIONS =====
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🖱️  CONFIGURACIÓN MANUAL (SIN GitHub CLI)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "1. Ve a: https://github.com/CFZ6S2/FZ6/settings/secrets/actions"
echo "2. Click en 'New repository secret'"
echo "3. Para cada secret:"
echo ""

while IFS='=' read -r key value; do
    if [ ! -z "$key" ] && [ ! -z "$value" ]; then
        echo "   - Name: $key"
        echo "     Value: [ver archivo de secrets]"
        echo ""
    fi
done < "$SECRETS_FILE"

echo ""
echo -e "${YELLOW}Los valores están guardados en: $SECRETS_FILE${NC}"
echo -e "${RED}⚠️  IMPORTANTE: Elimina este archivo después de configurar los secrets${NC}"
echo ""

# ===== NEXT STEPS =====
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ PRÓXIMOS PASOS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "1. Configurar secrets en GitHub (usar comandos de arriba)"
echo "2. Habilitar GitHub Actions:"
echo "   Settings → Actions → General → Read and write permissions"
echo "3. Hacer un push a main:"
echo "   git push origin main"
echo "4. Ver workflows en:"
echo "   https://github.com/CFZ6S2/FZ6/actions"
echo ""
echo -e "${GREEN}¡Listo! Tu CI/CD se activará automáticamente 🚀${NC}"
echo ""
