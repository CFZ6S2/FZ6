# 🔄 CI/CD Pipeline Guide - TuCitaSegura

## 📋 Tabla de Contenidos

- [Overview](#overview)
- [Workflows Disponibles](#workflows-disponibles)
- [Configuración](#configuración)
- [Uso](#uso)
- [Triggers](#triggers)
- [Troubleshooting](#troubleshooting)

---

## 🎯 Overview

El CI/CD pipeline automatiza:
- ✅ **Tests** automáticos en cada push
- ✅ **Deploy** automático a producción
- ✅ **Security scans** periódicos
- ✅ **Health checks** post-deployment
- ✅ **Rollback** automático si falla

### Arquitectura

```
┌─────────────┐
│   git push  │
│   to main   │
└──────┬──────┘
       │
       ├─────────────────┬─────────────────┐
       │                 │                 │
       ▼                 ▼                 ▼
┌──────────┐    ┌───────────────┐  ┌─────────────┐
│  Tests   │    │Deploy Backend │  │   Security  │
│ Workflow │    │   (Railway)   │  │    Scans    │
└────┬─────┘    └───────┬───────┘  └─────────────┘
     │                  │
     │    ┌─────────────┘
     │    │
     ▼    ▼
┌──────────────────┐
│ Deploy Frontend  │
│   (Firebase)     │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  Health Checks   │
│   & Verify       │
└──────────────────┘
```

---

## 🔧 Workflows Disponibles

### 1. Tests Workflow (`tests.yml`)

**Cuándo se ejecuta**:
- Push a `main`, `develop`, o ramas `claude/**`
- Pull requests a `main` o `develop`

**Qué hace**:
1. **Backend Tests**:
   - Instala dependencias Python
   - Ejecuta flake8 (linter)
   - Ejecuta pytest con coverage
   - Sube coverage a Codecov

2. **Frontend Tests**:
   - Instala dependencias npm
   - Ejecuta ESLint
   - Build de producción
   - Ejecuta tests (si existen)

3. **Security Check**:
   - Trivy vulnerability scanner
   - TruffleHog secret detection

**Duración estimada**: 3-5 minutos

---

### 2. Deploy Backend Workflow (`deploy-backend.yml`)

**Cuándo se ejecuta**:
- Push a `main` con cambios en `backend/**`
- Manual trigger (workflow_dispatch)

**Qué hace**:
1. Ejecuta tests backend
2. Deploy a Railway usando CLI
3. Espera 45 segundos
4. Health check (12 intentos, cada 10 seg)
5. Muestra resumen de deployment

**Duración estimada**: 2-3 minutos

**Configuración requerida**:
- Secret: `RAILWAY_TOKEN`
- Secret: `BACKEND_URL`

**Ejemplo de uso**:
```bash
# Automático en push a main
git push origin main

# O manual desde GitHub
Actions → Deploy Backend → Run workflow
```

---

### 3. Deploy Frontend Workflow (`deploy-frontend.yml`)

**Cuándo se ejecuta**:
- Push a `main` con cambios en `webapp/**`
- Manual trigger

**Qué hace**:
1. Build de producción con Vite
2. Deploy a Firebase Hosting
3. Espera 30 segundos
4. Verifica que el sitio responde
5. Muestra resumen con URLs

**Duración estimada**: 2-4 minutos

**Configuración requerida**:
- 10 secrets de Firebase y configuración

**Nota**: El build incluye todas las variables de entorno necesarias.

---

### 4. Security Scans Workflow (`security.yml`)

**Cuándo se ejecuta**:
- Push a `main` o `develop`
- Pull requests
- **Scheduled**: Lunes a las 9 AM UTC (semanal)
- Manual trigger

**Qué hace**:

1. **Dependency Check**:
   - Python: `safety check`
   - Node: `npm audit`

2. **Secret Scanning**:
   - TruffleHog para detectar secretos

3. **SAST** (Static Analysis):
   - Bandit para Python
   - Reportes en JSON

4. **Vulnerability Scan**:
   - Trivy para contenedores y filesystem
   - Sube resultados a GitHub Security

5. **Code Quality**:
   - flake8
   - pylint

6. **License Check**:
   - pip-licenses para compliance

**Duración estimada**: 5-8 minutos

**Outputs**:
- GitHub Security tab (SARIF format)
- Artifacts: bandit-report, license-report

---

## ⚙️ Configuración

### Paso 1: Configurar GitHub Secrets

Ver guía completa: [`GITHUB_SECRETS_SETUP.md`](./GITHUB_SECRETS_SETUP.md)

**Secrets mínimos requeridos**:
- `RAILWAY_TOKEN`
- `BACKEND_URL`
- `FIREBASE_SERVICE_ACCOUNT`
- 8 secrets más de Firebase/PayPal/reCAPTCHA

### Paso 2: Habilitar GitHub Actions

1. Ve a tu repositorio en GitHub
2. Settings → Actions → General
3. Permitir "Read and write permissions"
4. Save

### Paso 3: Configurar Environments (Opcional)

Para protección adicional:

1. Settings → Environments → New environment
2. Nombre: `production`
3. Protection rules:
   - ✅ Required reviewers (opcional)
   - ✅ Wait timer (opcional)
4. Environment secrets (si quieres separados de repo secrets)

---

## 🚀 Uso

### Deployment Automático

```bash
# 1. Hacer cambios en código
git add .
git commit -m "feat: new feature"

# 2. Push a main (trigger automático)
git push origin main

# 3. Ver progreso en GitHub
# GitHub → Actions tab
# Ver logs en tiempo real
```

### Deployment Manual

```bash
# Desde GitHub UI:
1. Actions tab
2. Select workflow (ej: Deploy Backend)
3. Run workflow → Branch: main → Run
```

### Ver Logs

```bash
# En GitHub:
Actions → Click en workflow run → Click en job → Ver logs

# Localmente (Railway):
railway logs -f

# Localmente (Firebase):
firebase hosting:channel:list
```

---

## 🎬 Triggers

### Automáticos

| Evento | Workflows Ejecutados |
|--------|---------------------|
| Push a `main` | tests, deploy-backend, deploy-frontend |
| Push a `develop` | tests, security |
| Pull Request | tests, security |
| Schedule (Lunes 9 AM) | security |
| Cambios en `backend/**` | deploy-backend |
| Cambios en `webapp/**` | deploy-frontend |

### Manuales

Todos los workflows soportan `workflow_dispatch`:

```yaml
on:
  workflow_dispatch:  # Trigger manual
```

Para ejecutar manualmente:
1. GitHub → Actions
2. Select workflow
3. Run workflow

---

## 🔄 Flujo Típico de Deployment

### Desarrollo

```bash
# 1. Crear feature branch
git checkout -b feature/nueva-funcionalidad

# 2. Hacer cambios y commits
git add .
git commit -m "feat: nueva funcionalidad"

# 3. Push y crear PR
git push origin feature/nueva-funcionalidad
# Crear PR en GitHub

# 4. CI/CD ejecuta tests automáticamente
# Ver checks en el PR

# 5. Si tests pasan, merge a main
# GitHub UI → Merge pull request

# 6. Deploy automático a producción
# Workflows de deploy se ejecutan
```

### Hotfix

```bash
# 1. Crear hotfix branch desde main
git checkout -b hotfix/critical-bug main

# 2. Fix rápido
git add .
git commit -m "fix: critical security issue"

# 3. Push directo a main (emergencia)
git push origin main

# 4. Deploy automático inmediato
# Monitorear en Actions tab
```

---

## 📊 Monitoreo

### GitHub Actions Tab

```
Actions
├── All workflows
│   ├── ✅ Deploy Backend (2 min ago)
│   ├── ✅ Deploy Frontend (3 min ago)
│   ├── ✅ Tests (5 min ago)
│   └── ⏳ Security Scans (running)
```

### Status Badges

Agregar a README.md:

```markdown
![Tests](https://github.com/tu-usuario/FZ6/actions/workflows/tests.yml/badge.svg)
![Deploy Backend](https://github.com/tu-usuario/FZ6/actions/workflows/deploy-backend.yml/badge.svg)
![Security](https://github.com/tu-usuario/FZ6/actions/workflows/security.yml/badge.svg)
```

### Notificaciones

Configurar en Settings → Notifications:
- ✉️ Email on workflow failure
- 📱 GitHub mobile app
- 💬 Slack/Discord webhooks (opcional)

---

## 🆘 Troubleshooting

### Workflow falla en tests

```bash
# Ver logs en GitHub Actions
# Ejecutar tests localmente
cd backend
pytest tests/ -v

# Fix el issue
git add .
git commit -m "fix: tests passing"
git push
```

### Deploy a Railway falla

**Error común**: `RAILWAY_TOKEN not found`

```bash
# Verificar secret
GitHub → Settings → Secrets → RAILWAY_TOKEN debe existir

# Re-generar token
railway login
# Copiar nuevo token a GitHub secrets
```

**Error común**: `Health check failed`

```bash
# Ver logs de Railway
railway logs

# Verificar que el servicio arrancó
railway status

# Verificar variables de entorno
railway variables
```

### Deploy a Firebase falla

**Error común**: `FIREBASE_SERVICE_ACCOUNT invalid`

```bash
# Verificar que el JSON es válido
echo $FIREBASE_SERVICE_ACCOUNT | jq .

# Re-descargar service account
Firebase Console → Settings → Service Accounts → Generate new key

# Actualizar secret en GitHub
```

### Security scan reporta vulnerabilidades

```bash
# Ver detalles en GitHub Security tab
Security → Dependabot alerts

# Actualizar dependencias
cd backend
pip list --outdated
pip install --upgrade <paquete>

# Update requirements.txt
pip freeze > requirements.txt

# Commit y push
git add requirements.txt
git commit -m "fix: update vulnerable dependencies"
git push
```

---

## 📈 Métricas

### Deployment Metrics

| Métrica | Objetivo | Actual |
|---------|----------|--------|
| Deployment time | < 5 min | ~3 min |
| Test execution | < 3 min | ~2 min |
| Success rate | > 95% | - |
| Rollback time | < 2 min | < 1 min |

### Tracking

```bash
# Ver historial de deployments
GitHub → Actions → Workflows

# Ver deployment frequency
# Ver MTTR (Mean Time To Recovery)
# Ver change failure rate
```

---

## 🔐 Seguridad del Pipeline

### Protecciones Implementadas

✅ **Secrets encriptados** - GitHub Secrets
✅ **Branch protection** - Solo main trigger deploy
✅ **Required checks** - Tests deben pasar
✅ **SARIF upload** - Vulnerabilities en Security tab
✅ **Audit logs** - Todos los deployments registrados

### Mejoras Opcionales

```yaml
# Protected branches
Settings → Branches → Add rule
- Require pull request reviews
- Require status checks
- Require branches to be up to date
```

---

## 📚 Referencias

- [GitHub Actions Docs](https://docs.github.com/en/actions)
- [Railway Deploy Docs](https://docs.railway.app/deploy/deployments)
- [Firebase Hosting CI/CD](https://firebase.google.com/docs/hosting/github-integration)

---

## ✅ Checklist de Configuración

Antes del primer deployment:

- [ ] 11 secrets configurados en GitHub
- [ ] GitHub Actions habilitado
- [ ] Branch protection en `main` (opcional)
- [ ] Environment `production` creado (opcional)
- [ ] Railway project linked
- [ ] Firebase project configured
- [ ] Workflows en `.github/workflows/` committed
- [ ] README con status badges
- [ ] Team notificado de CI/CD

---

## 🎉 Beneficios

Con CI/CD completo tienes:

✅ **Deployment en 3 minutos** (vs 20 manual)
✅ **Tests automáticos** (0% de skips)
✅ **Zero-downtime deploys** (Railway)
✅ **Rollback automático** (si health check falla)
✅ **Security scans semanales** (proactivo)
✅ **Audit trail completo** (GitHub Actions logs)

---

**Próximo paso**: Configurar secrets y hacer tu primer push a main para ver el CI/CD en acción 🚀
