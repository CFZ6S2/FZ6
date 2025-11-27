#!/bin/bash
# Script rápido para solucionar error 503 en Railway
# Autor: Claude
# Fecha: 2025-11-27

set -e

echo "🔧 TuCitaSegura - Solucionador de Error 503"
echo "=========================================="
echo ""

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Función para verificar si Railway CLI está instalado
check_railway_cli() {
    if ! command -v railway &> /dev/null; then
        echo -e "${RED}❌ Railway CLI no está instalado${NC}"
        echo ""
        echo "Instalar con:"
        echo "  npm install -g @railway/cli"
        echo ""
        exit 1
    fi
    echo -e "${GREEN}✅ Railway CLI instalado${NC}"
}

# Función para generar SECRET_KEY
generate_secret_key() {
    if command -v openssl &> /dev/null; then
        openssl rand -hex 32
    else
        python3 -c "import secrets; print(secrets.token_urlsafe(32))"
    fi
}

# Verificar Railway CLI
check_railway_cli

echo ""
echo "📋 PASO 1: Verificando variables de entorno en Railway"
echo "------------------------------------------------------"

# Obtener variables actuales
echo "Variables actuales:"
railway variables 2>&1 | grep -E "(SECRET_KEY|ENVIRONMENT|FIREBASE_PROJECT_ID|CORS_ORIGINS|DEBUG)" || echo "No se pudieron leer las variables"

echo ""
read -p "¿Necesitas configurar las variables de entorno? (s/N): " CONFIGURE_VARS

if [[ "$CONFIGURE_VARS" =~ ^[Ss]$ ]]; then
    echo ""
    echo "🔑 Generando SECRET_KEY..."
    SECRET_KEY=$(generate_secret_key)
    echo -e "${GREEN}SECRET_KEY generado: ${SECRET_KEY:0:20}...${NC}"

    echo ""
    echo "📝 Configurando variables en Railway..."

    railway variables set SECRET_KEY="$SECRET_KEY"
    railway variables set ENVIRONMENT="production"
    railway variables set DEBUG="false"
    railway variables set FIREBASE_PROJECT_ID="tuscitasseguras-2d1a6"
    railway variables set CORS_ORIGINS="https://tucitasegura.com,https://www.tucitasegura.com,https://tuscitasseguras-2d1a6.web.app,https://tuscitasseguras-2d1a6.firebaseapp.com"
    railway variables set API_WORKERS="4"

    echo -e "${GREEN}✅ Variables configuradas${NC}"
fi

echo ""
echo "📋 PASO 2: Verificando credenciales de Firebase"
echo "------------------------------------------------------"

# Verificar si existe FIREBASE_SERVICE_ACCOUNT_B64
HAS_FIREBASE=$(railway variables 2>&1 | grep -c "FIREBASE_SERVICE_ACCOUNT_B64" || echo "0")

if [ "$HAS_FIREBASE" = "0" ]; then
    echo -e "${YELLOW}⚠️  FIREBASE_SERVICE_ACCOUNT_B64 no está configurado${NC}"
    echo ""
    echo "Para configurar Firebase:"
    echo "1. Ve a: https://console.firebase.google.com/project/tuscitasseguras-2d1a6/settings/serviceaccounts/adminsdk"
    echo "2. Click 'Generate New Private Key'"
    echo "3. Descarga el archivo JSON"
    echo "4. Convierte a Base64:"
    echo "   cat archivo.json | base64 -w 0"
    echo "5. Agrega en Railway:"
    echo "   railway variables set FIREBASE_SERVICE_ACCOUNT_B64=\"[base64_string]\""
    echo ""
    read -p "¿Ya tienes el archivo JSON de Firebase? (s/N): " HAS_JSON

    if [[ "$HAS_JSON" =~ ^[Ss]$ ]]; then
        read -p "Ruta al archivo JSON: " JSON_PATH

        if [ -f "$JSON_PATH" ]; then
            echo "Convirtiendo a Base64..."
            B64_STRING=$(cat "$JSON_PATH" | base64 -w 0 2>/dev/null || cat "$JSON_PATH" | base64)

            echo "Configurando en Railway..."
            railway variables set FIREBASE_SERVICE_ACCOUNT_B64="$B64_STRING"

            echo -e "${GREEN}✅ Firebase credentials configuradas${NC}"
        else
            echo -e "${RED}❌ Archivo no encontrado: $JSON_PATH${NC}"
        fi
    fi
else
    echo -e "${GREEN}✅ Firebase credentials ya configuradas${NC}"
fi

