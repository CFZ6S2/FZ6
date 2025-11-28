#!/bin/bash

# Script para agregar favicon meta tags a todos los archivos HTML
# TuCitaSegura - Favicon Auto-Installer

echo "🎨 Agregando favicon a todos los archivos HTML..."
echo ""

# Contador
total=0
updated=0
skipped=0

# Meta tags a insertar
FAVICON_TAGS='
  <!-- Favicon -->
  <link rel="icon" type="image/svg+xml" href="/favicon.svg">
  <link rel="alternate icon" href="/favicon.ico">
  <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">
  <link rel="icon" type="image/png" sizes="192x192" href="/icon-192.png">
  <link rel="icon" type="image/png" sizes="512x512" href="/icon-512.png">
  <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">
  <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png">
  <link rel="manifest" href="/site.webmanifest">
  <meta name="theme-color" content="#764ba2">
'

# Buscar todos los archivos HTML
find . -name "*.html" -type f | while read -r file; do
    total=$((total + 1))

    # Verificar si ya tiene favicon
    if grep -q "favicon.svg" "$file"; then
        echo "⏭️  Skip: $file (ya tiene favicon)"
        skipped=$((skipped + 1))
    else
        # Buscar </title> y agregar después
        if grep -q "</title>" "$file"; then
            # Crear archivo temporal
            temp_file="${file}.tmp"

            # Insertar las meta tags después de </title>
            awk -v tags="$FAVICON_TAGS" '
                /<\/title>/ {
                    print $0
                    print tags
                    next
                }
                { print }
            ' "$file" > "$temp_file"

            # Reemplazar el archivo original
            mv "$temp_file" "$file"

            echo "✅ Updated: $file"
            updated=$((updated + 1))
        else
            echo "⚠️  Warning: $file no tiene tag </title>"
        fi
    fi
done

echo ""
echo "════════════════════════════════════"
echo "✅ Proceso completado"
echo "════════════════════════════════════"
echo "Total archivos: $total"
echo "Actualizados: $updated"
echo "Omitidos: $skipped"
echo ""
