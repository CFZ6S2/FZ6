#!/bin/bash

# TuCitaSegura - Backend Deployment Script
# Deploys backend to Railway

set -e  # Exit on error

echo "🚀 TuCitaSegura Backend Deployment"
echo "=================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if railway CLI is installed
if ! command -v railway &> /dev/null; then
    echo -e "${RED}❌ Railway CLI not found${NC}"
    echo "Install with: npm install -g @railway/cli"
    exit 1
fi

# Check if logged in
if ! railway whoami &> /dev/null; then
    echo -e "${YELLOW}⚠️  Not logged in to Railway${NC}"
    echo "Logging in..."
    railway login
fi

echo -e "${GREEN}✅ Railway CLI ready${NC}"
echo ""

# Confirm deployment
echo -e "${YELLOW}⚠️  You are about to deploy to PRODUCTION${NC}"
read -p "Continue? (y/N) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Deployment cancelled"
    exit 0
fi

# Run tests first
echo "🧪 Running tests..."
cd backend
if [ -f "tests/test_production.py" ]; then
    pytest tests/ -v || {
        echo -e "${RED}❌ Tests failed. Deployment aborted.${NC}"
        exit 1
    }
    echo -e "${GREEN}✅ Tests passed${NC}"
else
    echo -e "${YELLOW}⚠️  No tests found, skipping...${NC}"
fi
cd ..

# Check for required files
echo ""
echo "📁 Checking required files..."
required_files=(
    "backend/main.py"
    "backend/requirements.txt"
    "railway.json"
)

for file in "${required_files[@]}"; do
    if [ ! -f "$file" ]; then
        echo -e "${RED}❌ Missing required file: $file${NC}"
        exit 1
    fi
done
echo -e "${GREEN}✅ All required files present${NC}"

# Check for uncommitted changes
echo ""
echo "🔍 Checking git status..."
if ! git diff-index --quiet HEAD --; then
    echo -e "${YELLOW}⚠️  You have uncommitted changes${NC}"
    echo "Uncommitted files:"
    git status --short
    echo ""
    read -p "Continue anyway? (y/N) " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Please commit your changes first"
        exit 0
    fi
fi

# Deploy
echo ""
echo "🚀 Deploying to Railway..."
railway up

# Wait for deployment
echo ""
echo "⏳ Waiting for deployment to complete..."
sleep 10

# Get deployment URL
RAILWAY_URL=$(railway domain 2>/dev/null || echo "")

if [ -n "$RAILWAY_URL" ]; then
    echo ""
    echo -e "${GREEN}✅ Deployment successful!${NC}"
    echo "URL: https://$RAILWAY_URL"

    # Health check
    echo ""
    echo "🏥 Running health check..."
    sleep 5  # Wait for service to be ready

    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "https://$RAILWAY_URL/health" || echo "000")

    if [ "$HTTP_CODE" == "200" ]; then
        echo -e "${GREEN}✅ Health check passed${NC}"

        # Show health details
        echo ""
        echo "Health check response:"
        curl -s "https://$RAILWAY_URL/health" | python3 -m json.tool || echo "Could not parse JSON"
    else
        echo -e "${RED}❌ Health check failed (HTTP $HTTP_CODE)${NC}"
        echo "Check logs with: railway logs"
        exit 1
    fi
else
    echo -e "${YELLOW}⚠️  Could not get Railway URL${NC}"
    echo "Check deployment status with: railway status"
fi

echo ""
echo "📊 View logs: railway logs -f"
echo "📈 View dashboard: railway open"
echo ""
echo -e "${GREEN}🎉 Deployment complete!${NC}"
