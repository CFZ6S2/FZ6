# 🚀 Railway - Configuración Completa de TuCitaSegura Backend

**Fecha:** 2025-11-22
**Status:** ✅ CORS funcionando, Backend operativo
**URL:** https://fz6-production.up.railway.app

---

## 📊 Estado Actual

### ✅ Lo que YA está funcionando

| Componente | Estado | Detalles |
|------------|--------|----------|
| **CORS** | ✅ Funcionando | Fixed middleware order |
| **Health Check** | ✅ Operativo | `/health` responde 200 OK |
| **Environment** | ✅ Production | Variables aplicadas correctamente |
| **Security Headers** | ✅ Activos | HSTS, CSP, X-Frame-Options, etc. |
| **CSRF Protection** | ✅ Enabled | Protección activa |
| **Rate Limiting** | ✅ Enabled | 60/min en endpoints principales |
| **Public Networking** | ✅ Configurado | fz6-production.up.railway.app:8080 |

### ⚠️ Lo que FALTA configurar

| Componente | Estado | Prioridad | Acción Requerida |
|------------|--------|-----------|------------------|
| **Firebase Auth** | ❌ Disabled | 🔴 ALTA | Agregar credenciales de servicio |
| **Database** | ❌ No configurado | 🔴 ALTA | Agregar PostgreSQL en Railway |
| **Redis** | ❌ No configurado | 🟡 MEDIA | Opcional para cache |
| **PayPal** | ❌ No configurado | 🟡 MEDIA | Solo si necesitas pagos |
| **Sentry** | ❌ No configurado | 🟢 BAJA | Opcional para monitoring |
| **Email SMTP** | ❌ No configurado | 🟡 MEDIA | Solo si necesitas emails |

---

## 🔧 Variables de Entorno Configuradas

### ✅ Variables ACTUALES en Railway

```bash
SECRET_KEY=8Kx9mP2nQ5rT7uV1wX4yZ6aC3bD0eF8gH1jK4lM7nP9qR2sT5uV8wX0yZ3aC6bD
FIREBASE_PROJECT_ID=tuscitasseguras-2d1a6
ENVIRONMENT=production
DEBUG=false
CORS_ORIGINS=https://tucitasegura.com,https://www.tucitasegura.com
FIREBASE_DATABASE_URL=https://tuscitasseguras-2d1a6-default-rtdb.europe-west1.firebasedatabase.app
API_WORKERS=4
PYTHON_VERSION=3.11.0
```

---

## 🔥 PASO 1: Configurar Firebase Auth (CRÍTICO)

### ¿Por qué es necesario?

Firebase Auth está **disabled** porque faltan las credenciales de servicio. Sin esto, **NO funcionará**:
- ✗ Login de usuarios
- ✗ Registro
- ✗ Autenticación de API requests
- ✗ Verificación de tokens JWT

### Cómo obtener las credenciales

1. **Ve a Firebase Console:**
   - https://console.firebase.google.com/project/tuscitasseguras-2d1a6/settings/serviceaccounts/adminsdk

2. **Genera una nueva clave privada:**
   - Click en "Generate New Private Key"
   - Se descargará un archivo JSON (ej: `tuscitasseguras-2d1a6-firebase-adminsdk-xxxxx.json`)

3. **Convierte el archivo a Base64:**
   ```bash
   # En Linux/Mac:
   cat tuscitasseguras-2d1a6-firebase-adminsdk-xxxxx.json | base64 -w 0

   # En Windows (PowerShell):
   [Convert]::ToBase64String([IO.File]::ReadAllBytes("tuscitasseguras-2d1a6-firebase-adminsdk-xxxxx.json"))
   ```

4. **Agrega en Railway Dashboard:**
   - Variable: `FIREBASE_SERVICE_ACCOUNT_B64`
   - Valor: El string base64 completo (será MUY largo)

### Alternativa: Subir archivo directamente

Si Railway permite subir archivos, puedes:
1. Subir el JSON a `/app/firebase-credentials.json`
2. Agregar variable: `FIREBASE_PRIVATE_KEY_PATH=/app/firebase-credentials.json`

