#!/bin/bash

# Script to disable App Check imports temporarily
# This is needed when App Check throttling is active

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔧 Disabling App Check Imports (Temporary Fix)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "⚠️  This is a temporary fix for App Check throttling"
echo ""

# Counter for modified files
count=0

# Find all HTML files with enabled App Check imports
files_to_update=$(grep -rl "import './js/firebase-appcheck.js';" webapp/*.html 2>/dev/null | grep -v "clear-appcheck")

if [ -z "$files_to_update" ]; then
  echo "✅ No files found with enabled App Check imports"
  echo "   All files are already configured correctly"
  exit 0
fi

echo "Found files with enabled App Check imports:"
echo "$files_to_update" | while read file; do
  echo "  - $file"
done
echo ""

# Comment out the imports
echo "Disabling imports..."
for file in $files_to_update; do
  # Create backup
  cp "$file" "$file.bak.$(date +%s)"

  # Comment out the import
  sed -i "s|import './js/firebase-appcheck.js';|// TEMP DISABLED (throttling): import './js/firebase-appcheck.js';|g" "$file"

  echo "  ✅ $file"
  ((count++))
done

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ App Check imports disabled in $count files"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📝 Backups created with timestamp extension"
echo ""
echo "⚡ NEXT STEPS:"
echo ""
echo "1. Go to: http://localhost:8000/webapp/clear-appcheck-throttle.html"
echo "   Click 'Limpiar Estado de App Check'"
echo ""
echo "2. Close ALL browser tabs"
echo ""
echo "3. Clear browser data (Ctrl + Shift + Delete):"
echo "   - Cached images and files"
echo "   - Cookies and site data"
echo ""
echo "4. Open fresh browser tab"
echo ""
echo "5. Go to: http://localhost:8000/webapp/register.html"
echo ""
echo "6. Registration should work now!"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