echo ""
echo "📋 PASO 3: Verificando start.sh"
echo "------------------------------------------------------"

if [ -f "backend/start.sh" ]; then
    if grep -q 'PORT' backend/start.sh; then
        echo -e "${GREEN}✅ start.sh usa variable PORT${NC}"
    else
        echo -e "${YELLOW}⚠️  start.sh NO usa variable PORT${NC}"
        echo "Corrigiendo..."

        cat > backend/start.sh << 'EOF'
#!/bin/bash
# Railway startup script for TuCitaSegura backend

# Activate virtualenv if it exists
if [ -d "/app/venv" ]; then
    source /app/venv/bin/activate
    echo "Virtualenv activated"
fi

# Set PORT with fallback - ensure it's a number
if [ -z "$PORT" ]; then
    PORT=8000
fi

echo "Starting uvicorn on port $PORT"

# Start uvicorn from current directory (should already be in backend/)
exec uvicorn main:app --host 0.0.0.0 --port "$PORT"
EOF

        chmod +x backend/start.sh
        echo -e "${GREEN}✅ start.sh corregido${NC}"

        # Commit changes
        git add backend/start.sh
        git commit -m "fix: Ensure start.sh uses PORT environment variable" || echo "No changes to commit"
    fi
else
    echo -e "${RED}❌ backend/start.sh no encontrado${NC}"
fi

echo ""
echo "📋 PASO 4: Redeploy"
echo "------------------------------------------------------"

read -p "¿Quieres hacer redeploy ahora? (s/N): " DO_DEPLOY

if [[ "$DO_DEPLOY" =~ ^[Ss]$ ]]; then
    echo ""
    echo "🚀 Desplegando a Railway..."

    cd backend
    railway up
    cd ..

    echo ""
    echo -e "${GREEN}✅ Deploy iniciado${NC}"
    echo ""
    echo "⏳ IMPORTANTE: El primer deploy puede tardar 3-5 minutos"
    echo "   - Build: ~2-3 min"
    echo "   - Cold start: ~1-2 min"
    echo "   - Health check: ~30 seg"
    echo ""
    read -p "¿Quieres esperar y verificar? (s/N): " WAIT_AND_CHECK

    if [[ "$WAIT_AND_CHECK" =~ ^[Ss]$ ]]; then
        echo ""
        echo "Esperando 3 minutos..."

        for i in {180..1}; do
            printf "\rTiempo restante: %02d:%02d" $((i/60)) $((i%60))
            sleep 1
        done

        echo ""
        echo ""
        echo "🔍 Verificando health check..."

        RAILWAY_URL=$(railway status --json 2>/dev/null | grep -o '"url":"[^"]*' | cut -d'"' -f4 || echo "")

        if [ -z "$RAILWAY_URL" ]; then
            echo -e "${YELLOW}⚠️  No se pudo obtener la URL automáticamente${NC}"
            read -p "Ingresa la URL de Railway (ej: https://fz6-production.up.railway.app): " RAILWAY_URL
        fi

        HEALTH_URL="${RAILWAY_URL}/health"

        echo "Verificando: $HEALTH_URL"

        HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$HEALTH_URL" || echo "000")

        if [ "$HTTP_CODE" = "200" ]; then
            echo -e "${GREEN}✅ ¡Health check EXITOSO!${NC}"
            echo ""
            curl -s "$HEALTH_URL" | python3 -m json.tool 2>/dev/null || curl -s "$HEALTH_URL"
        else
            echo -e "${RED}❌ Health check FALLÓ (HTTP $HTTP_CODE)${NC}"
            echo ""
            echo "Posibles causas:"
            echo "1. El servicio aún está arrancando (espera 2-3 min más)"
            echo "2. Error en la configuración (ver logs)"
            echo "3. Falta alguna variable de entorno"
            echo ""
            echo "Ver logs con:"
            echo "  railway logs -f"
        fi
    fi
fi

echo ""
echo "=========================================="
echo "🎯 RESUMEN"
echo "=========================================="
echo ""
echo "Próximos pasos:"
echo "1. Ver logs en tiempo real:"
echo "   railway logs -f"
echo ""
echo "2. Verificar health check:"
echo "   curl https://fz6-production.up.railway.app/health"
echo ""
echo "3. Ver dashboard de Railway:"
echo "   railway open"
echo ""
echo "4. Si sigue sin funcionar:"
echo "   - Ver TROUBLESHOOT_503_ERROR.md"
echo "   - Verificar logs en Railway Dashboard"
echo "   - Contactar soporte de Railway"
echo ""
echo -e "${GREEN}✅ Script completado${NC}"
