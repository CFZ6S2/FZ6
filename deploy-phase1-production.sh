#!/bin/bash

# =============================================================================
# Script de Deployment - Fase 1 Auditoría de Seguridad
# =============================================================================
# Este script despliega todas las mejoras de seguridad de la Fase 1 a producción
#
# Cambios incluidos:
# - Cloud Functions con timeout, caché PayPal e idempotencia
# - Firestore Rules sin bypass de género
# - Índices de Firestore optimizados
#
# Autor: TuCitaSegura Team
# Fecha: 28 de Noviembre de 2025
# Branch: claude/audit-page-performance-016iXBfeBGebGti8X6EHN4nd
# =============================================================================

set -e  # Exit on error

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Función para imprimir mensajes con color
print_header() {
    echo -e "\n${BLUE}========================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}========================================${NC}\n"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# =============================================================================
# PASO 0: Verificaciones Pre-Deploy
# =============================================================================

print_header "PASO 0: Verificaciones Pre-Deploy"

# Verificar que estamos en la raíz del proyecto
if [ ! -f "package.json" ]; then
    print_error "No se encuentra package.json. Asegúrate de estar en la raíz del proyecto."
    exit 1
fi

print_success "Directorio verificado: $(pwd)"

# Verificar que Firebase CLI está instalado
if ! command -v firebase &> /dev/null; then
    print_error "Firebase CLI no está instalado."
    echo ""
    print_info "Instálalo con: npm install -g firebase-tools"
    exit 1
fi

print_success "Firebase CLI encontrado: $(firebase --version)"

# Verificar que estamos en el branch correcto
CURRENT_BRANCH=$(git branch --show-current)
EXPECTED_BRANCH="claude/audit-page-performance-016iXBfeBGebGti8X6EHN4nd"

if [ "$CURRENT_BRANCH" != "$EXPECTED_BRANCH" ]; then
    print_warning "Estás en el branch: $CURRENT_BRANCH"
    print_warning "Branch esperado: $EXPECTED_BRANCH"
    echo ""
    read -p "¿Continuar de todas formas? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_info "Deployment cancelado por el usuario"
        exit 0
    fi
else
    print_success "Branch correcto: $CURRENT_BRANCH"
fi

# Verificar que no hay cambios sin commitear
if ! git diff-index --quiet HEAD --; then
    print_warning "Hay cambios sin commitear en el repositorio"
    echo ""
    git status --short
    echo ""
    read -p "¿Continuar de todas formas? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_info "Deployment cancelado. Por favor commitea los cambios primero."
        exit 0
    fi
else
    print_success "Working tree limpio"
fi

# Verificar que estamos logueados en Firebase
if ! firebase projects:list &> /dev/null; then
    print_error "No estás logueado en Firebase"
    echo ""
    print_info "Ejecuta: firebase login"
    exit 1
fi

print_success "Autenticado en Firebase"

# Mostrar proyecto de Firebase
PROJECT_ID=$(firebase use | grep -o "Now using project .* (\(.*\))" | sed 's/Now using project //' | sed 's/ .*//')
if [ -z "$PROJECT_ID" ]; then
    PROJECT_ID=$(cat .firebaserc 2>/dev/null | grep -o '"default": "[^"]*"' | cut -d'"' -f4)
fi

if [ -z "$PROJECT_ID" ]; then
    print_error "No se pudo determinar el proyecto de Firebase"
    print_info "Ejecuta: firebase use <project-id>"
    exit 1
fi

print_success "Proyecto Firebase: $PROJECT_ID"

echo ""
print_info "Todos los checks pre-deploy pasaron correctamente"
echo ""

# =============================================================================
# CONFIRMACIÓN DEL USUARIO
# =============================================================================

print_header "CONFIRMACIÓN DE DEPLOYMENT"

echo "Se van a desplegar los siguientes componentes:"
echo ""
echo "  1. ✅ Cloud Functions (con todos los cambios de Fase 1)"
echo "     - Timeout de 30s en apiProxy"
echo "     - Caché de tokens PayPal (95% reducción en API calls)"
echo "     - Idempotencia en webhooks (Stripe + PayPal)"
echo "     - Logging mejorado con structured logger"
echo ""
echo "  2. ✅ Firestore Rules (sin bypass de género)"
echo "     - Eliminado: gender() == null bypass"
echo "     - Filtrado de género obligatorio"
echo ""
echo "  3. ✅ Firestore Indexes (optimizados)"
echo "     - 33 índices compuestos"
echo "     - 19 colecciones indexadas"
echo ""
echo "Proyecto: $PROJECT_ID"
echo "Branch: $CURRENT_BRANCH"
echo ""

read -p "¿Estás seguro de continuar con el deployment? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    print_info "Deployment cancelado por el usuario"
    exit 0
fi

# =============================================================================
# PASO 1: Backup de configuraciones actuales
# =============================================================================

print_header "PASO 1: Backup de Configuraciones Actuales"

BACKUP_DIR="backup_pre_deploy_$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"

print_info "Creando backup en: $BACKUP_DIR"

# Backup de reglas de Firestore
if firebase firestore:rules get > "$BACKUP_DIR/firestore.rules.backup" 2>/dev/null; then
    print_success "Backup de Firestore Rules creado"
else
    print_warning "No se pudo hacer backup de Firestore Rules (puede que no existan)"
fi

# Backup de índices
cp firestore.indexes.json "$BACKUP_DIR/firestore.indexes.json.backup" 2>/dev/null || true
print_success "Backup de índices creado"

# Backup de package.json de functions
cp functions/package.json "$BACKUP_DIR/functions.package.json.backup" 2>/dev/null || true
print_success "Backup de functions/package.json creado"

print_success "Backups completados en: $BACKUP_DIR"

# =============================================================================
# PASO 2: Deploy de Cloud Functions
# =============================================================================

print_header "PASO 2: Deploy de Cloud Functions"

print_info "Instalando dependencias de Functions..."
cd functions && npm install && cd ..
print_success "Dependencias instaladas"

print_info "Desplegando Cloud Functions..."
print_warning "Esto puede tomar 3-5 minutos..."
echo ""

# Desplegar functions con output en tiempo real
if firebase deploy --only functions; then
    print_success "Cloud Functions desplegadas exitosamente"

    # Mostrar funciones desplegadas
    echo ""
    print_info "Funciones desplegadas:"
    firebase functions:list 2>/dev/null | grep -E "apiProxy|stripeWebhook|paypalWebhook|onUserDocCreate|health" || true

else
    print_error "Error al desplegar Cloud Functions"
    print_info "Revisa los logs arriba para más detalles"
    exit 1
fi

# =============================================================================
# PASO 3: Deploy de Firestore Rules
# =============================================================================

print_header "PASO 3: Deploy de Firestore Rules"

print_warning "⚠️  IMPORTANTE: Las nuevas reglas eliminan el bypass de género"
print_warning "   Usuarios sin custom claims NO podrán leer perfiles"
echo ""

read -p "¿Continuar con el deploy de Firestore Rules? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    print_warning "Deploy de Firestore Rules omitido"
else
    print_info "Desplegando Firestore Rules..."

    if firebase deploy --only firestore:rules; then
        print_success "Firestore Rules desplegadas exitosamente"

        # Verificar las reglas
        echo ""
        print_info "Verificando reglas desplegadas..."
        if firebase firestore:rules get | grep -q "isMale() && resource.data.gender == 'femenino'"; then
            print_success "Reglas verificadas: Filtrado de género activo"
        else
            print_warning "No se pudo verificar el contenido de las reglas"
        fi
    else
        print_error "Error al desplegar Firestore Rules"
        print_info "Las Functions ya están desplegadas, pero las Rules fallaron"
        exit 1
    fi
fi

# =============================================================================
# PASO 4: Deploy de Firestore Indexes (Opcional)
# =============================================================================

print_header "PASO 4: Deploy de Firestore Indexes (Opcional)"

print_info "¿Quieres desplegar también los índices de Firestore?"
print_info "Esto es opcional, pero recomendado para performance"
echo ""

read -p "¿Desplegar índices? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    print_info "Desplegando Firestore Indexes..."

    if firebase deploy --only firestore:indexes; then
        print_success "Firestore Indexes desplegados exitosamente"
        print_info "Los índices pueden tardar varios minutos en construirse"
    else
        print_warning "Error al desplegar Firestore Indexes"
        print_info "Esto no afecta el deployment principal"
    fi
else
    print_info "Deploy de índices omitido"
fi

# =============================================================================
# PASO 5: Verificación Post-Deploy
# =============================================================================

print_header "PASO 5: Verificación Post-Deploy"

print_info "Verificando deployment..."

# Verificar que las functions están online
echo ""
print_info "Verificando Cloud Functions..."
if firebase functions:list 2>/dev/null | grep -q "apiProxy"; then
    print_success "apiProxy: Online"
fi

if firebase functions:list 2>/dev/null | grep -q "stripeWebhook"; then
    print_success "stripeWebhook: Online"
fi

if firebase functions:list 2>/dev/null | grep -q "paypalWebhook"; then
    print_success "paypalWebhook: Online"
fi

# Mostrar logs recientes
echo ""
print_info "Logs recientes de Functions:"
firebase functions:log --limit 5 2>/dev/null || print_warning "No se pudieron obtener logs"

# =============================================================================
# PASO 6: Tests Post-Deploy
# =============================================================================

print_header "PASO 6: Tests Post-Deploy"

echo ""
print_info "El deployment se completó exitosamente ✅"
echo ""
print_warning "IMPORTANTE: Ahora debes ejecutar los tests de producción"
echo ""
echo "Para testear los cambios, consulta el archivo:"
echo "  📄 DEPLOY_AND_TEST_PRODUCTION.md"
echo ""
echo "Tests recomendados:"
echo "  1. ✅ Verificar timeout en apiProxy (Test #1)"
echo "  2. ✅ Verificar caché de tokens PayPal (Test #2)"
echo "  3. ✅ Verificar idempotencia en Stripe webhooks (Test #3)"
echo "  4. ✅ Verificar idempotencia en PayPal webhooks (Test #4)"
echo ""
echo "Proyecto: $PROJECT_ID"
echo "Fecha: $(date '+%Y-%m-%d %H:%M:%S')"
echo ""

print_success "🎉 Deployment de Fase 1 completado exitosamente!"
echo ""
print_info "Próximos pasos:"
echo "  1. Ejecutar tests de producción (ver DEPLOY_AND_TEST_PRODUCTION.md)"
echo "  2. Monitorear logs de Firebase Functions"
echo "  3. Verificar métricas en Firebase Console"
echo "  4. Si hay problemas, usa los backups en: $BACKUP_DIR"
echo ""

exit 0
