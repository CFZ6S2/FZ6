# 🔐 GitHub Secrets Configuration

**Para CI/CD Pipeline**

Esta guía explica cómo configurar todos los secrets necesarios en GitHub para que los workflows de CI/CD funcionen correctamente.

---

## 📋 Acceder a GitHub Secrets

1. Ve a tu repositorio en GitHub
2. Click en **Settings**
3. En el menú lateral, click en **Secrets and variables** → **Actions**
4. Click en **New repository secret**

---

## 🔑 Secrets Requeridos

### Backend (Railway)

#### 1. RAILWAY_TOKEN

**Descripción**: Token de autenticación para Railway CLI

**Cómo obtenerlo**:
```bash
# Opción 1: Desde Railway Dashboard
1. Ir a https://railway.app
2. Account Settings → Tokens
3. Create New Token
4. Copiar el token

# Opción 2: Desde Railway CLI
railway login
railway whoami
# El token está en ~/.railway/config.json
```

**Valor de ejemplo**: `eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...`

**Agregar a GitHub**:
- Name: `RAILWAY_TOKEN`
- Value: `<tu-token-de-railway>`

---

#### 2. BACKEND_URL

**Descripción**: URL de tu backend en Railway

**Cómo obtenerlo**:
```bash
# Opción 1: Desde Railway Dashboard
1. Ir a tu proyecto en Railway
2. Backend service → Settings → Domains
3. Copiar la URL (ej: https://tu-app.railway.app)

# Opción 2: Desde CLI
railway domain
```

**Valor de ejemplo**: `https://tucitasegura-backend.railway.app`

**Agregar a GitHub**:
- Name: `BACKEND_URL`
- Value: `https://tu-app.railway.app`

---

### Frontend (Firebase)

#### 3. FIREBASE_SERVICE_ACCOUNT

**Descripción**: Service account JSON para Firebase deployment

**Cómo obtenerlo**:
```bash
1. Ir a Firebase Console: https://console.firebase.google.com
2. Seleccionar tu proyecto
3. Settings (⚙️) → Service Accounts
4. Click "Generate new private key"
5. Descargar el archivo JSON
```

**Formato del valor**:
```json
{
  "type": "service_account",
  "project_id": "tu-proyecto",
  "private_key_id": "...",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
  "client_email": "...",
  "client_id": "...",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "...",
  "client_x509_cert_url": "..."
}
```

**Agregar a GitHub**:
- Name: `FIREBASE_SERVICE_ACCOUNT`
- Value: `<pegar-todo-el-contenido-del-json>`

---

#### 4. VITE_FIREBASE_API_KEY

**Descripción**: Firebase API Key para el frontend

**Cómo obtenerlo**:
```bash
1. Firebase Console → Project Settings → General
2. En "Your apps" → Web app
3. Copiar apiKey
```

**Valor de ejemplo**: `AIzaSyAgFcoHwoBpo80rlEHL2hHVZ2DqtjWXh2s`

**Agregar a GitHub**:
- Name: `VITE_FIREBASE_API_KEY`
- Value: `<tu-api-key>`

---

#### 5. VITE_FIREBASE_AUTH_DOMAIN

**Valor**: `tu-proyecto.firebaseapp.com`

**Ejemplo**: `tu-cita-segura.firebaseapp.com`

---

#### 6. VITE_FIREBASE_PROJECT_ID

**Valor**: ID de tu proyecto Firebase

**Ejemplo**: `tu-cita-segura`

---

#### 7. VITE_FIREBASE_STORAGE_BUCKET

**Valor**: `tu-proyecto.appspot.com`

**Ejemplo**: `tu-cita-segura.appspot.com`

---

#### 8. VITE_FIREBASE_MESSAGING_SENDER_ID

**Valor**: Sender ID de Firebase

**Ejemplo**: `123456789012`

---

#### 9. VITE_FIREBASE_APP_ID

**Valor**: App ID de Firebase

**Ejemplo**: `1:123456789012:web:abcdef123456`

---

### PayPal

#### 10. VITE_PAYPAL_CLIENT_ID

**Descripción**: PayPal Client ID de PRODUCCIÓN

**Cómo obtenerlo**:
```bash
1. Ir a https://developer.paypal.com/dashboard/
2. Apps & Credentials → Live
3. Seleccionar tu app
4. Copiar Client ID
```

⚠️ **IMPORTANTE**: Usar credenciales de PRODUCTION, no sandbox

**Valor de ejemplo**: `AeA1QIZXbDhS5Gk...-X-K_xnI`

**Agregar a GitHub**:
- Name: `VITE_PAYPAL_CLIENT_ID`
- Value: `<tu-client-id-de-produccion>`

---

### reCAPTCHA

#### 11. VITE_RECAPTCHA_SITE_KEY

**Descripción**: reCAPTCHA v3 Site Key

**Cómo obtenerlo**:
```bash
1. Ir a https://www.google.com/recaptcha/admin
2. Seleccionar tu site
3. Copiar "Site key"
```

**Valor de ejemplo**: `6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI`

