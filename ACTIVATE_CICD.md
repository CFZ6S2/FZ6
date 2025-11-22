# 🚀 ACTIVAR CI/CD AHORA - Guía Directa

**Tiempo**: 15-20 minutos
**Proyecto Firebase detectado**: `tuscitasseguras-2d1a6` ✅

---

## 🎯 OPCIÓN 1: Configuración Manual (Recomendada)

### Paso 1: Ir a GitHub Secrets (2 min)

1. Abre: https://github.com/CFZ6S2/FZ6/settings/secrets/actions
2. Click en **"New repository secret"**

---

### Paso 2: Agregar 11 Secrets (10-15 min)

Copia y pega cada uno:

#### 🚂 RAILWAY (2 secrets)

**1. RAILWAY_TOKEN**
- Obtener de: https://railway.app/account/tokens
- Click "Create New Token"
- Name: `RAILWAY_TOKEN`
- Value: `[tu token de Railway]`
- Click "Add secret"

**2. BACKEND_URL**
- Tu URL de Railway (ej: `https://tucitasegura-backend.railway.app`)
- Name: `BACKEND_URL`
- Value: `https://[tu-app].railway.app`
- Click "Add secret"

---

#### 🔥 FIREBASE (7 secrets)

Ve a: https://console.firebase.google.com/project/tuscitasseguras-2d1a6/settings/general

Scroll hasta "Your apps" → Web app → Config

**3. VITE_FIREBASE_API_KEY**
- Name: `VITE_FIREBASE_API_KEY`
- Value: `[apiKey del config]`

**4. VITE_FIREBASE_AUTH_DOMAIN**
- Name: `VITE_FIREBASE_AUTH_DOMAIN`
- Value: `tuscitasseguras-2d1a6.firebaseapp.com`

**5. VITE_FIREBASE_PROJECT_ID**
- Name: `VITE_FIREBASE_PROJECT_ID`
- Value: `tuscitasseguras-2d1a6`

**6. VITE_FIREBASE_STORAGE_BUCKET**
- Name: `VITE_FIREBASE_STORAGE_BUCKET`
- Value: `tuscitasseguras-2d1a6.appspot.com`

**7. VITE_FIREBASE_MESSAGING_SENDER_ID**
- Name: `VITE_FIREBASE_MESSAGING_SENDER_ID`
- Value: `[messagingSenderId del config]`

**8. VITE_FIREBASE_APP_ID**
- Name: `VITE_FIREBASE_APP_ID`
- Value: `[appId del config]`

**9. FIREBASE_SERVICE_ACCOUNT** ⚠️ IMPORTANTE
- Ve a: https://console.firebase.google.com/project/tuscitasseguras-2d1a6/settings/serviceaccounts/adminsdk
- Click "Generate new private key"
- Descargar el archivo JSON
- Abrir el archivo con un editor de texto
- Name: `FIREBASE_SERVICE_ACCOUNT`
- Value: `[copiar TODO el contenido del JSON, incluyendo llaves { }]`

---

#### 💰 PAYPAL (1 secret)

**10. VITE_PAYPAL_CLIENT_ID**
- Ve a: https://developer.paypal.com/dashboard/applications/live
- Selecciona tu app
- Copia el "Client ID" de **LIVE** (NO sandbox)
- Name: `VITE_PAYPAL_CLIENT_ID`
- Value: `[tu PayPal Client ID de LIVE]`

---

#### 🤖 RECAPTCHA (1 secret)

**11. VITE_RECAPTCHA_SITE_KEY**
- Ve a: https://www.google.com/recaptcha/admin
- Selecciona tu site
- Copia "Site key"
- Name: `VITE_RECAPTCHA_SITE_KEY`
- Value: `[tu reCAPTCHA site key]`

---

### Paso 3: Habilitar GitHub Actions (1 min)

1. Ve a: https://github.com/CFZ6S2/FZ6/settings/actions
2. En "Workflow permissions":
   - ✅ Selecciona "Read and write permissions"
3. Click **"Save"**

---

### Paso 4: Activar con un Push (2 min)

