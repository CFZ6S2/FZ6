#!/bin/bash
# Script to register reCAPTCHA Enterprise with Firebase App Check
#
# This script helps configure Firebase App Check for your web app
# to resolve the 403 errors when exchanging reCAPTCHA tokens.

set -e

echo "🔐 Firebase App Check Registration Helper"
echo "=========================================="
echo ""

# Project details
PROJECT_ID="tuscitasseguras-2d1a6"
<<<<<<< HEAD
WEB_APP_ID="1:924208562587:web:5291359426fe390b36213e"
RECAPTCHA_SITE_KEY="6LeKWiAsAAAAABCe8YQzXmO_dvBwAhOS-cQh_hzT"
=======
WEB_APP_ID="1:180656060538:web:3168487130aa126db663c3"
RECAPTCHA_SITE_KEY="6LeKWiAsAAAAABCe8YQzXmO_dvBwAhOS-cQh_hzT"
>>>>>>> c6ecb8b (Fix Dockerfile and opencv for Cloud Run)

echo "📋 Project Information:"
echo "  Project ID: $PROJECT_ID"
echo "  Web App ID: $WEB_APP_ID"
echo "  reCAPTCHA Site Key: $RECAPTCHA_SITE_KEY"
echo ""

# Check if Firebase CLI is installed
if ! command -v firebase &> /dev/null; then
    echo "❌ Firebase CLI is not installed."
    echo ""
    echo "Install it with: npm install -g firebase-tools"
    exit 1
fi

echo "✅ Firebase CLI detected"
echo ""

# Check if logged in
if ! firebase projects:list &> /dev/null; then
    echo "❌ You are not logged in to Firebase CLI"
    echo ""
    echo "Please run: firebase login"
    exit 1
fi

echo "✅ Logged in to Firebase"
echo ""

echo "📝 To register App Check for your web app, you have two options:"
echo ""
echo "OPTION 1: Using Firebase Console (Recommended)"
echo "--------------------------------------------"
echo "1. Go to: https://console.firebase.google.com/project/$PROJECT_ID/appcheck"
echo "2. Click on your web app in the list"
echo "3. Click 'Register' or 'Manage'"
echo "4. Select 'reCAPTCHA Enterprise' as the provider"
echo "5. Enter the site key: $RECAPTCHA_SITE_KEY"
echo "6. Save the configuration"
echo ""
echo "OPTION 2: Using Firebase CLI (Advanced)"
echo "---------------------------------------"
echo "Run the following command manually:"
echo ""
echo "firebase appcheck:apps:update web:$WEB_APP_ID --project $PROJECT_ID"
echo ""
echo "Note: The CLI may not support all App Check operations yet."
echo "Using the Firebase Console (Option 1) is more reliable."
echo ""

read -p "Do you want to open the Firebase Console now? (y/n) " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "🌐 Opening Firebase Console..."
    if command -v xdg-open &> /dev/null; then
        xdg-open "https://console.firebase.google.com/project/$PROJECT_ID/appcheck"
    elif command -v open &> /dev/null; then
        open "https://console.firebase.google.com/project/$PROJECT_ID/appcheck"
    else
        echo "Please open this URL manually:"
        echo "https://console.firebase.google.com/project/$PROJECT_ID/appcheck"
    fi
fi

echo ""
echo "📚 Additional Resources:"
echo "  - App Check docs: https://firebase.google.com/docs/app-check"
echo "  - reCAPTCHA Enterprise setup: https://cloud.google.com/recaptcha-enterprise/docs/integrate-app-check"
echo ""
echo "✅ Done! After registering in Firebase Console, the 403 errors should resolve."
