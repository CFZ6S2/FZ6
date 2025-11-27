# 🚀 Guía Express: Activar CI/CD en 15 Minutos

**Proyecto**: TuCitaSegura
**Repositorio**: CFZ6S2/FZ6
**Estado actual**: Workflows configurados ✅ | Secrets pendientes ⏳

---

## 📊 ¿Qué tendrás cuando termines?

Cada vez que hagas `git push origin main`:

```
Push → GitHub Actions ejecuta:
├─ ✅ Tests automáticos (2-3 min)
├─ 🚂 Deploy backend a Railway (3-5 min)
├─ 🔥 Deploy frontend a Firebase (2-4 min)
└─ 🔒 Security scans (5-8 min)

Total: 3-5 minutos de código a producción
```

**Bonus automático:**
- 💾 Backups diarios de Firestore (00:00 UTC)
- 🏥 Health checks post-deployment
- ↩️ Rollback si algo falla

---

## ⚡ SETUP RÁPIDO (15 minutos)

### 🎯 Paso 1: Ejecutar Script de Verificación (1 min)

```bash
cd /home/user/FZ6
./scripts/check-github-secrets.sh
```

Este script te mostrará exactamente qué secrets necesitas configurar y dónde obtenerlos.

---

### 🔑 Paso 2: Configurar 11 Secrets en GitHub (10-12 min)

**URL**: https://github.com/CFZ6S2/FZ6/settings/secrets/actions

#### Railway (2 secrets)

| Secret | Dónde obtenerlo | Valor ejemplo |
|--------|----------------|---------------|
| `RAILWAY_TOKEN` | https://railway.app/account/tokens | `RAILWAY_TOKEN_xxxxx...` |
| `BACKEND_URL` | Railway → Settings → Domains | `https://fz6-production.up.railway.app` |

#### Firebase (7 secrets)

**Config general**: https://console.firebase.google.com/project/tuscitasseguras-2d1a6/settings/general

| Secret | Valor |
|--------|-------|
| `VITE_FIREBASE_PROJECT_ID` | `tuscitasseguras-2d1a6` |
| `VITE_FIREBASE_API_KEY` | Copiar de Firebase Config |
| `VITE_FIREBASE_AUTH_DOMAIN` | `tuscitasseguras-2d1a6.firebaseapp.com` |
| `VITE_FIREBASE_STORAGE_BUCKET` | `tuscitasseguras-2d1a6.appspot.com` |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Copiar de Firebase Config |
| `VITE_FIREBASE_APP_ID` | Copiar de Firebase Config |

**Service Account** (⚠️ IMPORTANTE):

