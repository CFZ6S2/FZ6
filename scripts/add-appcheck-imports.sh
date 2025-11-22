#!/bin/bash

# Script to add firebase-appcheck.js import to HTML files
# This adds the import BEFORE firebase-config.js

FILES=(
  "ayuda.html"
  "cita-detalle.html"
  "concierge-dashboard.html"
  "cuenta-pagos.html"
  "evento-detalle.html"
  "eventos-vip.html"
  "reportes.html"
  "seguridad.html"
  "seguro.html"
  "suscripcion.html"
)

cd /home/user/t2c06/webapp

for file in "${FILES[@]}"; do
  echo "Processing $file..."

  # Check if file exists and needs update
  if [ -f "$file" ] && grep -q "firebase-config.js" "$file" && ! grep -q "firebase-appcheck.js" "$file"; then
    # Create backup
    cp "$file" "$file.bak"

    # Use sed to add the App Check import before firebase-config.js import
    # This handles various spacing patterns
    sed -i '/import.*firebase-config\.js/i\    // Import App Check FIRST (must be before firebase-config.js)\n    import '\''./js/firebase-appcheck.js'\'';\n\n    // Then import Firebase services' "$file"

    echo "✅ Updated $file"
  else
    echo "⏭️  Skipped $file (doesn't need update or already has App Check)"
  fi
done

echo ""
echo "Done! Updated files."
echo "Backups saved as *.bak"
