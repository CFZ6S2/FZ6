# Railway Environment Variables - CORS Fix

## ⚠️ PROBLEMA ACTUAL
El frontend en `tucitasegura.com` no puede conectarse al backend porque Railway está en modo `development` y solo permite CORS desde `localhost`.

## ✅ SOLUCIÓN
Configura estas variables de entorno en Railway Dashboard:

### 1. Ve a tu proyecto en Railway
https://railway.app/project/tu-proyecto/service/tu-servicio/variables

### 2. Agrega estas variables OBLIGATORIAS:

```bash
ENVIRONMENT=production
DEBUG=false
CORS_ORIGINS=https://tucitasegura.com,https://www.tucitasegura.com
```

### 3. Variables RECOMENDADAS (para mejor configuración):

```bash
# Firebase
FIREBASE_PROJECT_ID=tuscitasseguras-2d1a6
FIREBASE_DATABASE_URL=https://tuscitasseguras-2d1a6-default-rtdb.europe-west1.firebasedatabase.app

# API
API_VERSION=1.0.0
API_WORKERS=4
PYTHON_VERSION=3.11.0

# Seguridad
SECRET_KEY=<genera_una_clave_secreta>
ENABLE_CSRF=false
```

### 4. Firebase Service Account (CRÍTICO para autenticación)

Opción A - Subir archivo:
```bash
FIREBASE_PRIVATE_KEY_PATH=/app/firebase-credentials.json
```

Opción B - Variable de entorno (RECOMENDADO para Railway):
```bash
# Obtén el JSON de Firebase Console → Project Settings → Service Accounts
# Luego conviértelo a base64:
cat firebase-credentials.json | base64 -w 0

# Pega el resultado en:
FIREBASE_SERVICE_ACCOUNT_B64=<tu_base64_aqui>
```

### 5. Después de agregar las variables:

Railway automáticamente **redesplegará** el servicio. Espera 2-3 minutos.

### 6. Verifica que funcionó:

```bash
# Debería mostrar CORS origins correctos
curl https://t2c06-production.up.railway.app/security-info
```

## 🧪 Testing

Una vez configurado, prueba desde la consola del navegador en tucitasegura.com:

```javascript
fetch('https://t2c06-production.up.railway.app/health')
  .then(r => r.json())
  .then(d => console.log('✅ Backend conectado:', d))
  .catch(e => console.error('❌ Error:', e))
```

## 📝 Notas

- **NO** incluyas comillas en los valores de las variables
- Railway redespliega automáticamente al cambiar variables
- El healthcheck puede tardar unos minutos en pasar después del redeploy
