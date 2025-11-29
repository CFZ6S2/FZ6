#!/bin/bash
##
# Script para llamar a la Cloud Function createFirstAdmin
# Uso: ./scripts/call-create-admin.sh EMAIL SECRET
#
# Ejemplo:
#   ./scripts/call-create-admin.sh cesar.herrera.rojo@gmail.com MiSecreto123
##

set -e

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

EMAIL="${1}"
SECRET="${2}"
GENDER="${3:-masculino}"
FUNCTION_URL="${4:-https://us-central1-tuscitasseguras-2d1a6.cloudfunctions.net/createFirstAdmin}"

if [ -z "$EMAIL" ]; then
  echo -e "${RED}❌ Error: Email es requerido${NC}"
  echo ""
  echo -e "${YELLOW}Uso:${NC}"
  echo "  $0 EMAIL SECRET [GENDER] [FUNCTION_URL]"
  echo ""
  echo -e "${YELLOW}Ejemplos:${NC}"
  echo "  $0 cesar.herrera.rojo@gmail.com MiSecreto123"
  echo "  $0 cesar.herrera.rojo@gmail.com MiSecreto123 masculino"
  echo "  $0 lacasitadebarajas@gmail.com MiSecreto123 femenino"
  echo ""
  exit 1
fi

if [ -z "$SECRET" ]; then
  echo -e "${RED}❌ Error: Secreto es requerido${NC}"
  echo ""
  echo -e "${YELLOW}Uso:${NC}"
  echo "  $0 EMAIL SECRET [GENDER] [FUNCTION_URL]"
  echo ""
  exit 1
fi

echo -e "${BLUE}🚀 Creando administrador...${NC}"
echo -e "${BLUE}📧 Email: ${EMAIL}${NC}"
echo -e "${BLUE}👤 Género: ${GENDER}${NC}"
echo -e "${BLUE}🔗 URL: ${FUNCTION_URL}${NC}"
echo ""

# Llamar a la Cloud Function
response=$(curl -s -X POST \
  "${FUNCTION_URL}" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"${EMAIL}\",
    \"gender\": \"${GENDER}\",
    \"adminSecret\": \"${SECRET}\"
  }")

# Verificar si la respuesta contiene "success": true
if echo "$response" | grep -q '"success"\s*:\s*true'; then
  echo -e "${GREEN}✅ ¡ÉXITO!${NC}"
  echo ""
  echo -e "${BLUE}Respuesta:${NC}"
  echo "$response" | python3 -m json.tool 2>/dev/null || echo "$response"
  echo ""
  echo -e "${YELLOW}📝 Próximos pasos:${NC}"
  echo "1. Ve a la página de login"
  echo "2. Click en 'Olvidé mi contraseña'"
  echo "3. Ingresa: ${EMAIL}"
  echo "4. Revisa tu correo y establece una nueva contraseña"
  echo ""
else
  echo -e "${RED}❌ ERROR${NC}"
  echo ""
  echo -e "${BLUE}Respuesta:${NC}"
  echo "$response" | python3 -m json.tool 2>/dev/null || echo "$response"
  echo ""
  exit 1
fi
