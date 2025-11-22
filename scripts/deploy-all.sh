#!/bin/bash

# TuCitaSegura - Full Deployment Script
# Deploys both backend (Railway) and frontend (Firebase)

set -e  # Exit on error

echo "🚀 TuCitaSegura Full Deployment"
echo "==============================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Get script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

echo -e "${BLUE}ℹ️  Project root: $PROJECT_ROOT${NC}"
echo ""

# Confirm full deployment
echo -e "${YELLOW}⚠️  You are about to deploy BOTH backend and frontend to PRODUCTION${NC}"
echo "This will:"
echo "  1. Deploy backend to Railway"
echo "  2. Deploy frontend to Firebase Hosting"
echo ""
read -p "Continue? (y/N) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Deployment cancelled"
    exit 0
fi

# Pre-deployment checks
echo "🔍 Running pre-deployment checks..."
echo ""

# Check git status
if ! git diff-index --quiet HEAD --; then
    echo -e "${YELLOW}⚠️  You have uncommitted changes${NC}"
    git status --short
    echo ""
    read -p "Continue anyway? (y/N) " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Please commit your changes first"
        exit 0
    fi
fi

# Check branch
CURRENT_BRANCH=$(git branch --show-current)
if [ "$CURRENT_BRANCH" != "main" ] && [ "$CURRENT_BRANCH" != "master" ]; then
    echo -e "${YELLOW}⚠️  You are on branch: $CURRENT_BRANCH${NC}"
    echo "Production deployments should be from 'main' or 'master'"
    echo ""
    read -p "Continue anyway? (y/N) " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Switch to main/master branch first"
        exit 0
    fi
fi

# Check required tools
echo "🔧 Checking required tools..."
MISSING_TOOLS=()

if ! command -v railway &> /dev/null; then
    MISSING_TOOLS+=("railway")
fi

if ! command -v firebase &> /dev/null; then
    MISSING_TOOLS+=("firebase")
fi

if [ ${#MISSING_TOOLS[@]} -gt 0 ]; then
    echo -e "${RED}❌ Missing required tools: ${MISSING_TOOLS[*]}${NC}"
    echo ""
    echo "Install missing tools:"
    [[ " ${MISSING_TOOLS[@]} " =~ " railway " ]] && echo "  npm install -g @railway/cli"
    [[ " ${MISSING_TOOLS[@]} " =~ " firebase " ]] && echo "  npm install -g firebase-tools"
    exit 1
fi

echo -e "${GREEN}✅ All tools present${NC}"
echo ""

# Step 1: Deploy Backend
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🚂 Step 1/2: Deploying Backend (Railway)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

if [ -f "$SCRIPT_DIR/deploy-backend.sh" ]; then
    cd "$PROJECT_ROOT"
    bash "$SCRIPT_DIR/deploy-backend.sh" || {
        echo -e "${RED}❌ Backend deployment failed${NC}"
        exit 1
    }
else
    echo -e "${RED}❌ Backend deployment script not found${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}✅ Backend deployed successfully${NC}"
echo ""

# Wait before frontend deployment
echo "⏳ Waiting 10 seconds before frontend deployment..."
sleep 10
echo ""

# Step 2: Deploy Frontend
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔥 Step 2/2: Deploying Frontend (Firebase)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

if [ -f "$SCRIPT_DIR/deploy-frontend.sh" ]; then
    cd "$PROJECT_ROOT"
    bash "$SCRIPT_DIR/deploy-frontend.sh" || {
        echo -e "${RED}❌ Frontend deployment failed${NC}"
        echo ""
        echo "Backend was deployed successfully, but frontend failed."
        echo "You can retry frontend deployment with:"
        echo "  bash scripts/deploy-frontend.sh"
        exit 1
    }
else
    echo -e "${RED}❌ Frontend deployment script not found${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}✅ Frontend deployed successfully${NC}"
echo ""

# Final summary
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🎉 DEPLOYMENT COMPLETE"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Deployed components:"
echo "  ✅ Backend (Railway)"
echo "  ✅ Frontend (Firebase Hosting)"
echo ""
echo "Next steps:"
echo "  1. Verify health: curl https://api.tucitasegura.com/health"
echo "  2. Open frontend: https://tucitasegura.com"
echo "  3. Monitor logs:"
echo "     - Backend: railway logs -f"
echo "     - Frontend: firebase hosting:channel:list"
echo "  4. Configure webhooks (if not done):"
echo "     - PayPal webhook: https://api.tucitasegura.com/api/payments/paypal/webhook"
echo "  5. Monitor Sentry: https://sentry.io"
echo ""
echo "📚 Full documentation: docs/DEPLOYMENT_GUIDE.md"
echo ""
echo -e "${GREEN}🚀 System is now LIVE in production!${NC}"
