# 🚀 Deployment Quick Start

**Tiempo estimado**: 15-20 minutos

---

## ⚡ Pasos Rápidos

### 1. Prerequisitos (5 min)

```bash
# Instalar herramientas
npm install -g firebase-tools
npm install -g @railway/cli

# Login
firebase login
railway login
```

### 2. Configurar Variables de Entorno (5 min)

```bash
# Backend - Copiar y editar
cp backend/.env.production.example backend/.env.production
nano backend/.env.production  # Llenar con valores reales

# Frontend - Copiar y editar
cp webapp/.env.example webapp/.env.production
nano webapp/.env.production  # Llenar con valores reales
```

**Generar secrets**:
```bash
# SECRET_KEY y CSRF_SECRET_KEY
openssl rand -hex 32

# ENCRYPTION_KEY
python3 -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
```

### 3. Deploy Backend a Railway (5 min)

```bash
# Opción A: Desde Railway Dashboard
1. Ir a railway.app → New Project → Deploy from GitHub
2. Seleccionar repo → Rama main
3. Variables → Pegar contenido de .env.production
4. Deploy automático iniciará

# Opción B: Desde CLI
cd backend
railway init
railway up
```

**Verificar**:
```bash
curl https://your-app.railway.app/health
```

### 4. Deploy Frontend a Firebase (5 min)

```bash
cd webapp

# Build
npm install
npm run build

# Deploy
cd ..
firebase deploy --only hosting
```

**Verificar**:
- Abrir https://your-project.web.app
- Verificar console (F12) - no errores

---

## 🔧 Configuración Post-Deployment

### PayPal Webhook

1. Ir a https://developer.paypal.com/dashboard/
2. Apps & Credentials → Tu app → Webhooks → Add Webhook
3. URL: `https://api.tucitasegura.com/api/payments/paypal/webhook`
4. Eventos: Seleccionar BILLING.* y PAYMENT.*
5. Copiar Webhook ID → Railway variables: `PAYPAL_WEBHOOK_ID`

### Firebase Rules & Indexes

```bash
firebase deploy --only firestore:rules
firebase deploy --only firestore:indexes
```

### Configurar Dominio (Opcional)

**Backend (Railway)**:
- Railway → Settings → Domains → Add Domain
- DNS: `api.tucitasegura.com` CNAME → `your-app.railway.app`

**Frontend (Firebase)**:
- Firebase Console → Hosting → Add custom domain
- DNS: `tucitasegura.com` A → IP de Firebase

---

## ✅ Verificación Final

```bash
# Backend health
curl https://api.tucitasegura.com/health

# Frontend
open https://tucitasegura.com

# Test completo
1. Abrir app
2. Registrar usuario
3. Login
4. Crear perfil
5. Test payment (pequeño monto)
```

---

## 📊 Monitoreo

### Setup Sentry

1. Crear proyecto en sentry.io
2. Copiar DSN
3. Agregar a Railway variables: `SENTRY_DSN=...`
4. Redeploy: `railway up`

### Setup Uptime Monitor

1. Ir a uptimerobot.com (gratis)
2. Add Monitor → HTTP(s)
3. URL: `https://api.tucitasegura.com/health`
4. Interval: 5 minutes
5. Alert: Email/SMS

---

## 🆘 Troubleshooting Rápido

### Backend no responde

```bash
# Ver logs
railway logs -f

# Verificar variables
railway variables

# Redeploy
railway up
```

### Frontend errores CORS

```bash
# Verificar CORS_ORIGINS en Railway
railway variables get CORS_ORIGINS

# Debe incluir dominio del frontend
railway variables set CORS_ORIGINS=https://tucitasegura.com
```

### Health check fails

```bash
# Detailed check
curl https://api.tucitasegura.com/health/detailed

# Verificar cada servicio
# - Firestore credentials
# - PayPal credentials
# - reCAPTCHA credentials
```

---

## 📚 Documentación Completa

- **Guía Detallada**: `docs/DEPLOYMENT_GUIDE.md`
- **Checklist Pre-Deployment**: `docs/PRE_DEPLOYMENT_CHECKLIST.md`
- **Scripts Automáticos**: `scripts/deploy-*.sh`

---

## 🚀 Scripts Automáticos

```bash
# Deploy todo (backend + frontend)
bash scripts/deploy-all.sh

# Solo backend
bash scripts/deploy-backend.sh

# Solo frontend
bash scripts/deploy-frontend.sh
```

---

## ✅ Checklist Mínimo

- [ ] Firebase & Railway CLI instalados
- [ ] `.env.production` configurado (backend y frontend)
- [ ] Backend deployed → Health check pasa
- [ ] Frontend deployed → App carga
- [ ] PayPal webhook configurado
- [ ] Firebase rules & indexes deployed
- [ ] Sentry configurado
- [ ] Uptime monitor configurado

---

**¿Listo?** → `bash scripts/deploy-all.sh`

**¿Problemas?** → Ver `docs/DEPLOYMENT_GUIDE.md` sección Troubleshooting
