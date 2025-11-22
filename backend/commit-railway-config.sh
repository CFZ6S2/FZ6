#!/bin/bash
# Script para hacer commit y push de los cambios de configuración de Railway

echo "🚀 Preparando commit de configuración de Railway..."

# Añadir todos los archivos de configuración
git add railway.json railway.toml .nixpacks.toml app.json Dockerfile .railway nixpacks.toml

# Hacer commit
git commit -m "Configure Railway deployment with NIXPACKS for Python/FastAPI backend

- Set NIXPACKS as builder to force Python detection
- Configure start command for uvicorn main:app
- Add railway.toml for Railway configuration
- Update Dockerfile to remove CMD conflicts
- Add app.json for Python stack detection"

# Hacer push
echo "📤 Haciendo push a railway-deployment branch..."
git push origin railway-deployment

echo "✅ Configuración subida exitosamente!"
echo "🔄 Railway debería empezar a construir automáticamente..."