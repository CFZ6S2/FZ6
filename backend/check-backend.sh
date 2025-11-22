#!/bin/bash
# Script para verificar tu backend cuando esté desplegado
# Guarda este archivo como check-backend.sh en tu servidor Linux/Mac

echo "🚀 Verificando tu backend en Render..."
echo "Tiempo: $(date)"

# Función para verificar endpoint
function check_endpoint() {
    local url=$1
    local name=$2
    echo "Probando $name: $url"
    
    response=$(curl -s -w "\n%{http_code}" "$url" 2>//null)
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | head -n-1)
    
    if [ "$http_code" = "200" ]; then
        echo "✅ $name - EXITO (HTTP $http_code)"
        echo "Respuesta: $body"
        return 0
    else
        echo "❌ $name - FALLÓ (HTTP $http_code)"
        return 1
    fi
}

# URLs a verificar (reemplaza con tu URL real)
BASE_URL="https://TU_SERVICIO_AQUI.onrender.com"

echo ""
echo "📍 Usando URL base: $BASE_URL"
echo ""

# Verificar endpoints principales
check_endpoint "$BASE_URL/health" "Health Check"
check_endpoint "$BASE_URL/" "Root Endpoint"
check_endpoint "$BASE_URL/docs" "API Documentation"

echo ""
echo "🎯 Si ves ✅ en Health Check, ¡tu backend está funcionando!"
echo "💡 Recuerda reemplazar TU_SERVICIO_AQUI con tu URL real de Render"