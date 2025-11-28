#!/bin/bash

# 🚀 Deployment Script - Fraud Detection System
# TuCitaSegura - Fraud Detection Cloud Functions
# Version: 1.0.0

set -e  # Exit on error

echo "════════════════════════════════════════════════════════════════"
echo "  🚀 Fraud Detection System - Deployment Script"
echo "════════════════════════════════════════════════════════════════"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_success() { echo -e "${GREEN}✅ $1${NC}"; }
print_error() { echo -e "${RED}❌ $1${NC}"; }
print_warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }
print_info() { echo -e "${BLUE}ℹ️  $1${NC}"; }

# Check if Firebase CLI is installed
if ! command -v firebase &> /dev/null; then
    print_error "Firebase CLI no está instalado"
    echo "Por favor instala Firebase CLI:"
    echo "  npm install -g firebase-tools"
    exit 1
fi

print_success "Firebase CLI encontrado"

# Check authentication
echo ""
print_info "Verificando autenticación..."
if ! firebase projects:list &> /dev/null; then
    print_error "No estás autenticado con Firebase"
    echo ""
    echo "Por favor ejecuta: firebase login"
    exit 1
fi

print_success "Autenticación verificada"

# Verify project
echo ""
print_info "Verificando proyecto..."
CURRENT_PROJECT=$(firebase use 2>&1 | grep "Active Project" | awk '{print $3}' || echo "unknown")

if [ "$CURRENT_PROJECT" != "tuscitasseguras-2d1a6" ]; then
    print_warning "Proyecto actual: $CURRENT_PROJECT"
    print_info "Cambiando a tuscitasseguras-2d1a6..."
    firebase use tuscitasseguras-2d1a6
fi

print_success "Proyecto: tuscitasseguras-2d1a6"

# Run tests
echo ""
print_info "Ejecutando tests..."
cd functions
if npm test -- test/fraud-detection.test.js 2>&1 | grep -q "27 passing"; then
    print_success "Tests pasando (27/27)"
else
    print_error "Tests fallaron"
    print_warning "¿Continuar de todas formas? (y/N)"
    read -r response
    if [[ ! "$response" =~ ^[Yy]$ ]]; then
        print_info "Deployment cancelado"
        exit 1
    fi
fi
cd ..

# Deploy Firestore indexes
echo ""
print_info "═══════════════════════════════════════"
print_info "PASO 1: Desplegando índices de Firestore"
print_info "═══════════════════════════════════════"
echo ""

print_warning "Esto puede tardar varios minutos mientras Firestore construye los índices..."

if firebase deploy --only firestore:indexes; then
    print_success "Índices de Firestore desplegados"
    echo ""
    print_info "Índices creados:"
    echo "  • admin_notifications: type + createdAt"
    echo "  • admin_notifications: type + read + createdAt"
    echo "  • users: isActive + createdAt"
    echo ""
else
    print_error "Error al desplegar índices"
    exit 1
fi

print_warning "Esperando 10 segundos para que los índices se inicialicen..."
sleep 10

# Deploy Cloud Functions
echo ""
print_info "═══════════════════════════════════════"
print_info "PASO 2: Desplegando Cloud Functions"
print_info "═══════════════════════════════════════"
echo ""

print_info "Funciones a desplegar:"
echo "  • analyzeFraud (HTTP Callable)"
echo "  • onUserCreatedAnalyzeFraud (Firestore Trigger)"
echo "  • scheduledFraudAnalysis (Scheduled)"
echo ""

print_warning "¿Desplegar solo funciones de fraud detection? (Y/n)"
read -r deploy_choice

if [[ "$deploy_choice" =~ ^[Nn]$ ]]; then
    print_info "Desplegando TODAS las Cloud Functions..."
    firebase deploy --only functions
else
    print_info "Desplegando solo funciones de fraud detection..."
    firebase deploy --only functions:analyzeFraud,functions:onUserCreatedAnalyzeFraud,functions:scheduledFraudAnalysis
fi

print_success "Cloud Functions desplegadas"

# Verification
echo ""
print_info "═══════════════════════════════════════"
print_info "PASO 3: Verificación"
print_info "═══════════════════════════════════════"
echo ""

print_info "Listando funciones desplegadas..."
firebase functions:list | grep -E "analyzeFraud|onUserCreatedAnalyzeFraud|scheduledFraudAnalysis" || true

echo ""
print_info "Verificando índices de Firestore..."
echo "Por favor verifica en la consola de Firebase que los índices estén en estado 'Enabled':"
echo "  https://console.firebase.google.com/project/tuscitasseguras-2d1a6/firestore/indexes"

# Summary
echo ""
echo "════════════════════════════════════════════════════════════════"
print_success "¡Deployment completado!"
echo "════════════════════════════════════════════════════════════════"
echo ""
echo "📊 Funciones desplegadas:"
echo "  ✅ analyzeFraud - Análisis manual de fraude"
echo "  ✅ onUserCreatedAnalyzeFraud - Análisis automático al crear usuario"
echo "  ✅ scheduledFraudAnalysis - Análisis diario programado (2 AM)"
echo ""
echo "🔍 Próximos pasos:"
echo "  1. Verifica que los índices estén 'Enabled' en Firebase Console"
echo "  2. Monitorea logs: firebase functions:log"
echo "  3. Prueba el admin dashboard: /admin/dashboard.html"
echo "  4. Crea un usuario de prueba para verificar el trigger"
echo ""
echo "📚 Documentación completa: DEPLOYMENT_GUIDE.md"
echo ""
print_info "¿Ver logs en tiempo real? (y/N)"
read -r logs_choice

if [[ "$logs_choice" =~ ^[Yy]$ ]]; then
    print_info "Mostrando logs en tiempo real (Ctrl+C para salir)..."
    firebase functions:log --only analyzeFraud,onUserCreatedAnalyzeFraud,scheduledFraudAnalysis
fi

echo ""
print_success "¡Deployment finalizado con éxito! 🎉"