```bash
# En tu terminal local
cd /home/user/FZ6

# Pequeño cambio para trigger CI/CD
echo "" >> README.md
git add README.md
git commit -m "chore: activate CI/CD pipeline"

# Push que activará los workflows
git push origin main
```

---

### Paso 5: Verificar Workflows (3 min)

1. Ve a: https://github.com/CFZ6S2/FZ6/actions
2. Deberías ver workflows ejecutándose:
   - ✅ **Tests** (2-3 min)
   - ✅ **Deploy Backend** (2-3 min)
   - ✅ **Deploy Frontend** (2-4 min)
   - ✅ **Security** (5-8 min)

---

## 🎯 OPCIÓN 2: Script Automático (Alternativa)

Si prefieres usar un script interactivo:

```bash
cd /home/user/FZ6
./scripts/setup-github-secrets.sh
```

El script te guiará paso a paso para recopilar todos los secrets.

---

## ✅ Checklist de Verificación

- [ ] 11 secrets configurados en GitHub
- [ ] GitHub Actions tiene permisos de escritura
- [ ] Push a main realizado
- [ ] Workflows aparecen en Actions tab
- [ ] Tests workflow pasó (verde ✅)
- [ ] Deploy backend exitoso
- [ ] Deploy frontend exitoso
- [ ] Health checks pasaron

---

## 🆘 Si algo falla

### "Secret not found"
```bash
# Verificar que el nombre del secret es exacto (case-sensitive)
# Debe ser: RAILWAY_TOKEN (no railway_token)
```

### "Firebase deployment failed"
```bash
# Verificar que FIREBASE_SERVICE_ACCOUNT es el JSON completo
# Debe empezar con { y terminar con }
# Incluir TODO el archivo, no solo una parte
```

### "Health check failed"
```bash
# Verificar que Railway está desplegado
# Verificar que BACKEND_URL es correcta y termina con .railway.app
curl $BACKEND_URL/health
```

---

## 📊 Qué Pasará Después

Una vez activado, **cada push a main** ejecutará automáticamente:

| Tiempo | Workflow | Qué hace |
|--------|----------|----------|
| 0:00 | Trigger | Push detectado |
| 0:30 | Tests | Ejecuta pytest + linters |
| 2:00 | Deploy Backend | Deploy a Railway + health check |
| 2:30 | Deploy Frontend | Deploy a Firebase Hosting |
| 3:00 | ✅ LISTO | App en producción |

**Paralelo**: Security scans (5-8 min) se ejecutan en background

---

## 🎉 Beneficios Inmediatos

Una vez activado:

- ⚡ **3 minutos** de código a producción
- 🧪 **Tests automáticos** en cada cambio
- 🔒 **Security scans** semanales
- 💾 **Backups automáticos** diarios
- 🏥 **Health checks** post-deploy
- ↩️ **Rollback automático** si falla

---

## 📚 Referencias Rápidas

- **Secrets completos**: `docs/GITHUB_SECRETS_SETUP.md`
- **CI/CD guide**: `docs/CICD_GUIDE.md`
- **Quick start**: `CICD_QUICK_START.md`

---

## 🚀 ¿Listo?

1. ✅ Configurar 11 secrets (10-15 min)
2. ✅ Habilitar GitHub Actions (1 min)
3. ✅ Push a main (1 min)
4. ✅ Ver workflows en Actions tab (3 min)

**Total: ~15-20 minutos para CI/CD completo** 🎊

---

**URLs importantes**:
- GitHub Secrets: https://github.com/CFZ6S2/FZ6/settings/secrets/actions
- GitHub Actions: https://github.com/CFZ6S2/FZ6/settings/actions
- Workflows: https://github.com/CFZ6S2/FZ6/actions
- Firebase Console: https://console.firebase.google.com/project/tuscitasseguras-2d1a6
- Railway: https://railway.app
- PayPal Dev: https://developer.paypal.com/dashboard/
- reCAPTCHA: https://www.google.com/recaptcha/admin

---

💡 **Tip**: Puedes configurar los secrets en cualquier orden. Los workflows solo se ejecutarán cuando todos estén configurados.

⚠️ **Importante**: Usa credenciales de **PRODUCCIÓN** (no sandbox/test) para PayPal y todos los servicios.