| Secret | Dónde obtenerlo |
|--------|----------------|
| `FIREBASE_SERVICE_ACCOUNT` | [Ver instrucciones abajo](#firebase-service-account) |

#### PayPal (1 secret)

| Secret | Dónde obtenerlo | Nota |
|--------|----------------|------|
| `VITE_PAYPAL_CLIENT_ID` | https://developer.paypal.com/dashboard/applications/live | ⚠️ Usar **LIVE** no sandbox |

#### reCAPTCHA (1 secret)

| Secret | Dónde obtenerlo |
|--------|----------------|
| `VITE_RECAPTCHA_SITE_KEY` | https://www.google.com/recaptcha/admin |

---

### 📝 Cómo agregar cada secret:

Para cada secret de la lista:

1. **Ir a**: https://github.com/CFZ6S2/FZ6/settings/secrets/actions
2. **Click**: "New repository secret"
3. **Name**: [nombre exacto del secret]
4. **Value**: [pegar valor copiado]
5. **Click**: "Add secret"
6. **Repetir** para el siguiente

---

### 🔐 FIREBASE_SERVICE_ACCOUNT (Paso detallado)

Este es el más importante y requiere pasos especiales:

1. **Ir a**: https://console.firebase.google.com/project/tuscitasseguras-2d1a6/settings/serviceaccounts/adminsdk
2. **Click**: "Generate new private key" → Confirmar
3. **Descargar**: Archivo JSON (ej: `tuscitasseguras-2d1a6-xxxxx.json`)
4. **Abrir** el archivo con un editor de texto (VS Code, Notepad, nano, etc.)
5. **Copiar TODO** el contenido (desde `{` hasta `}`)
6. **Pegar** en GitHub Secret `FIREBASE_SERVICE_ACCOUNT`

⚠️ **Debe incluir el JSON completo**, incluyendo las llaves `{ }`.

---

### ⚙️ Paso 3: Habilitar Permisos de GitHub Actions (1 min)

1. **Ir a**: https://github.com/CFZ6S2/FZ6/settings/actions
2. En "Workflow permissions":
   - ✅ Seleccionar: **"Read and write permissions"**
3. **Click**: "Save"

---

### 🚀 Paso 4: Activar CI/CD con un Push (2 min)

```bash
cd /home/user/FZ6

# Pequeño cambio para trigger
echo "# CI/CD Activated $(date)" >> .github/CICD_STATUS.md

git add .
git commit -m "chore: activate CI/CD pipeline"
git push origin main
```

---

### ✅ Paso 5: Verificar que Funciona (2-3 min)

1. **Ir a**: https://github.com/CFZ6S2/FZ6/actions
2. **Ver** workflows ejecutándose:
   - ✅ Tests
   - 🚂 Deploy Backend
   - 🔥 Deploy Frontend
   - 🔒 Security Scan

**Si todo está verde** → ¡CI/CD activado! 🎉

**Si hay errores rojos** → Ver logs del workflow para saber qué secret falta

---

## 🔍 Troubleshooting

### ❌ Error: "Secret RAILWAY_TOKEN not found"

**Causa**: Secret no configurado o nombre incorrecto
**Solución**: Verificar que el nombre sea exactamente `RAILWAY_TOKEN` (case-sensitive)

### ❌ Error: "Firebase deployment failed"

**Causa**: `FIREBASE_SERVICE_ACCOUNT` incompleto o inválido
**Solución**: Verificar que pegaste TODO el JSON, desde `{` hasta `}`

### ❌ Error: "Health check failed"

**Causa**: Railway no está desplegado o `BACKEND_URL` incorrecta
**Solución**:
```bash
# Verificar manualmente
curl https://fz6-production.up.railway.app/health
```

### ❌ Workflow no se ejecuta

**Causa**: Permisos de GitHub Actions no habilitados
**Solución**: Ir a Settings → Actions → Habilitar "Read and write permissions"

---

## 📊 Workflows Disponibles

### 1. Tests (`tests.yml`)
- **Trigger**: Push a cualquier branch
- **Duración**: 2-3 minutos
- **Qué hace**:
  - ✅ Ejecuta pytest
  - ✅ Linters (flake8, black)
  - ✅ Verifica code quality

### 2. Deploy Backend (`deploy-backend.yml`)
- **Trigger**: Push a main (cambios en `backend/`)
- **Duración**: 3-5 minutos
- **Qué hace**:
  - 🧪 Ejecuta tests
  - 🚂 Deploy a Railway
  - 🏥 Health check automático
  - ↩️ Rollback si falla

### 3. Deploy Frontend (`deploy-frontend.yml`)
- **Trigger**: Push a main (cambios en `webapp/`, `js/`, `css/`, `*.html`)
- **Duración**: 2-4 minutos
- **Qué hace**:
  - 🔥 Deploy a Firebase Hosting
  - ✅ Verifica que el sitio esté online

### 4. Security Scans (`security.yml`)
- **Trigger**: Push a main + Schedule semanal (lunes 00:00 UTC)
- **Duración**: 5-8 minutos
- **Qué hace**:
  - 🔒 CodeQL analysis
  - 🐛 Busca vulnerabilidades
  - 📊 Genera reportes

### 5. Backups Firestore (`backup-firestore.yml`)
- **Trigger**: Schedule diario (00:00 UTC)
- **Duración**: 3-5 minutos
- **Qué hace**:
  - 💾 Export completo de Firestore
  - ☁️ Guarda en Cloud Storage
  - 🗑️ Cleanup backups > 30 días
  - ✅ Verifica integridad

---

## 🎯 Beneficios Inmediatos

Una vez activado, obtienes:

| Beneficio | Antes | Después |
|-----------|-------|---------|
| **Tiempo de deploy** | 20+ min manual | 3-5 min automático |
| **Tests** | Manual, inconsistente | Automático en cada push |
| **Seguridad** | Auditorías manuales | Scans automáticos semanales |
| **Backups** | ❌ No configurados | ✅ Diarios automáticos |
| **Health checks** | Manual | Automático post-deploy |
| **Rollback** | Manual, lento | Automático si falla |
| **Confianza** | 😰 Nerviosa | 😎 Total |

---

## 📚 Scripts Útiles

### Verificar secrets configurados:
```bash
./scripts/check-github-secrets.sh
```

### Solucionar error 503:
```bash
./scripts/fix-503-error.sh
```

### Ver logs de workflows:
```bash
# Ir a:
https://github.com/CFZ6S2/FZ6/actions
```

---

## ✅ Checklist Completo

- [ ] Script `check-github-secrets.sh` ejecutado
- [ ] 11 secrets configurados en GitHub
- [ ] Permisos de GitHub Actions: "Read and write permissions"
- [ ] Push a main realizado
- [ ] Workflows aparecen en tab Actions
- [ ] ✅ Tests workflow PASSED
- [ ] ✅ Deploy Backend workflow PASSED
- [ ] ✅ Deploy Frontend workflow PASSED
- [ ] Health check manual: `curl [BACKEND_URL]/health` → 200 OK
- [ ] Frontend online: Abrir `[FIREBASE_URL]` en navegador

---

## 🆘 Si Necesitas Ayuda

1. **Ver logs de workflow**:
   - https://github.com/CFZ6S2/FZ6/actions
   - Click en el workflow que falló
   - Ver "Job logs" para detalles

2. **Verificar secrets**:
   - https://github.com/CFZ6S2/FZ6/settings/secrets/actions
   - No puedes ver valores, pero sí nombres

3. **Documentación completa**:
   - `ACTIVATE_CICD.md` - Guía detallada
   - `docs/CICD_GUIDE.md` - Guía técnica
   - `docs/GITHUB_SECRETS_SETUP.md` - Setup de secrets

---

## 🎉 ¡Listo!

Una vez que todos los workflows estén en verde, tu CI/CD está completamente funcional.

**Próximo push a main → Deploy automático en ~3-5 minutos** 🚀

---

**Última actualización**: 2025-11-27
**Autor**: Claude
**Branch**: claude/complete-deployment-01YCrznu73wKY9zeDCxV8GBM
