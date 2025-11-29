#!/bin/bash
##
# Script para desplegar la página de admin login a Firebase Hosting
# Uso: ./scripts/deploy-admin-login.sh
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

echo -e "${MAGENTA}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}🚀 Desplegando Admin Login a Firebase Hosting${NC}"
echo -e "${MAGENTA}═══════════════════════════════════════════════════════════${NC}"
echo ""

# Verificar que estamos en el directorio correcto
if [ ! -f "firebase.json" ]; then
  echo -e "${RED}❌ Error: No se encuentra firebase.json${NC}"
  echo -e "${YELLOW}Asegúrate de ejecutar este script desde el directorio raíz del proyecto${NC}"
  exit 1
fi

# Verificar que firebase CLI está instalado
if ! command -v firebase &> /dev/null; then
  echo -e "${RED}❌ Firebase CLI no está instalado${NC}"
  echo ""
  echo -e "${YELLOW}Instala Firebase CLI con:${NC}"
  echo -e "${CYAN}  npm install -g firebase-tools${NC}"
  echo ""
  exit 1
fi

echo -e "${GREEN}✅ Firebase CLI encontrado${NC}"

# Verificar que el archivo admin-login.html existe
if [ ! -f "webapp/admin-login.html" ]; then
  echo -e "${RED}❌ Error: No se encuentra webapp/admin-login.html${NC}"
  echo -e "${YELLOW}Asegúrate de hacer pull de los últimos cambios${NC}"
  exit 1
fi

echo -e "${GREEN}✅ Archivo admin-login.html encontrado${NC}"
echo ""

# Pull de los últimos cambios
echo -e "${BLUE}📥 Descargando últimos cambios...${NC}"
git pull origin claude/create-admin-accounts-01LkTEd7vr1HCgfaW11nZbtv || {
  echo -e "${YELLOW}⚠️  No se pudo hacer pull automático${NC}"
  echo -e "${YELLOW}Continúa de todas formas...${NC}"
}
echo ""

# Verificar autenticación
echo -e "${BLUE}🔑 Verificando autenticación...${NC}"
firebase projects:list &> /dev/null || {
  echo -e "${YELLOW}⚠️  No estás autenticado en Firebase${NC}"
  echo -e "${BLUE}Ejecutando firebase login...${NC}"
  firebase login
}

echo -e "${GREEN}✅ Autenticado en Firebase${NC}"
echo ""

# Confirmar proyecto
echo -e "${BLUE}📋 Proyecto: tuscitasseguras-2d1a6${NC}"
firebase use tuscitasseguras-2d1a6 || {
  echo -e "${RED}❌ Error: No se pudo seleccionar el proyecto${NC}"
  exit 1
}
echo ""

# Desplegar solo hosting
echo -e "${MAGENTA}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}🚀 Desplegando a Firebase Hosting...${NC}"
echo -e "${MAGENTA}═══════════════════════════════════════════════════════════${NC}"
echo ""

firebase deploy --only hosting

echo ""
echo -e "${MAGENTA}═══════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}✅ ¡DEPLOY COMPLETADO!${NC}"
echo -e "${MAGENTA}═══════════════════════════════════════════════════════════${NC}"
echo ""

echo -e "${CYAN}📍 URL de Admin Login:${NC}"
echo -e "${GREEN}   https://tuscitasseguras-2d1a6.web.app/webapp/admin-login.html${NC}"
echo ""

echo -e "${CYAN}🔑 Credenciales:${NC}"
echo -e "${YELLOW}   Emails:${NC}"
echo -e "      • cesar.herrera.rojo@gmail.com"
echo -e "      • lacasitadebarajas@gmail.com"
echo -e "      • gonzalo.hrrj@gmail.com"
echo ""
echo -e "${YELLOW}   Contraseña:${NC}"
echo -e "      AdminTuCita2025!Seguro"
echo ""

echo -e "${BLUE}📝 Próximos pasos:${NC}"
echo -e "1. Abre la URL de arriba en tu navegador"
echo -e "2. Ingresa tu email de administrador"
echo -e "3. Ingresa la contraseña"
echo -e "4. ¡Listo! Acceso al panel de administración"
echo ""

echo -e "${GREEN}🎉 ¡Todo listo!${NC}"
echo ""