**Agregar a GitHub**:
- Name: `VITE_RECAPTCHA_SITE_KEY`
- Value: `<tu-site-key>`

---

## 📝 Lista Completa de Secrets

Copia esta tabla para verificar que tienes todos:

| Secret Name | Source | Required |
|-------------|--------|----------|
| `RAILWAY_TOKEN` | Railway Account Settings | ✅ |
| `BACKEND_URL` | Railway Service Domain | ✅ |
| `FIREBASE_SERVICE_ACCOUNT` | Firebase Service Account JSON | ✅ |
| `VITE_FIREBASE_API_KEY` | Firebase Project Settings | ✅ |
| `VITE_FIREBASE_AUTH_DOMAIN` | Firebase Project Settings | ✅ |
| `VITE_FIREBASE_PROJECT_ID` | Firebase Project Settings | ✅ |
| `VITE_FIREBASE_STORAGE_BUCKET` | Firebase Project Settings | ✅ |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Firebase Project Settings | ✅ |
| `VITE_FIREBASE_APP_ID` | Firebase Project Settings | ✅ |
| `VITE_PAYPAL_CLIENT_ID` | PayPal Developer (LIVE) | ✅ |
| `VITE_RECAPTCHA_SITE_KEY` | Google reCAPTCHA Admin | ✅ |

**Total**: 11 secrets requeridos

---

## 🔒 Verificar Secrets Configurados

Desde GitHub Actions, puedes verificar que los secrets están configurados (sin ver sus valores):

```yaml
- name: Check secrets
  run: |
    echo "Checking required secrets..."
    [ -z "${{ secrets.RAILWAY_TOKEN }}" ] && echo "❌ RAILWAY_TOKEN missing" || echo "✅ RAILWAY_TOKEN configured"
    [ -z "${{ secrets.BACKEND_URL }}" ] && echo "❌ BACKEND_URL missing" || echo "✅ BACKEND_URL configured"
    # ... etc
```

---

## 🚀 Después de Configurar los Secrets

1. **Hacer un push a main**:
   ```bash
   git push origin main
   ```

2. **Verificar que los workflows se ejecutan**:
   - Ve a tu repo en GitHub
   - Click en **Actions** tab
   - Deberías ver los workflows ejecutándose

3. **Revisar logs si falla**:
   - Click en el workflow que falló
   - Revisar los logs de cada step
   - Los errores comunes son secrets faltantes o incorrectos

---

## 🔐 Mejores Prácticas de Seguridad

### ✅ DO

- ✅ Usar secrets diferentes para staging y production
- ✅ Rotar secrets regularmente (cada 3-6 meses)
- ✅ Usar environment secrets para separar staging/production
- ✅ Verificar que `.env` y `*.json` están en `.gitignore`
- ✅ Documentar qué secreto viene de dónde

### ❌ DON'T

- ❌ Commitear secrets en el código
- ❌ Usar secrets de sandbox en production
- ❌ Compartir secrets por email o Slack
- ❌ Usar los mismos secrets en múltiples proyectos
- ❌ Hardcodear secrets en los workflows

---

## 🆘 Troubleshooting

### Error: "RAILWAY_TOKEN not found"

```bash
# Verificar que el secret está configurado
# GitHub Settings → Secrets → Verificar que existe RAILWAY_TOKEN

# Verificar que el workflow lo usa correctamente
env:
  RAILWAY_TOKEN: ${{ secrets.RAILWAY_TOKEN }}
```

### Error: "Firebase deployment failed"

```bash
# Verificar que el JSON es válido
cat firebase-service-account.json | jq .

# Verificar que se copió completo (incluyendo llaves)
# Debe empezar con { y terminar con }
```

### Error: "Backend URL not responding"

```bash
# Verificar que Railway está desplegado
railway status

# Verificar que la URL es correcta
curl https://tu-app.railway.app/health

# Verificar en GitHub que BACKEND_URL está bien configurado
```

---

## 📚 Referencias

- [GitHub Encrypted Secrets](https://docs.github.com/en/actions/security-guides/encrypted-secrets)
- [Railway Tokens](https://docs.railway.app/develop/cli#authentication)
- [Firebase Service Accounts](https://firebase.google.com/docs/admin/setup#initialize-sdk)
- [Environment Secrets](https://docs.github.com/en/actions/deployment/targeting-different-environments/using-environments-for-deployment)

---

## ✅ Checklist Final

Antes de hacer push, verifica:

- [ ] Todos los 11 secrets configurados en GitHub
- [ ] RAILWAY_TOKEN válido y activo
- [ ] BACKEND_URL correcta (termina con .railway.app)
- [ ] FIREBASE_SERVICE_ACCOUNT es un JSON completo
- [ ] Credenciales de PayPal son de PRODUCTION (no sandbox)
- [ ] reCAPTCHA site key es de producción
- [ ] `.env*` y `*credentials.json` en `.gitignore`
- [ ] No hay secrets hardcodeados en el código

---

**Una vez configurados todos los secrets**, los workflows se ejecutarán automáticamente en cada push a `main`.

**Próximo paso**: Hacer un push y ver los workflows en acción en GitHub Actions tab.