---

## 🗄️ PASO 2: Configurar Database (PostgreSQL)

### En Railway Dashboard

1. **Agregar PostgreSQL:**
   - Click en "+ New" → "Database" → "PostgreSQL"
   - Railway creará automáticamente la variable `DATABASE_URL`

2. **Variables adicionales (opcionales):**
   ```bash
   DATABASE_POOL_SIZE=20
   DATABASE_MAX_OVERFLOW=0
   ```

3. **Railway redesplegará automáticamente** con la DB conectada

---

## 💳 PASO 3: Configurar PayPal (Opcional)

Solo necesario si usas el sistema de pagos/suscripciones.

### Desarrollo (Sandbox)

```bash
PAYPAL_CLIENT_ID=<tu_sandbox_client_id>
PAYPAL_CLIENT_SECRET=<tu_sandbox_secret>
PAYPAL_MODE=sandbox
```

### Producción (Live)

```bash
PAYPAL_CLIENT_ID=<tu_live_client_id>
PAYPAL_CLIENT_SECRET=<tu_live_secret>
PAYPAL_MODE=live
PAYPAL_WEBHOOK_ID=<tu_webhook_id>
```

**Obtener credenciales:**
- https://developer.paypal.com/dashboard/applications

---

## 📧 PASO 4: Configurar Email SMTP (Opcional)

Para envío de emails (notificaciones, verificación, etc.)

### Gmail (más común)

```bash
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=tu-email@gmail.com
SMTP_PASSWORD=<app_password>
FROM_EMAIL=noreply@tucitasegura.com
FROM_NAME=TuCitaSegura
```

**Cómo obtener App Password:**
1. Activa 2FA en tu cuenta de Google
2. Ve a: https://myaccount.google.com/apppasswords
3. Crea una nueva "App Password" para Mail
4. Usa ese password (NO tu password de Gmail)

---

## 📊 PASO 5: Sentry Monitoring (Opcional)

Para tracking de errores en producción.

```bash
SENTRY_DSN=https://xxxxx@xxxxxx.ingest.sentry.io/xxxxxx
```

**Obtener DSN:**
1. Crea cuenta en https://sentry.io
2. Crea nuevo proyecto → FastAPI/Python
3. Copia el DSN que te da

---

## 🔐 Variables de Seguridad Adicionales

### Encryption Key (Para datos sensibles)

```bash
# Generar una nueva key:
python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"

# Luego agregar en Railway:
ENCRYPTION_KEY=<la_key_generada>
```

### reCAPTCHA (Anti-bot)

```bash
RECAPTCHA_SECRET_KEY=<tu_secret_key>
RECAPTCHA_MIN_SCORE=0.5
```

**Obtener:**
- https://www.google.com/recaptcha/admin/create
- Selecciona reCAPTCHA v3

---

## 📝 Resumen de Variables por Prioridad

### 🔴 CRÍTICAS (Backend no funciona sin estas)

```bash
✅ ENVIRONMENT=production
✅ DEBUG=false
✅ SECRET_KEY=8Kx9mP2nQ5rT7uV1wX4yZ6aC3bD0eF8gH1jK4lM7nP9qR2sT5uV8wX0yZ3aC6bD
✅ CORS_ORIGINS=https://tucitasegura.com,https://www.tucitasegura.com
❌ FIREBASE_SERVICE_ACCOUNT_B64=<pendiente>
❌ DATABASE_URL=<pendiente>
```

### 🟡 IMPORTANTES (Features no funcionarán sin estas)

```bash
❌ PAYPAL_CLIENT_ID=<pendiente>
❌ PAYPAL_CLIENT_SECRET=<pendiente>
❌ SMTP_HOST=<pendiente>
❌ SMTP_PASSWORD=<pendiente>
❌ ENCRYPTION_KEY=<pendiente>
```

### 🟢 OPCIONALES (Mejoran la app pero no son esenciales)

