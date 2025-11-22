# 🚀 TuCitaSegura Backend - Complete Deployment Guide

**Last Updated:** 2025-11-14
**Backend:** FastAPI + Python 3.11
**Supported Platforms:** Railway, Render, Google Cloud Run, AWS, Docker

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Local Development](#local-development)
4. [Environment Configuration](#environment-configuration)
5. [Deployment Platforms](#deployment-platforms)
   - [Railway (Recommended)](#railway-deployment)
   - [Render](#render-deployment)
   - [Google Cloud Run](#google-cloud-run-deployment)
   - [AWS EC2/ECS](#aws-deployment)
6. [CI/CD Setup](#cicd-setup)
7. [Post-Deployment](#post-deployment)
8. [Monitoring & Maintenance](#monitoring--maintenance)
9. [Troubleshooting](#troubleshooting)
10. [Cost Optimization](#cost-optimization)

---

## Overview

TuCitaSegura backend is a **FastAPI** application with:
- Machine Learning recommendation engine
- Computer Vision photo verification
- NLP message moderation
- Real-time geolocation services
- Firebase integration
- PostgreSQL database
- Redis cache
- Background tasks (Celery)

**Architecture:**
```
┌─────────────────┐
│   Client App    │
│  (Firebase Auth)│
└────────┬────────┘
         │
         ▼
┌─────────────────┐      ┌─────────────┐
│  FastAPI Backend│◄────►│  PostgreSQL │
│   (Python 3.11) │      │  (Database) │
└────────┬────────┘      └─────────────┘
         │
         ├──────────────►┌─────────────┐
         │               │    Redis    │
         │               │   (Cache)   │
         │               └─────────────┘
         │
         └──────────────►┌─────────────┐
                        │   Firebase  │
                        │  (Storage)  │
                        └─────────────┘
```

---

## Prerequisites

### Required Tools

```bash
# Python 3.11+
python --version  # Should be 3.11 or higher

# Docker (for local development)
docker --version
docker-compose --version

# Git
git --version

# Optional (for specific platforms)
# Railway CLI
npm install -g @railway/cli

# Google Cloud CLI
# Download from: https://cloud.google.com/sdk/docs/install
```

### Required Accounts

1. **Firebase** - Already configured (tuscitasseguras-2d1a6)
2. **Stripe** - Payment processing
3. **Google Maps API** - Geolocation
4. **Deployment Platform** (choose one):
   - Railway (easiest, free tier)
   - Render (good free tier)
   - Google Cloud (powerful, requires billing)
5. **Sentry** (optional, for error tracking)

---

## Local Development

### Option 1: Docker Compose (Recommended)

```bash
cd backend

# Copy environment template
cp .env.example .env

# Edit .env with your credentials
nano .env

# Start all services
./scripts/deploy-local.sh

# Or manually:
docker-compose up -d

# View logs
docker-compose logs -f api

# Access services:
# API:    http://localhost:8000
# Docs:   http://localhost:8000/docs
# ReDoc:  http://localhost:8000/redoc
# Flower: http://localhost:5555
```

### Option 2: Virtual Environment

```bash
cd backend

# Create virtual environment
python3.11 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Set environment variables
export $(cat .env | xargs)

# Start PostgreSQL and Redis (Docker)
docker run -d -p 5432:5432 \
  -e POSTGRES_DB=tucitasegura \
  -e POSTGRES_USER=tucitasegura \
  -e POSTGRES_PASSWORD=changeme \
  postgres:15-alpine

docker run -d -p 6379:6379 redis:7-alpine

# Run FastAPI
uvicorn main:app --reload --port 8000
```

---

## Environment Configuration

### Required Environment Variables

Create `.env` file from `.env.example`:

```bash
# CRITICAL - Must set before deployment
FIREBASE_PROJECT_ID=tuscitasseguras-2d1a6
FIREBASE_PRIVATE_KEY_PATH=./serviceAccountKey.json  # Download from Firebase Console

DATABASE_URL=postgresql://user:password@host:5432/tucitasegura
REDIS_URL=redis://host:6379/0

SECRET_KEY=<generate-with-python-secrets>
STRIPE_SECRET_KEY=sk_live_xxxxxxxxxxxxx
STRIPE_PUBLISHABLE_KEY=pk_live_xxxxxxxxxxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx

GOOGLE_MAPS_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXX

CORS_ORIGINS=https://tucitasegura.com,https://www.tucitasegura.com
```

### Generate Secrets

```bash
# Generate SECRET_KEY
python -c "import secrets; print(secrets.token_urlsafe(32))"

# Generate secure passwords
openssl rand -base64 32
```

### Firebase Service Account

1. Go to Firebase Console: https://console.firebase.google.com/
2. Select project: `tuscitasseguras-2d1a6`
3. Project Settings → Service Accounts
4. Click "Generate New Private Key"
5. Download `serviceAccountKey.json`
6. **NEVER commit this file to git!**

---

## Deployment Platforms

### Railway Deployment (Recommended)

**Why Railway:**
- ✅ Free $5 credit/month
- ✅ Auto-scaling
- ✅ Integrated PostgreSQL & Redis
- ✅ One-click deployments
- ✅ Built-in monitoring

**Step 1: Setup Railway Project**

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Initialize project (in backend directory)
cd backend
railway init

# Link to existing project or create new
railway link
```

**Step 2: Add Services**

```bash
# Add PostgreSQL
railway add -s postgres

# Add Redis
railway add -s redis

# The backend service is created automatically
```

**Step 3: Configure Environment Variables**

```bash
# Add variables from .env file
railway variables set FIREBASE_PROJECT_ID=tuscitasseguras-2d1a6
railway variables set SECRET_KEY=$(python -c "import secrets; print(secrets.token_urlsafe(32))")
railway variables set STRIPE_SECRET_KEY=sk_live_xxx
railway variables set GOOGLE_MAPS_API_KEY=AIzaSyXXX
railway variables set CORS_ORIGINS=https://tucitasegura.com

# Or bulk set from .env:
cat .env | grep -v '^#' | grep -v '^$' | xargs railway variables set
```

**Step 4: Upload Firebase Service Account**

```bash
# Upload as secret file
railway run "cat > serviceAccountKey.json" < serviceAccountKey.json
```

**Step 5: Deploy**

```bash
# Deploy using script
./scripts/deploy-railway.sh

# Or manually
railway up

# View logs
railway logs

# Open deployed app
railway open
```

**Step 6: Configure Custom Domain (Optional)**

1. Go to Railway Dashboard → Your Service → Settings
2. Add custom domain: `api.tucitasegura.com`
3. Add DNS CNAME record:
   ```
   Type: CNAME
   Name: api
   Value: <railway-provided-domain>.railway.app
   ```

**Cost:** $0/month (within free tier limits)

---

### Render Deployment

**Why Render:**
- ✅ Generous free tier
- ✅ Auto-deploy from GitHub
- ✅ Infrastructure as Code (render.yaml)
- ✅ EU region (Frankfurt)

**Step 1: Push Code to GitHub**

```bash
git add .
git commit -m "Deploy to Render"
git push origin main
```

**Step 2: Connect Repository**

1. Go to https://dashboard.render.com/
2. Click "New +" → "Web Service"
3. Connect your GitHub repository
4. Render auto-detects `render.yaml`

**Step 3: Configure Environment**

Render will create services automatically from `render.yaml`. Add secret variables manually:

1. Go to Service → Environment
2. Add secret variables:
   ```
   SECRET_KEY=<generated-secret>
   STRIPE_SECRET_KEY=sk_live_xxx
   STRIPE_PUBLISHABLE_KEY=pk_live_xxx
   STRIPE_WEBHOOK_SECRET=whsec_xxx
   GOOGLE_MAPS_API_KEY=AIzaSyXXX
   FIREBASE_PROJECT_ID=tuscitasseguras-2d1a6
   OPENAI_API_KEY=sk-xxx (optional)
   SENTRY_DSN=https://xxx (optional)
   ```

**Step 4: Upload Firebase Service Account**

1. Go to Service → Environment → Secret Files
2. Upload `serviceAccountKey.json`
3. Path: `/etc/secrets/serviceAccountKey.json`
4. Update env var:
   ```
   FIREBASE_PRIVATE_KEY_PATH=/etc/secrets/serviceAccountKey.json
   ```

**Step 5: Deploy**

Render will auto-deploy. Monitor progress in dashboard.

**Step 6: Verify Deployment**

```bash
curl https://tucitasegura-api.onrender.com/health
```

**Cost:**
- Free tier: $0/month (sleeps after inactivity)
- Standard: $7/month (always on)
- Database: $7/month after 90-day free trial

---

### Google Cloud Run Deployment

**Why Cloud Run:**
- ✅ Serverless (pay per use)
- ✅ Auto-scaling to zero
- ✅ Powerful infrastructure
- ✅ EU regions available

**Prerequisites:**
- Google Cloud account with billing enabled
- gcloud CLI installed

**Step 1: Build Docker Image**

```bash
cd backend

# Build for Cloud Run
docker build -f Dockerfile.prod -t gcr.io/tuscitasseguras-2d1a6/backend:latest .

# Test locally
docker run -p 8080:8080 -e PORT=8080 gcr.io/tuscitasseguras-2d1a6/backend:latest
```

**Step 2: Push to Container Registry**

```bash
# Authenticate
gcloud auth configure-docker

# Push image
docker push gcr.io/tuscitasseguras-2d1a6/backend:latest
```

**Step 3: Deploy to Cloud Run**

```bash
gcloud run deploy tucitasegura-backend \
  --image gcr.io/tuscitasseguras-2d1a6/backend:latest \
  --platform managed \
  --region europe-west1 \
  --allow-unauthenticated \
  --set-env-vars="ENVIRONMENT=production,DEBUG=false" \
  --set-secrets="SECRET_KEY=secret-key:latest,STRIPE_SECRET_KEY=stripe-key:latest" \
  --memory 2Gi \
  --cpu 2 \
  --min-instances 0 \
  --max-instances 10
```

**Step 4: Configure Secrets**

```bash
# Create secrets in Secret Manager
echo -n "your-secret-key" | gcloud secrets create secret-key --data-file=-
echo -n "sk_live_xxx" | gcloud secrets create stripe-key --data-file=-

# Upload Firebase service account
gcloud secrets create firebase-key --data-file=serviceAccountKey.json
```

**Step 5: Add Database (Cloud SQL)**

```bash
# Create PostgreSQL instance
gcloud sql instances create tucitasegura-db \
  --database-version=POSTGRES_15 \
  --tier=db-f1-micro \
  --region=europe-west1

# Create database
gcloud sql databases create tucitasegura --instance=tucitasegura-db

# Connect Cloud Run to Cloud SQL
gcloud run services update tucitasegura-backend \
  --add-cloudsql-instances=tuscitasseguras-2d1a6:europe-west1:tucitasegura-db
```

**Cost Estimate:**
- Cloud Run: ~$5-20/month (depending on traffic)
- Cloud SQL: ~$7-15/month (db-f1-micro)
- Total: ~$12-35/month

---

### AWS Deployment

**Option 1: AWS EC2**

```bash
# Launch EC2 instance (t3.small recommended)
# Install Docker
ssh ec2-user@your-instance

sudo yum update -y
sudo yum install -y docker
sudo service docker start
sudo usermod -a -G docker ec2-user

# Clone repository
git clone <your-repo>
cd tucitasegura/backend

# Copy .env and service account
scp .env ec2-user@your-instance:~/backend/
scp serviceAccountKey.json ec2-user@your-instance:~/backend/

# Run with Docker Compose
docker-compose -f docker-compose.yml up -d

# Configure reverse proxy (Nginx)
sudo yum install nginx
# Configure nginx to proxy to localhost:8000
```

**Option 2: AWS ECS (Fargate)**

```bash
# Create ECR repository
aws ecr create-repository --repository-name tucitasegura-backend

# Build and push
docker tag tucitasegura-backend:latest <account-id>.dkr.ecr.eu-west-1.amazonaws.com/tucitasegura-backend
docker push <account-id>.dkr.ecr.eu-west-1.amazonaws.com/tucitasegura-backend

# Create ECS task definition
# Create ECS service with Fargate
```

**Cost Estimate:**
- EC2 t3.small: ~$15/month
- RDS PostgreSQL: ~$15/month
- ElastiCache Redis: ~$13/month
- Total: ~$43/month

---

## CI/CD Setup

### GitHub Actions (Recommended)

The GitHub Actions workflow (`.github/workflows/deploy-backend.yml`) automatically:
1. Runs tests on every push
2. Builds Docker image
3. Deploys to production (main branch only)

**Setup Secrets:**

Go to GitHub Repository → Settings → Secrets and add:

```
RAILWAY_TOKEN=<from railway auth token>
RAILWAY_URL=https://your-app.railway.app

# Or for Render:
RENDER_DEPLOY_HOOK=https://api.render.com/deploy/xxx
RENDER_URL=https://your-app.onrender.com
```

**Manual Trigger:**

```bash
# Go to GitHub Actions tab
# Select "Deploy Backend to Production"
# Click "Run workflow"
```

### GitLab CI (Alternative)

Create `.gitlab-ci.yml`:

```yaml
stages:
  - test
  - build
  - deploy

test:
  stage: test
  image: python:3.11
  services:
    - postgres:15
    - redis:7
  script:
    - cd backend
    - pip install -r requirements.txt
    - pytest

build:
  stage: build
  image: docker:latest
  script:
    - docker build -f backend/Dockerfile.prod -t tucitasegura-backend .

deploy:
  stage: deploy
  only:
    - main
  script:
    - railway up
```

---

## Post-Deployment

### 1. Verify Health Endpoint

```bash
curl https://your-app.com/health
```

Expected response:
```json
{
  "status": "healthy",
  "version": "1.0.0",
  "timestamp": "2025-11-14T12:00:00",
  "services": {
    "api": "running",
    "firebase": "connected",
    "ml": "loaded"
  }
}
```

### 2. Test Key Endpoints

```bash
# Test recommendations
curl -X POST https://your-app.com/api/v1/recommendations \
  -H "Content-Type: application/json" \
  -d '{"user_id": "test-user", "limit": 10}'

# Test photo verification
curl -X POST https://your-app.com/api/v1/verify-photo \
  -H "Content-Type: application/json" \
  -d '{"image_url": "https://example.com/photo.jpg", "claimed_age": 25}'
```

### 3. Configure Webhooks

**Stripe Webhooks:**
```bash
# Add webhook endpoint in Stripe Dashboard
https://your-app.com/api/v1/stripe-webhook

# Events to listen for:
# - customer.subscription.created
# - customer.subscription.updated
# - customer.subscription.deleted
# - payment_intent.succeeded
# - invoice.payment_failed
```

### 4. Setup Monitoring

**Sentry Integration:**
```bash
# Already configured in main.py
# Add SENTRY_DSN to environment variables
```

**Health Checks:**
```bash
# Add to UptimeRobot or similar
Endpoint: https://your-app.com/health
Interval: 5 minutes
```

### 5. Configure CDN (Optional)

For static ML models and assets:
```bash
# Cloudflare
# Add CNAME: api.tucitasegura.com → your-app.railway.app

# Enable caching for /models/* endpoints
```

---

## Monitoring & Maintenance

### Logging

**View Logs:**

```bash
# Railway
railway logs --service backend

# Render
# Dashboard → Logs tab

# Docker
docker-compose logs -f api
```

### Metrics

**Key Metrics to Monitor:**
- Response time (< 500ms)
- Error rate (< 1%)
- CPU usage (< 70%)
- Memory usage (< 80%)
- Database connections
- Redis cache hit rate

### Database Backups

**Railway:**
- Automatic daily backups
- View: Dashboard → Database → Backups

**Render:**
- Configure in Dashboard → Database → Backups
- Retention: 7 days (free tier)

**Manual Backup:**
```bash
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d).sql

# Restore
psql $DATABASE_URL < backup_20250114.sql
```

### Updates & Maintenance

**Update Dependencies:**
```bash
cd backend
pip list --outdated

# Update specific package
pip install --upgrade package-name

# Update requirements.txt
pip freeze > requirements.txt
```

**Security Updates:**
```bash
# Check for vulnerabilities
pip-audit

# Update critical packages
pip install --upgrade cryptography stripe firebase-admin
```

---

## Troubleshooting

### Issue 1: Health Check Fails

**Symptoms:**
```
curl: (7) Failed to connect to your-app.com port 443
```

**Solutions:**
1. Check if service is running: `railway logs`
2. Verify PORT environment variable matches
3. Check firewall rules
4. Verify CORS_ORIGINS includes your domain

### Issue 2: Database Connection Error

**Symptoms:**
```
sqlalchemy.exc.OperationalError: could not connect to server
```

**Solutions:**
1. Verify DATABASE_URL is correct
2. Check database is running: `railway status`
3. Whitelist IP address (if using Cloud SQL)
4. Increase connection pool: `DATABASE_POOL_SIZE=30`

### Issue 3: Firebase Authentication Failed

**Symptoms:**
```
google.auth.exceptions.DefaultCredentialsError
```

**Solutions:**
1. Verify serviceAccountKey.json exists
2. Check FIREBASE_PROJECT_ID matches
3. Verify file permissions (readable by app user)
4. Re-download service account key from Firebase Console

### Issue 4: Out of Memory

**Symptoms:**
```
MemoryError: Unable to allocate array
```

**Solutions:**
1. Increase memory limit:
   ```bash
   # Railway: Dashboard → Settings → Resources
   # Render: Upgrade to higher plan
   ```
2. Reduce ML model size
3. Enable pagination for large queries
4. Add Redis caching

### Issue 5: Slow Response Times

**Symptoms:**
```
Average response time: 2000ms+
```

**Solutions:**
1. Add Redis caching
2. Optimize database queries (add indexes)
3. Enable CDN for static assets
4. Increase worker count: `API_WORKERS=8`
5. Use connection pooling

---

## Cost Optimization

### Free Tier Limits

**Railway:**
- $5/month credit
- Recommended: Backend + Redis = ~$4/month

**Render:**
- Free: Web service (sleeps after inactivity)
- Database: 90 days free, then $7/month

### Cost-Saving Tips

1. **Use Free Tiers:**
   - Railway: $5 credit/month
   - Render: Free web service
   - Heroku: No longer free

2. **Optimize Workers:**
   ```python
   # Development: 1 worker
   API_WORKERS=1
   
   # Production (free tier): 2 workers
   API_WORKERS=2
   
   # Production (paid): 4-8 workers
   API_WORKERS=4
   ```

3. **Enable Caching:**
   ```python
   # Cache expensive ML predictions
   @cache.cached(timeout=3600, key_prefix='recommendation')
   def get_recommendations(user_id):
       # ...
   ```

4. **Use CDN:**
   - Cloudflare (free tier)
   - Cache ML models and static assets

5. **Auto-Scaling:**
   ```yaml
   # Railway: Enable auto-sleep
   # Render: Use free tier (sleeps after 15 min)
   ```

### Estimated Monthly Costs

| Platform | Configuration | Cost |
|----------|--------------|------|
| Railway (Free) | Backend + Redis | $0 (within $5 credit) |
| Render (Free) | Backend only | $0 (sleeps) |
| Render (Paid) | Backend + DB | $14/month |
| Cloud Run | Light traffic | $5-15/month |
| AWS EC2 | t3.small + RDS | $40-50/month |

**Recommended for Production:** Railway ($5/month) or Render Standard ($14/month)

---

## Quick Reference Commands

```bash
# Local Development
docker-compose up -d              # Start services
docker-compose logs -f api        # View logs
docker-compose restart api        # Restart API
docker-compose down               # Stop all

# Railway
railway login                     # Login
railway link                      # Link project
railway up                        # Deploy
railway logs                      # View logs
railway run bash                  # Open shell

# Render
# All done via dashboard
git push origin main              # Auto-deploy

# Testing
pytest tests/ -v                  # Run tests
pytest --cov=app                  # With coverage
curl localhost:8000/health        # Health check

# Database
psql $DATABASE_URL                # Connect to DB
pg_dump $DATABASE_URL > backup.sql  # Backup
```

---

## Support

**Issues?**
1. Check logs: `railway logs` or dashboard
2. Verify environment variables
3. Test health endpoint
4. Check [Troubleshooting](#troubleshooting) section
5. Contact platform support:
   - Railway: https://railway.app/help
   - Render: https://render.com/docs

**Documentation:**
- FastAPI: https://fastapi.tiangolo.com/
- Railway: https://docs.railway.app/
- Render: https://render.com/docs/

---

**✅ Your backend is now production-ready!**

**🔒 Security Checklist:**
- [ ] Environment variables set correctly
- [ ] Firebase service account uploaded securely
- [ ] CORS_ORIGINS configured
- [ ] Stripe webhook secrets added
- [ ] Database credentials rotated
- [ ] HTTPS enabled (auto on Railway/Render)
- [ ] Sentry monitoring configured

**📊 Monitoring Dashboard:**
- Railway: https://railway.app/dashboard
- Render: https://dashboard.render.com/
- Sentry: https://sentry.io/

**Next Step:** [Configure Frontend to use deployed backend API]
