# 🔑 Secrets Reference Card - Quick Copy

**Proyecto**: TuCitaSegura (FZ6)
**Firebase Project**: `tuscitasseguras-2d1a6`
**Total Secrets**: 11

---

## 📋 Tabla Rápida

| # | Secret Name | Dónde Obtenerlo | Ejemplo/Formato |
|---|-------------|-----------------|-----------------|
| 1 | `RAILWAY_TOKEN` | https://railway.app/account/tokens | `eyJhbGciOiJSUzI1NiI...` |
| 2 | `BACKEND_URL` | Railway Dashboard → Domains | `https://tu-app.railway.app` |
| 3 | `VITE_FIREBASE_API_KEY` | Firebase Console → Settings → General | `AIzaSyA...` |
| 4 | `VITE_FIREBASE_AUTH_DOMAIN` | Firebase Config | `tuscitasseguras-2d1a6.firebaseapp.com` |
| 5 | `VITE_FIREBASE_PROJECT_ID` | Firebase Config | `tuscitasseguras-2d1a6` |
| 6 | `VITE_FIREBASE_STORAGE_BUCKET` | Firebase Config | `tuscitasseguras-2d1a6.appspot.com` |
| 7 | `VITE_FIREBASE_MESSAGING_SENDER_ID` | Firebase Config | `123456789012` |
| 8 | `VITE_FIREBASE_APP_ID` | Firebase Config | `1:123456789012:web:abc...` |
| 9 | `FIREBASE_SERVICE_ACCOUNT` | Firebase → Service Accounts → Generate Key | `{"type":"service_account"...}` |
| 10 | `VITE_PAYPAL_CLIENT_ID` | PayPal Developer → Live Apps | `AeA1QIZXbDhS5Gk...` |
| 11 | `VITE_RECAPTCHA_SITE_KEY` | Google reCAPTCHA Admin | `6LeIxAcTAAAAA...` |

---

## 🔗 Links Directos

### Railway
- **Token**: https://railway.app/account/tokens
- **Dashboard**: https://railway.app/dashboard

### Firebase
- **Project**: https://console.firebase.google.com/project/tuscitasseguras-2d1a6
- **Settings**: https://console.firebase.google.com/project/tuscitasseguras-2d1a6/settings/general
- **Service Accounts**: https://console.firebase.google.com/project/tuscitasseguras-2d1a6/settings/serviceaccounts/adminsdk

### PayPal
- **Dashboard**: https://developer.paypal.com/dashboard/
- **Live Apps**: https://developer.paypal.com/dashboard/applications/live

### reCAPTCHA
- **Admin Console**: https://www.google.com/recaptcha/admin

### GitHub
- **Secrets**: https://github.com/CFZ6S2/FZ6/settings/secrets/actions
- **Actions Settings**: https://github.com/CFZ6S2/FZ6/settings/actions
- **Workflows**: https://github.com/CFZ6S2/FZ6/actions

---

## 🎯 Valores Pre-rellenados

Algunos valores ya los conocemos:

```bash
# ✅ YA CONOCIDOS
VITE_FIREBASE_PROJECT_ID=tuscitasseguras-2d1a6
VITE_FIREBASE_AUTH_DOMAIN=tuscitasseguras-2d1a6.firebaseapp.com
VITE_FIREBASE_STORAGE_BUCKET=tuscitasseguras-2d1a6.appspot.com
```

**Faltan por obtener**: 8 secrets

---

## 📝 Template para Copiar/Pegar

```bash
# RAILWAY
RAILWAY_TOKEN=
BACKEND_URL=

# FIREBASE
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=tuscitasseguras-2d1a6.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=tuscitasseguras-2d1a6
VITE_FIREBASE_STORAGE_BUCKET=tuscitasseguras-2d1a6.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
FIREBASE_SERVICE_ACCOUNT=

# PAYPAL
VITE_PAYPAL_CLIENT_ID=

# RECAPTCHA
VITE_RECAPTCHA_SITE_KEY=
```

---

## ⚠️ Notas Importantes

### FIREBASE_SERVICE_ACCOUNT
- **Debe ser el JSON completo**
- Descargar desde Service Accounts → "Generate new private key"
- Copiar TODO el contenido del archivo
- Incluir las llaves `{` y `}`
- Sin espacios ni saltos de línea extra

### PAYPAL_CLIENT_ID
- **Usar credenciales de LIVE (producción)**
- NO usar sandbox/test
- Verificar que está en "Live" mode

### BACKEND_URL
- Debe terminar con `.railway.app`
- Incluir `https://`
- SIN barra final `/`
- Ejemplo: `https://tucitasegura.railway.app`

---

## 🚀 Comando GitHub CLI (Opcional)

Si tienes `gh` CLI instalado:

```bash
# Ejemplo de configuración rápida
gh secret set RAILWAY_TOKEN --body "tu-token"
gh secret set BACKEND_URL --body "https://tu-app.railway.app"
gh secret set VITE_FIREBASE_PROJECT_ID --body "tuscitasseguras-2d1a6"
# ... etc
```

---

## ✅ Verificación

Después de configurar todos los secrets:

```bash
# Ver secrets configurados (no sus valores)
gh secret list

# O en GitHub web:
# Settings → Secrets → Verás 11 secrets listados
```

---

## 🎯 Orden Recomendado

Configurar en este orden (del más fácil al más complejo):

1. ✅ VITE_FIREBASE_PROJECT_ID (ya lo tienes)
2. ✅ VITE_FIREBASE_AUTH_DOMAIN (ya lo tienes)
3. ✅ VITE_FIREBASE_STORAGE_BUCKET (ya lo tienes)
4. 🔍 BACKEND_URL (ver Railway dashboard)
5. 🔍 RAILWAY_TOKEN (generar nuevo token)
6. 🔍 VITE_FIREBASE_API_KEY (Firebase Console)
7. 🔍 VITE_FIREBASE_MESSAGING_SENDER_ID (Firebase Console)
8. 🔍 VITE_FIREBASE_APP_ID (Firebase Console)
9. 🔍 VITE_PAYPAL_CLIENT_ID (PayPal Dashboard)
10. 🔍 VITE_RECAPTCHA_SITE_KEY (reCAPTCHA Console)
11. 📄 FIREBASE_SERVICE_ACCOUNT (descargar JSON completo)

---

## 📊 Progreso

```
☐ RAILWAY_TOKEN
☐ BACKEND_URL
☐ VITE_FIREBASE_API_KEY
☑ VITE_FIREBASE_AUTH_DOMAIN (auto)
☑ VITE_FIREBASE_PROJECT_ID (auto)
☑ VITE_FIREBASE_STORAGE_BUCKET (auto)
☐ VITE_FIREBASE_MESSAGING_SENDER_ID
☐ VITE_FIREBASE_APP_ID
☐ FIREBASE_SERVICE_ACCOUNT
☐ VITE_PAYPAL_CLIENT_ID
☐ VITE_RECAPTCHA_SITE_KEY

Completados: 3/11 (27%)
Pendientes: 8/11 (73%)
```

---

## 🔒 Seguridad

- ❌ NUNCA commitear estos valores en Git
- ❌ NUNCA compartir por email/Slack
- ✅ Solo configurar en GitHub Secrets
- ✅ Usar diferentes secrets para staging/prod
- ✅ Rotar cada 3-6 meses

---

**Siguiente paso**: Abrir https://github.com/CFZ6S2/FZ6/settings/secrets/actions y empezar a agregar secrets.
