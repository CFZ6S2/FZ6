#!/bin/bash
##
# Script para crear TODOS los administradores de TuCitaSegura
#
# Este script crea las siguientes cuentas de administrador:
#   1. cesar.herrera.rojo@gmail.com (masculino)
#   2. lacasitadebarajas@gmail.com (femenino)
#   3. gonzalo.hrrj@gmail.com (masculino)
#
# Uso:
#   ./scripts/create-all-admins.sh SECRET
#
# Ejemplo:
#   ./scripts/create-all-admins.sh MiSecreto2025!XYZ
##

set -e

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m' # No Color

SECRET="${1}"
FUNCTION_URL="${2:-https://us-central1-tuscitasseguras-2d1a6.cloudfunctions.net/createFirstAdmin}"

if [ -z "$SECRET" ]; then
  echo -e "${RED}❌ Error: Secreto es requerido${NC}"
  echo ""
  echo -e "${YELLOW}Uso:${NC}"
  echo "  $0 SECRET [FUNCTION_URL]"
  echo ""
  echo -e "${YELLOW}Ejemplo:${NC}"
  echo "  $0 MiSecreto2025!XYZ"
  echo ""
  exit 1
fi

# Lista de admins a crear
declare -A ADMINS=(
  ["cesar.herrera.rojo@gmail.com"]="masculino"
  ["lacasitadebarajas@gmail.com"]="femenino"
  ["gonzalo.hrrj@gmail.com"]="masculino"
)

echo -e "${MAGENTA}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}🚀 Creando ${#ADMINS[@]} cuentas de administrador...${NC}"
echo -e "${MAGENTA}═══════════════════════════════════════════════════════════${NC}"
echo ""

success_count=0
fail_count=0
failed_emails=""

for email in "${!ADMINS[@]}"; do
  gender="${ADMINS[$email]}"

  echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${BLUE}📧 Creando: ${email}${NC}"
  echo -e "${BLUE}👤 Género: ${gender}${NC}"
  echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

  # Llamar a la Cloud Function
  response=$(curl -s -X POST \
    "${FUNCTION_URL}" \
    -H "Content-Type: application/json" \
    -d "{
      \"email\": \"${email}\",
      \"gender\": \"${gender}\",
      \"adminSecret\": \"${SECRET}\"
    }")

  # Verificar si fue exitoso
  if echo "$response" | grep -q '"success"\s*:\s*true'; then
    echo -e "${GREEN}✅ ÉXITO: ${email}${NC}"
    ((success_count++))
  else
    echo -e "${RED}❌ ERROR: ${email}${NC}"
    echo -e "${RED}Respuesta:${NC}"
    echo "$response" | python3 -m json.tool 2>/dev/null || echo "$response"
    ((fail_count++))
    failed_emails="${failed_emails}\n  - ${email}"
  fi

  echo ""

  # Pequeña pausa entre requests para no sobrecargar
  sleep 1
done

# Resumen final
echo -e "${MAGENTA}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}📊 RESUMEN${NC}"
echo -e "${MAGENTA}═══════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}✅ Exitosos: ${success_count}/${#ADMINS[@]}${NC}"

if [ $fail_count -gt 0 ]; then
  echo -e "${RED}❌ Fallidos: ${fail_count}/${#ADMINS[@]}${NC}"
  echo -e "${RED}Emails fallidos:${failed_emails}${NC}"
  echo ""
  exit 1
fi

echo ""
echo -e "${YELLOW}📝 Próximos pasos:${NC}"
echo "1. Cada admin debe ir a la página de login"
echo "2. Click en 'Olvidé mi contraseña'"
echo "3. Ingresa su email respectivo"
echo "4. Revisa el correo y establece una nueva contraseña"
echo ""
echo -e "${CYAN}Lista de admins creados:${NC}"
for email in "${!ADMINS[@]}"; do
  echo "  📧 ${email} (${ADMINS[$email]})"
done
echo ""
echo -e "${GREEN}🎉 ¡Todos los administradores creados exitosamente!${NC}"
echo ""
