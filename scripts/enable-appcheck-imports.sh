#!/bin/bash

# Script to enable App Check imports across all HTML files
# This uncomments the "// TEMP DISABLED: import './js/firebase-appcheck.js';" lines

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔧 Enabling App Check Imports"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Counter for modified files
count=0

# Find all HTML files with disabled App Check imports
files_to_update=$(grep -rl "TEMP DISABLED.*firebase-appcheck" webapp/*.html 2>/dev/null)

if [ -z "$files_to_update" ]; then
  echo "✅ No files found with disabled App Check imports"
  echo "   All files are already configured correctly"
  exit 0
fi

echo "Found files with disabled App Check imports:"
echo "$files_to_update" | while read file; do
  echo "  - $file"
done
echo ""

# Uncomment the imports
echo "Enabling imports..."
for file in $files_to_update; do
  # Create backup
  cp "$file" "$file.bak"

  # Uncomment the import
  sed -i 's|// TEMP DISABLED: import|import|g' "$file"

  echo "  ✅ $file"
  ((count++))
done

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ App Check imports enabled in $count files"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📝 Backups created with .bak extension"
echo ""
echo "⚠️  IMPORTANT: Next Steps"
echo ""
echo "1. Go to Firebase Console → App Check → APIs"
echo "   https://console.firebase.google.com/project/tuscitasseguras-2d1a6/appcheck"
echo ""
echo "2. Set enforcement to 'Unenforced' for development:"
echo "   - Authentication → Unenforced"
echo "   - Cloud Firestore → Unenforced"
echo "   - Cloud Storage → Unenforced"
echo ""
echo "3. Hard refresh browser (Ctrl + Shift + R)"
echo ""
echo "4. Test the application"
echo ""
echo "See docs/FIREBASE_AUTH_401_FIX.md for detailed instructions"
echo ""
