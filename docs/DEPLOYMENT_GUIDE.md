# 🚀 Guía de Deployment - TuCitaSegura

## 📋 Índice

- [Prerequisitos](#prerequisitos)
- [Variables de Entorno](#variables-de-entorno)
- [Deployment Backend (Railway)](#deployment-backend-railway)
- [Deployment Frontend (Firebase)](#deployment-frontend-firebase)
- [Configuración Post-Deployment](#configuración-post-deployment)
- [Verificación](#verificación)
- [Rollback](#rollback)

---

## 📦 Prerequisitos

### Herramientas Requeridas

```bash
# Firebase CLI
npm install -g firebase-tools
firebase --version  # >= 12.0.0

# Railway CLI (opcional)
npm install -g @railway/cli
```

### Cuentas Necesarias

- ✅ Firebase (proyecto tu-cita-segura configurado)
- ✅ Railway (para backend)
- ✅ PayPal Production credentials
- ✅ Sentry DSN (opcional)

---

## 🔐 Variables de Entorno

### Backend (Railway)

```bash
# Firebase
FIREBASE_PROJECT_ID=tu-cita-segura
FIREBASE_SERVICE_ACCOUNT_B64=<base64_encoded_json>

# API
ENVIRONMENT=production
API_VERSION=1.0.0
DEBUG=false
SECRET_KEY=<openssl rand -hex 32>
PORT=8000

# CORS (separados por coma)
CORS_ORIGINS=https://tucitasegura.com,https://www.tucitasegura.com

# PayPal PRODUCTION
PAYPAL_CLIENT_ID=<production_client_id>
PAYPAL_CLIENT_SECRET=<production_secret>
PAYPAL_MODE=live
PAYPAL_WEBHOOK_ID=<webhook_id>

# reCAPTCHA
RECAPTCHA_SECRET_KEY=<secret>
RECAPTCHA_SITE_KEY=<site_key>

# Encryption
ENCRYPTION_KEY=<fernet_key>

# Sentry
SENTRY_DSN=https://xxxxx@xxxxx.ingest.sentry.io/xxxxx

# Security
ENABLE_CSRF=true
CSRF_SECRET_KEY=<openssl rand -hex 32>
```

### Frontend (Firebase)

Archivo `webapp/.env.production`:

```bash
VITE_FIREBASE_API_KEY=<api_key>
VITE_FIREBASE_AUTH_DOMAIN=tu-cita-segura.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=tu-cita-segura
VITE_FIREBASE_STORAGE_BUCKET=tu-cita-segura.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=<sender_id>
VITE_FIREBASE_APP_ID=<app_id>

VITE_API_URL=https://api.tucitasegura.com
VITE_ENVIRONMENT=production
VITE_RECAPTCHA_SITE_KEY=<site_key>
VITE_PAYPAL_CLIENT_ID=<production_client_id>
```

### Generar Secrets

```bash
# SECRET_KEY
openssl rand -hex 32

# ENCRYPTION_KEY (Fernet)
python3 -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
```

---

## 🚂 Deployment Backend (Railway)

### Método 1: Deploy desde GitHub (Recomendado)

#### 1. Conectar Repositorio

1. Ir a [railway.app](https://railway.app)
2. "New Project" → "Deploy from GitHub repo"
3. Seleccionar repositorio `FZ6`
4. Rama: `main`

#### 2. Configurar Variables de Entorno

En Railway Dashboard → Variables → Raw Editor:

```bash
# Pegar TODAS las variables del .env.production
```

#### 3. Configurar Railway

Crear `railway.json` en la raíz:

```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS",
    "buildCommand": "pip install -r backend/requirements.txt"
  },
  "deploy": {
    "startCommand": "cd backend && uvicorn main:app --host 0.0.0.0 --port $PORT",
    "healthcheckPath": "/health",
    "healthcheckTimeout": 100,
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

#### 4. Configurar Dominio

Railway Dashboard → Settings → Domains:

- Generate Domain (gratis): `xxxxx.railway.app`
- O dominio custom: `api.tucitasegura.com`
  - Agregar CNAME en DNS: `api` → `xxxxx.railway.app`

#### 5. Deploy

```bash
# Auto-deploy en push
git push origin main

# Ver logs
railway logs
```

### Método 2: Railway CLI

```bash
# Login
railway login

# Inicializar
cd backend
railway init

# Set variables
railway variables set ENVIRONMENT=production
# ... (todas las variables)

# Deploy
railway up

# Ver logs
railway logs -f
```

### Verificar Backend

```bash
curl https://api.tucitasegura.com/health

# Respuesta esperada:
{
  "status": "healthy",
  "version": "1.0.0",
  "checks": {
    "firestore": "healthy",
    "firebase_auth": "healthy",
    "paypal": "healthy",
    "recaptcha": "healthy"
  }
}
```

---

## 🔥 Deployment Frontend (Firebase)

### 1. Build de Producción

```bash
cd webapp

# Copiar env de producción
cp .env.production .env

# Instalar dependencias
npm install

# Build
npm run build

# Verificar
ls -lh dist/
```

### 2. Deploy a Firebase

```bash
# Login
firebase login

# Usar proyecto correcto
firebase use tu-cita-segura

# Deploy
firebase deploy --only hosting

# Ver URL
# → https://tu-cita-segura.web.app
```

### 3. Configurar Dominio Personalizado

```bash
# Agregar dominio
firebase hosting:channel:deploy production \
  --domain tucitasegura.com

# Configurar DNS (en tu provider):
Type    Name    Value
A       @       199.36.158.100
A       www     199.36.158.100
TXT     @       firebase=tu-cita-segura
CNAME   api     your-app.railway.app
```

### Verificar Frontend

```bash
# Abrir
open https://tucitasegura.com

# Verificar console (F12)
# ✅ No errores de CORS
# ✅ No errores de Firebase
# ✅ API conecta correctamente
```

---

## ⚙️ Configuración Post-Deployment

### 1. Webhooks de PayPal

URL: `https://api.tucitasegura.com/api/payments/paypal/webhook`

Eventos:
- `BILLING.SUBSCRIPTION.CREATED`
- `BILLING.SUBSCRIPTION.ACTIVATED`
- `BILLING.SUBSCRIPTION.CANCELLED`
- `PAYMENT.SALE.COMPLETED`
- `PAYMENT.SALE.REFUNDED`

Copiar Webhook ID y agregarlo a Railway variables.

### 2. Deploy Firebase Security

```bash
# Firestore rules
firebase deploy --only firestore:rules

# Firestore indexes
firebase deploy --only firestore:indexes

# Storage rules (si aplica)
firebase deploy --only storage
```

### 3. Configurar Monitoring

**Uptime Monitor** (uptimerobot.com):
- URL: `https://api.tucitasegura.com/health`
- Intervalo: 5 minutos
- Alertas: email/SMS

**Sentry**:
- Verificar en sentry.io que los eventos lleguen
- Configurar alertas de errores

---

## ✅ Verificación Post-Deployment

### Checklist Completo

```bash
# Backend
□ curl https://api.tucitasegura.com/health
  → {"status": "healthy", ...}

# Frontend
□ https://tucitasegura.com carga sin errores
□ Console sin errores
□ Registro de usuario funciona
□ Login funciona

# Integrations
□ Firebase Auth conecta
□ Firestore guarda datos
□ PayPal crea órdenes
□ reCAPTCHA valida

# Security
□ HTTPS activo
□ Security headers presentes
□ Rate limiting funciona
□ CSRF protection activa

# Monitoring
□ Sentry recibe eventos
□ Railway logs visibles
□ Uptime monitor configurado
```

### Tests de Producción

```bash
# Health check
curl https://api.tucitasegura.com/health

# Info de versión
curl https://api.tucitasegura.com/v1/info

# Security headers
curl -I https://api.tucitasegura.com

# Expected headers:
# X-Content-Type-Options: nosniff
# X-Frame-Options: DENY
# Strict-Transport-Security: max-age=31536000
```

---

## 🔄 Rollback

### Backend (Railway)

```bash
# Desde Dashboard:
Railway → Deployments → Select previous → Redeploy

# Desde CLI:
railway rollback
```

### Frontend (Firebase)

```bash
# Ver versiones
firebase hosting:releases:list

# Rollback
firebase hosting:rollback
```

---

## 🔧 Troubleshooting

### Error: "Firebase credentials not found"

```bash
# Verificar variable
railway variables get FIREBASE_SERVICE_ACCOUNT_B64

# Configurar:
cat firebase-credentials.json | base64 | \
  railway variables set FIREBASE_SERVICE_ACCOUNT_B64
```

### Error: "CORS blocking"

```bash
# Verificar CORS_ORIGINS
railway variables get CORS_ORIGINS

# Debe incluir dominio frontend
railway variables set CORS_ORIGINS=https://tucitasegura.com
```

### Error: "Health check failing"

```bash
# Ver logs
railway logs -f

# Verificar servicios
curl https://api.tucitasegura.com/health/detailed

# Verificar cada servicio individualmente
```

---

## 📊 Métricas Post-Deployment

### KPIs

- **Performance**: Response time < 200ms (p95)
- **Uptime**: > 99.9%
- **Error rate**: < 0.1%
- **Rate limit hits**: < 100/día

### Dashboards

1. Railway Dashboard: Logs, métricas
2. Sentry: Errores, performance
3. Firebase Console: Auth, Firestore
4. Google Analytics: Tráfico

---

## 🚨 Procedimientos de Emergencia

### Sistema Caído (Severidad 1)

1. Verificar Railway status
2. Rollback inmediato si deployment reciente
3. Revisar logs en Railway
4. Notificar usuarios
5. Investigar causa raíz

### Degradación (Severidad 2)

1. Revisar Sentry
2. Check health endpoints
3. Escalar recursos en Railway si necesario
4. Deploy fix

### Bug No Crítico (Severidad 3)

1. Crear issue en GitHub
2. Fix en próximo sprint

---

## ✅ Checklist Final

Antes de considerar deployment exitoso:

- [ ] Backend responde en https://api.tucitasegura.com
- [ ] Frontend carga en https://tucitasegura.com
- [ ] Health checks pasan
- [ ] Firebase Auth funciona
- [ ] PayPal funciona
- [ ] Webhooks configurados
- [ ] Sentry activo
- [ ] Monitoring configurado
- [ ] DNS propagado
- [ ] SSL/HTTPS funcionando
- [ ] Security rules deployed
- [ ] Firestore indexes deployed

---

## 🎉 Post-Deployment

**Próximos pasos**:

1. Monitorear primeras 48 horas
2. Configurar backups automáticos
3. Implementar CI/CD
4. Optimizar según métricas

**Mantenimiento**:

- Review Sentry errors diariamente
- Check uptime semanalmente
- Update dependencies mensualmente
- Security audit trimestral

---

**Última actualización**: 22 de Noviembre de 2025
**Versión**: 1.0.0