```bash
❌ SENTRY_DSN=<pendiente>
❌ RECAPTCHA_SECRET_KEY=<pendiente>
❌ REDIS_URL=<pendiente>
❌ OPENAI_API_KEY=<pendiente>
```

---

## 🧪 Verificación Post-Configuración

Después de agregar Firebase Auth y Database, verifica:

### 1. Health Check Detallado

```javascript
fetch('https://fz6-production.up.railway.app/health/detailed')
  .then(r => r.json())
  .then(d => console.log('Health Check:', d));
```

Deberías ver:
```json
{
  "status": "healthy",
  "services": {
    "api": "running",
    "firebase": "connected",  // ✅ Debe ser "connected"
    "database": "connected",  // ✅ Debe ser "connected"
    "paypal": "configured"    // Si configuraste PayPal
  }
}
```

### 2. Security Info

```javascript
fetch('https://fz6-production.up.railway.app/security-info')
  .then(r => r.json())
  .then(d => console.log('Security Info:', d));
```

Deberías ver:
```json
{
  "environment": "production",
  "firebase_auth": "enabled",  // ✅ Debe ser "enabled"
  "csrf_protection": "enabled",
  "rate_limiting": "enabled"
}
```

---

## 📂 Archivos de Configuración

### Railway Config Files

El proyecto tiene múltiples archivos de configuración para Railway:

1. **`railway.json`** ← Railway usa este por defecto
2. **`railway.toml`** ← Alternativa
3. **`nixpacks.toml`** ← Build configuration

**Actual en uso:** `railway.toml` (Runtime V2)

```toml
[build]
builder = "NIXPACKS"

[deploy]
startCommand = "cd backend && ./start.sh"
runtime = "V2"
healthcheckPath = "/health"
healthcheckTimeout = 300
restartPolicyType = "ON_FAILURE"
restartPolicyMaxRetries = 10
```

---

## 🐛 Troubleshooting

### CORS Error persiste

1. Verifica que Railway usó el último commit:
   - Ir a Deployments tab
   - Buscar commit: `6238d2a - fix: Correct middleware order`

2. Verifica variables de entorno:
   - `ENVIRONMENT` debe ser `production`
   - `CORS_ORIGINS` debe incluir tu dominio

### Firebase Auth no conecta

1. Verifica que el JSON de Firebase es válido
2. Verifica que el proyecto ID coincide: `tuscitasseguras-2d1a6`
3. Revisa logs en Railway: "Firebase Admin inicializado"

### Database connection error

1. Verifica que PostgreSQL está agregado en Railway
2. La variable `DATABASE_URL` debe estar presente
3. Railway la genera automáticamente al agregar PostgreSQL

---

## 🎯 Próximos Pasos Recomendados

### Paso 1: Firebase Auth (HOY)
- [ ] Descargar credenciales de Firebase
- [ ] Convertir a Base64
- [ ] Agregar `FIREBASE_SERVICE_ACCOUNT_B64` en Railway
- [ ] Verificar que `firebase_auth: "enabled"`

### Paso 2: Database (HOY)
- [ ] Agregar PostgreSQL en Railway
- [ ] Verificar `DATABASE_URL` en variables
- [ ] Probar `/health/detailed` muestra DB conectada

### Paso 3: Features Opcionales (DESPUÉS)
- [ ] PayPal (si necesitas pagos)
- [ ] SMTP (si necesitas emails)
- [ ] Sentry (para monitoring)
- [ ] Redis (para cache)

---

## 📞 Soporte

Si algo no funciona:

1. **Revisa los logs en Railway:**
   - Dashboard → tu servicio → Deployments → Latest → View Logs

2. **Verifica el Health Check:**
   ```bash
   curl https://fz6-production.up.railway.app/health
   ```

3. **Verifica variables de entorno:**
   - Dashboard → Variables → Asegúrate que estén todas

---

**Última actualización:** 2025-11-22
**Commit actual:** `2aeb172` - chore: Trigger Railway redeploy with CORS fix
**Branch:** `claude/review-railway-config-01HWTLDugrAfar4R7yBxxbEn`
