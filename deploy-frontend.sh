#!/bin/bash
# Frontend Deployment Script for TuCitaSegura
# Deploys the updated frontend with new backend URL to Firebase Hosting

set -e  # Exit on error

echo "🚀 TuCitaSegura Frontend Deployment"
echo "===================================="
echo ""

# Check if Firebase CLI is installed
if ! command -v firebase &> /dev/null; then
    echo "❌ Firebase CLI not found!"
    echo "📦 Installing Firebase CLI..."
    npm install -g firebase-tools
fi

# Show current project
echo "📋 Project Configuration:"
firebase projects:list 2>/dev/null || echo "⚠️  Need to login first"
echo ""

# Check if logged in
if ! firebase login:list 2>/dev/null | grep -q "@"; then
    echo "🔐 Logging in to Firebase..."
    firebase login
fi

# Show what will be deployed
echo "📂 Files to deploy:"
echo "   - index.html (Updated API URL)"
echo "   - firebase.json (Updated CSP)"
echo "   - functions/index.js (Updated proxy URL)"
echo ""
echo "🎯 Target:"
echo "   Project: tuscitasseguras-2d1a6"
echo "   Site: tucitasegura.com"
echo ""

# Confirm
read -p "Continue with deployment? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Deployment cancelled"
    exit 1
fi

# Deploy
echo ""
echo "🚀 Deploying to Firebase Hosting..."
firebase deploy --only hosting

echo ""
echo "✅ Deployment complete!"
echo ""
echo "🧪 Test the deployment:"
echo "   1. Open https://tucitasegura.com"
echo "   2. Press Ctrl+Shift+R (hard refresh)"
echo "   3. Open console (F12)"
echo "   4. Run: fetch('https://fz6-production.up.railway.app/health').then(r=>r.json()).then(console.log)"
echo ""
echo "Expected: No CORS errors, backend responds with {status: 'healthy'}"
