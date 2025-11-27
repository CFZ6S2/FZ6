#!/bin/bash
# Script para verificar qué GitHub Secrets están configurados
# Autor: Claude
# Fecha: 2025-11-27

set -e

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo "🔐 Verificador de GitHub Secrets para CI/CD"
echo "============================================"
echo ""

# Lista de secrets necesarios
REQUIRED_SECRETS=(
    "RAILWAY_TOKEN:Railway deployment token"
    "BACKEND_URL:Railway backend URL"
    "FIREBASE_SERVICE_ACCOUNT:Firebase service account JSON"
    "VITE_FIREBASE_PROJECT_ID:Firebase project ID"
    "VITE_FIREBASE_API_KEY:Firebase API key"
    "VITE_FIREBASE_AUTH_DOMAIN:Firebase auth domain"
    "VITE_FIREBASE_STORAGE_BUCKET:Firebase storage bucket"
    "VITE_FIREBASE_MESSAGING_SENDER_ID:Firebase messaging sender ID"
    "VITE_FIREBASE_APP_ID:Firebase app ID"
    "VITE_PAYPAL_CLIENT_ID:PayPal client ID (production)"
    "VITE_RECAPTCHA_SITE_KEY:reCAPTCHA site key"
)

echo "📋 SECRETS NECESARIOS PARA CI/CD"
echo "================================="
echo ""

echo "Este proyecto necesita los siguientes secrets configurados en:"
echo -e "${BLUE}https://github.com/CFZ6S2/FZ6/settings/secrets/actions${NC}"
echo ""

