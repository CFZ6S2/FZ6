#!/bin/bash

# TuCitaSegura - Frontend Deployment Script
# Deploys frontend to Firebase Hosting

set -e  # Exit on error

echo "🚀 TuCitaSegura Frontend Deployment"
echo "==================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if firebase CLI is installed
if ! command -v firebase &> /dev/null; then
    echo -e "${RED}❌ Firebase CLI not found${NC}"
    echo "Install with: npm install -g firebase-tools"
    exit 1
fi

# Check if logged in
if ! firebase projects:list &> /dev/null; then
    echo -e "${YELLOW}⚠️  Not logged in to Firebase${NC}"
    echo "Logging in..."
    firebase login
fi

echo -e "${GREEN}✅ Firebase CLI ready${NC}"
echo ""

# Confirm deployment
echo -e "${YELLOW}⚠️  You are about to deploy to PRODUCTION${NC}"
read -p "Continue? (y/N) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Deployment cancelled"
    exit 0
fi

# Check for .env.production
echo "🔍 Checking environment configuration..."
if [ ! -f "webapp/.env.production" ]; then
    echo -e "${RED}❌ Missing webapp/.env.production${NC}"
    echo "Create it from webapp/.env.production.example"
    exit 1
fi
echo -e "${GREEN}✅ Environment configuration found${NC}"

# Navigate to webapp
cd webapp

# Install dependencies
echo ""
echo "📦 Installing dependencies..."
npm install || {
    echo -e "${RED}❌ npm install failed${NC}"
    exit 1
}
echo -e "${GREEN}✅ Dependencies installed${NC}"

# Build for production
echo ""
echo "🔨 Building for production..."
npm run build || {
    echo -e "${RED}❌ Build failed${NC}"
    exit 1
}
echo -e "${GREEN}✅ Build successful${NC}"

# Check build output
if [ ! -d "dist" ]; then
    echo -e "${RED}❌ Build output directory (dist) not found${NC}"
    exit 1
fi

echo ""
echo "📊 Build statistics:"
du -sh dist/
echo "Files: $(find dist -type f | wc -l)"
echo ""

# Deploy to Firebase
echo "🚀 Deploying to Firebase Hosting..."
cd ..
firebase deploy --only hosting || {
    echo -e "${RED}❌ Deployment failed${NC}"
    exit 1
}

# Get project info
PROJECT_ID=$(firebase projects:list | grep -oP '(?<=│ )\w+-\w+-\w+(?= │)' | head -1)

if [ -n "$PROJECT_ID" ]; then
    HOSTING_URL="https://$PROJECT_ID.web.app"

    echo ""
    echo -e "${GREEN}✅ Deployment successful!${NC}"
    echo "URL: $HOSTING_URL"

    # Health check
    echo ""
    echo "🏥 Running health check..."
    sleep 5  # Wait for deployment to propagate

    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$HOSTING_URL" || echo "000")

    if [ "$HTTP_CODE" == "200" ]; then
        echo -e "${GREEN}✅ Site is accessible${NC}"
    else
        echo -e "${YELLOW}⚠️  Site returned HTTP $HTTP_CODE${NC}"
        echo "Note: This might be normal if you're using client-side routing"
    fi

    # Open in browser
    echo ""
    read -p "Open in browser? (y/N) " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        if command -v open &> /dev/null; then
            open "$HOSTING_URL"
        elif command -v xdg-open &> /dev/null; then
            xdg-open "$HOSTING_URL"
        else
            echo "Please open manually: $HOSTING_URL"
        fi
    fi
else
    echo -e "${YELLOW}⚠️  Could not determine project ID${NC}"
fi

echo ""
echo "📊 View hosting: firebase hosting:channel:list"
echo "📈 View console: https://console.firebase.google.com"
echo ""
echo -e "${GREEN}🎉 Deployment complete!${NC}"
