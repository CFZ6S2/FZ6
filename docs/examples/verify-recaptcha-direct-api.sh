#!/bin/bash

# Script de ejemplo para verificar reCAPTCHA Enterprise usando la API REST directamente
# Requiere: jq (para parsear JSON)

# ============================================================================
# CONFIGURACIÓN
# ============================================================================

# Proyecto de Firebase
PROJECT_ID="tuscitasseguras-2d1a6"

# Site Key de reCAPTCHA Enterprise
SITE_KEY="6Lc4QBcsAAAAACFZLEgaTz3DuLGiBuXpScrBKt7w"

# API Key de Google Cloud (obtener de Google Cloud Console)
# https://console.cloud.google.com/apis/credentials?project=tuscitasseguras-2d1a6
API_KEY="YOUR_API_KEY_HERE"

# Token de reCAPTCHA (obtener ejecutando grecaptcha.enterprise.execute() en el navegador)
RECAPTCHA_TOKEN="$1"

# Acción esperada
EXPECTED_ACTION="${2:-login}"

# ============================================================================
# VALIDACIONES
# ============================================================================

if [ -z "$RECAPTCHA_TOKEN" ]; then
  echo "❌ Error: Token de reCAPTCHA no proporcionado"
  echo ""
  echo "Uso:"
  echo "  $0 <recaptcha-token> [acción]"
  echo ""
  echo "Ejemplo:"
  echo "  $0 'eyJhbGci....' login"
  echo ""
  echo "Para obtener un token:"
  echo "  1. Abre la consola del navegador (F12) en tu sitio"
  echo "  2. Ejecuta:"
  echo "     const token = await grecaptcha.enterprise.execute('$SITE_KEY', { action: 'login' });"
  echo "     console.log(token);"
  echo "  3. Copia el token y úsalo como primer parámetro"
  exit 1
fi

if [ "$API_KEY" = "YOUR_API_KEY_HERE" ]; then
  echo "⚠️  API_KEY no configurada"
  echo ""
  echo "Para obtener una API Key:"
  echo "  1. Ve a: https://console.cloud.google.com/apis/credentials?project=$PROJECT_ID"
  echo "  2. Click en 'CREATE CREDENTIALS' → 'API key'"
  echo "  3. Restringe la key a 'reCAPTCHA Enterprise API'"
  echo "  4. Copia la key y pégala en este script (línea 14)"
  echo ""
  exit 1
fi

# ============================================================================
# CREAR REQUEST JSON
# ============================================================================

REQUEST_JSON=$(cat <<EOF
{
  "event": {
    "token": "$RECAPTCHA_TOKEN",
    "expectedAction": "$EXPECTED_ACTION",
    "siteKey": "$SITE_KEY"
  }
}
EOF
)

echo "📝 Request JSON:"
echo "$REQUEST_JSON" | jq .
echo ""

# ============================================================================
# LLAMAR A LA API
# ============================================================================

echo "🔐 Verificando reCAPTCHA con Google Cloud API..."
echo ""

API_URL="https://recaptchaenterprise.googleapis.com/v1/projects/$PROJECT_ID/assessments?key=$API_KEY"

RESPONSE=$(curl -s -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -d "$REQUEST_JSON")

# ============================================================================
# PARSEAR RESPUESTA
# ============================================================================

echo "📊 Respuesta de la API:"
echo "$RESPONSE" | jq .
echo ""

# Extraer información clave
TOKEN_VALID=$(echo "$RESPONSE" | jq -r '.tokenProperties.valid // false')
SCORE=$(echo "$RESPONSE" | jq -r '.riskAnalysis.score // 0')
ACTION=$(echo "$RESPONSE" | jq -r '.tokenProperties.action // "unknown"')
REASONS=$(echo "$RESPONSE" | jq -r '.riskAnalysis.reasons // [] | join(", ")')

# ============================================================================
# MOSTRAR RESULTADOS
# ============================================================================

echo "═══════════════════════════════════════════════════════"
echo "RESULTADOS DE LA VERIFICACIÓN"
echo "═══════════════════════════════════════════════════════"
echo ""
echo "✓ Token válido:        $TOKEN_VALID"
echo "✓ Score (0.0-1.0):     $SCORE"
echo "✓ Acción detectada:    $ACTION"
echo "✓ Acción esperada:     $EXPECTED_ACTION"
echo "✓ Razones de riesgo:   ${REASONS:-Ninguna}"
echo ""

# Interpretación del score
if (( $(echo "$SCORE >= 0.7" | bc -l) )); then
  echo "🟢 RESULTADO: Muy probablemente humano (score alto)"
elif (( $(echo "$SCORE >= 0.5" | bc -l) )); then
  echo "🟡 RESULTADO: Probablemente humano (score medio)"
elif (( $(echo "$SCORE >= 0.3" | bc -l) )); then
  echo "🟠 RESULTADO: Sospechoso (score bajo)"
else
  echo "🔴 RESULTADO: Muy probablemente bot (score muy bajo)"
fi

echo ""

# Verificar acción
if [ "$ACTION" = "$EXPECTED_ACTION" ]; then
  echo "✅ La acción coincide"
else
  echo "⚠️  La acción NO coincide (esperada: $EXPECTED_ACTION, detectada: $ACTION)"
fi

echo ""
echo "═══════════════════════════════════════════════════════"

# ============================================================================
# EJEMPLO DE USO CON CLOUD FUNCTION (ALTERNATIVA RECOMENDADA)
# ============================================================================

echo ""
echo "💡 TIP: Es más seguro usar Cloud Functions en lugar de la API REST directa:"
echo ""
echo "# Usando Cloud Function HTTP:"
echo "curl -X POST https://us-central1-$PROJECT_ID.cloudfunctions.net/verifyRecaptcha \\"
echo "  -H 'Content-Type: application/json' \\"
echo "  -d '{\"token\":\"$RECAPTCHA_TOKEN\",\"action\":\"$EXPECTED_ACTION\"}'"
echo ""
echo "# Ventajas:"
echo "  - No expone la API key en el frontend"
echo "  - Más seguro y fácil de mantener"
echo "  - Incluye rate limiting y validaciones adicionales"
echo ""