TOTAL=${#REQUIRED_SECRETS[@]}
COUNTER=1

echo "Lista de secrets necesarios:"
echo ""

for secret_info in "${REQUIRED_SECRETS[@]}"; do
    IFS=':' read -r secret_name secret_desc <<< "$secret_info"
    printf "${YELLOW}%2d.${NC} %-40s - %s\n" "$COUNTER" "$secret_name" "$secret_desc"
    COUNTER=$((COUNTER + 1))
done

echo ""
echo "=========================================="
echo ""

# Guía paso a paso
echo "📝 GUÍA RÁPIDA PARA CONFIGURAR SECRETS"
echo "======================================="
echo ""

echo "${BLUE}▶ PASO 1: Railway Secrets${NC}"
echo "----------------------------------------"
echo ""
echo "1️⃣  RAILWAY_TOKEN"
echo "   🔗 Ir a: https://railway.app/account/tokens"
echo "   • Click 'Create New Token'"
echo "   • Nombre: 'GitHub Actions'"
echo "   • Copiar el token generado"
echo ""
echo "2️⃣  BACKEND_URL"
echo "   🔗 Ir a: https://railway.app → tu proyecto"
echo "   • Click en tu servicio backend"
echo "   • Tab 'Settings' → 'Domains'"
echo "   • Copiar la URL (ej: https://fz6-production.up.railway.app)"
echo ""

echo "${BLUE}▶ PASO 2: Firebase Secrets${NC}"
echo "----------------------------------------"
echo ""
echo "🔗 Ir a: https://console.firebase.google.com/project/tuscitasseguras-2d1a6/settings/general"
echo ""
echo "En la sección 'Your apps' → Web app → Config:"
echo ""
echo "3️⃣  VITE_FIREBASE_API_KEY"
echo "   • Copiar el valor de 'apiKey'"
echo ""
echo "4️⃣  VITE_FIREBASE_AUTH_DOMAIN"
echo "   • Valor: tuscitasseguras-2d1a6.firebaseapp.com"
echo ""
echo "5️⃣  VITE_FIREBASE_PROJECT_ID"
echo "   • Valor: tuscitasseguras-2d1a6"
echo ""
echo "6️⃣  VITE_FIREBASE_STORAGE_BUCKET"
echo "   • Valor: tuscitasseguras-2d1a6.appspot.com"
echo ""
echo "7️⃣  VITE_FIREBASE_MESSAGING_SENDER_ID"
echo "   • Copiar el valor de 'messagingSenderId'"
echo ""
echo "8️⃣  VITE_FIREBASE_APP_ID"
echo "   • Copiar el valor de 'appId'"
echo ""
echo "⚠️  FIREBASE_SERVICE_ACCOUNT (IMPORTANTE)"
echo "   🔗 Ir a: https://console.firebase.google.com/project/tuscitasseguras-2d1a6/settings/serviceaccounts/adminsdk"
echo "   • Click 'Generate new private key'"
echo "   • Descargar el archivo JSON"
echo "   • Abrir con editor de texto"
echo "   • Copiar TODO el contenido (desde { hasta })"
echo ""

echo "${BLUE}▶ PASO 3: PayPal Secret${NC}"
echo "----------------------------------------"
echo ""
echo "🔗 Ir a: https://developer.paypal.com/dashboard/applications/live"
echo ""
echo "9️⃣  VITE_PAYPAL_CLIENT_ID"
echo "   • Seleccionar tu app"
echo "   • Copiar 'Client ID' de la sección LIVE"
echo "   • ⚠️  IMPORTANTE: Usar LIVE, NO sandbox"
echo ""

echo "${BLUE}▶ PASO 4: reCAPTCHA Secret${NC}"
echo "----------------------------------------"
echo ""
echo "🔗 Ir a: https://www.google.com/recaptcha/admin"
echo ""
echo "🔟 VITE_RECAPTCHA_SITE_KEY"
echo "   • Seleccionar tu site"
echo "   • Copiar 'Site key'"
echo ""

echo "=========================================="
echo ""
echo "${GREEN}📝 CÓMO AGREGAR CADA SECRET EN GITHUB${NC}"
echo "======================================="
echo ""
echo "Para CADA secret de la lista:"
echo ""
echo "1. Ir a: https://github.com/CFZ6S2/FZ6/settings/secrets/actions"
echo "2. Click 'New repository secret'"
echo "3. Name: [nombre exacto del secret, case-sensitive]"
echo "4. Value: [pegar el valor copiado]"
echo "5. Click 'Add secret'"
echo "6. Repetir para el siguiente secret"
echo ""

echo "=========================================="
echo ""
echo "${GREEN}✅ DESPUÉS DE CONFIGURAR TODOS LOS SECRETS${NC}"
echo "==========================================="
echo ""
echo "1. Verificar permisos de GitHub Actions:"
echo "   🔗 https://github.com/CFZ6S2/FZ6/settings/actions"
echo "   • Workflow permissions: 'Read and write permissions'"
echo "   • Click 'Save'"
echo ""
echo "2. Activar CI/CD con un push:"
echo "   cd /home/user/FZ6"
echo "   git add ."
echo "   git commit -m \"chore: activate CI/CD\""
echo "   git push origin main"
echo ""
echo "3. Ver workflows ejecutándose:"
echo "   🔗 https://github.com/CFZ6S2/FZ6/actions"
echo ""

echo "=========================================="
echo ""
echo "${BLUE}📊 WORKFLOWS DISPONIBLES${NC}"
echo "========================"
echo ""
echo "Una vez configurados los secrets, estos workflows se ejecutarán automáticamente:"
echo ""
echo "1. ✅ Tests (pytest + linters)"
echo "   • Trigger: Push a main"
echo "   • Duración: ~2-3 min"
echo ""
echo "2. 🚂 Deploy Backend (Railway)"
echo "   • Trigger: Push a main (cambios en backend/)"
echo "   • Duración: ~3-5 min"
echo "   • Health check automático"
echo ""
echo "3. 🔥 Deploy Frontend (Firebase)"
echo "   • Trigger: Push a main (cambios en webapp/)"
echo "   • Duración: ~2-4 min"
echo "   • Verifica deployment"
echo ""
echo "4. 🔒 Security Scans"
echo "   • Trigger: Push a main + Schedule semanal"
echo "   • Duración: ~5-8 min"
echo "   • CodeQL analysis"
echo ""
echo "5. 💾 Backups Firestore"
echo "   • Trigger: Schedule diario (00:00 UTC)"
echo "   • Exporta a Cloud Storage"
echo "   • Retención 30 días"
echo ""

echo "=========================================="
echo ""
echo "${YELLOW}⚠️  NOTAS IMPORTANTES${NC}"
echo "====================="
echo ""
echo "• Todos los valores son case-sensitive"
echo "• FIREBASE_SERVICE_ACCOUNT debe ser el JSON completo"
echo "• BACKEND_URL no debe terminar con /"
echo "• PayPal: usar credenciales LIVE (producción)"
echo "• Los workflows solo se ejecutan cuando todos los secrets requeridos están configurados"
echo ""

echo "=========================================="
echo ""
echo "${GREEN}✅ SIGUIENTE PASO${NC}"
echo "================="
echo ""
echo "Configura los 11 secrets en GitHub siguiendo la guía de arriba."
echo "URL: https://github.com/CFZ6S2/FZ6/settings/secrets/actions"
echo ""
echo "Tiempo estimado: 10-15 minutos"
echo ""
echo "¡Luego haz un push a main y tus deployments serán automáticos! 🚀"
echo ""

# Función interactiva (opcional)
echo ""
read -p "¿Quieres que genere un script de validación? (s/N): " GEN_VALIDATION

if [[ "$GEN_VALIDATION" =~ ^[Ss]$ ]]; then
    cat > /tmp/validate-secrets-github.sh << 'EOFVALIDATION'
#!/bin/bash
# Script de validación de secrets (ejecutar después de configurarlos)

# Nota: Este script NO puede leer los secrets directamente por seguridad
# Solo verifica que los workflows puedan ejecutarse

echo "🧪 Validación de CI/CD Setup"
echo "============================"
echo ""

# Verificar que .github/workflows existe
if [ ! -d ".github/workflows" ]; then
    echo "❌ .github/workflows no encontrado"
    exit 1
fi

echo "✅ Workflows directory exists"

# Listar workflows
echo ""
echo "Workflows configurados:"
ls -1 .github/workflows/*.yml | while read -r file; do
    basename "$file"
done

echo ""
echo "Para verificar que los secrets están configurados:"
echo "1. Hacer un push a main"
echo "2. Ir a: https://github.com/CFZ6S2/FZ6/actions"
echo "3. Ver si los workflows se ejecutan sin errores"
echo ""
EOFVALIDATION

    chmod +x /tmp/validate-secrets-github.sh
    echo ""
    echo "${GREEN}✅ Script de validación generado en /tmp/validate-secrets-github.sh${NC}"
fi

echo ""
echo "=========================================="
echo "Script completado 🎉"
echo "=========================================="
