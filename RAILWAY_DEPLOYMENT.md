# 🚂 Railway Deployment Guide - TuCitaSegura Backend

## ✅ Estado Actual

Todos los archivos están configurados y listos para desplegar en Railway.

## 📋 Archivos de Configuración

### Railway Configuration Files:
- ✅ `railway.json` - Configuración principal de Railway (builder DOCKERFILE)
- ✅ `backend/railway.toml` - Configuración alternativa
- ✅ `backend/railway.yml` - Configuración YAML
- ✅ `backend/Dockerfile` - Imagen Docker para Railway
- ✅ `backend/.dockerignore` - Archivos excluidos del build
- ✅ `backend/requirements.txt` - Dependencias Python

### Backend Files:
- ✅ `backend/main.py` - FastAPI application
- ✅ `backend/auth_utils.py` - Firebase authentication
- ✅ `backend/firebase_storage.py` - File upload to Firebase Storage

## 🔧 Pasos para Desplegar en Railway

### 1. Conectar Repositorio a Railway

1. Ve a [Railway.app](https://railway.app)
2. Click en "New Project"
3. Selecciona "Deploy from GitHub repo"
4. Conecta tu repositorio FZ6
5. Selecciona la rama: `claude/add-profile-geolocation-map-019NMwMwYpp4HGoBJpobKj88`

### 2. Configurar Variables de Entorno

⚠️ **CRÍTICO**: Debes configurar estas variables en Railway:

```bash
# Firebase Service Account (REQUERIDO)
SERVICE_ACCOUNT_JSON=<tu-service-account-json-completo>

# Firebase Storage Bucket
FIREBASE_STORAGE_BUCKET=tuscitasseguras-2d1a6.firebasestorage.app

# CORS Origins (opcional - tiene valores por defecto)
CORS_ORIGINS=https://tucitasegura.vercel.app,https://tucitasegura.com

# Environment
ENVIRONMENT=production
```

#### 🔑 Cómo obtener SERVICE_ACCOUNT_JSON:

1. Ve a [Firebase Console](https://console.firebase.google.com)
2. Selecciona tu proyecto "tuscitasseguras-2d1a6"
3. Ve a **Project Settings** ⚙️ → **Service Accounts**
4. Click en "Generate new private key"
5. Se descarga un archivo JSON
6. **IMPORTANTE**: Copia TODO el contenido del archivo JSON
7. Pégalo completo en la variable `SERVICE_ACCOUNT_JSON` en Railway

**Formato del JSON** (ejemplo):
```json
{
  "type": "service_account",
  "project_id": "tuscitasseguras-2d1a6",
  "private_key_id": "...",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
  "client_email": "...",
  "client_id": "...",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "..."
}
```

### 3. Verificar Configuración de Build

Railway debería detectar automáticamente la configuración:

- **Builder**: DOCKERFILE (configurado en railway.json)
- **Dockerfile Path**: backend/Dockerfile
- **Start Command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`

Si Railway sigue intentando usar Nixpacks:
1. Ve a Settings en tu servicio de Railway
2. En "Build & Deploy" → "Builder"
3. Selecciona manualmente "Dockerfile"
4. En "Dockerfile Path" pon: `backend/Dockerfile`

### 4. Health Check

Railway verificará la salud del servicio en:
- **Path**: `/health`
- **Timeout**: 100 segundos
- **Restart Policy**: ON_FAILURE (max 10 reintentos)

### 5. Deployment

Una vez configuradas las variables de entorno:
1. Railway automáticamente iniciará el build
2. Esperará unos 2-5 minutos para el build con Docker
3. Si todo está bien, verás "Deployment successful ✅"

## 🧪 Verificar el Deployment

### Test Endpoints:

1. **Health Check**:
   ```bash
   curl https://tu-app.railway.app/health
   ```
   Respuesta esperada:
   ```json
   {
     "status": "healthy",
     "service": "tucitasegura-api",
     "firebase": "connected",
     "environment": "production"
   }
   ```

2. **Root Endpoint**:
   ```bash
   curl https://tu-app.railway.app/
   ```
   Respuesta esperada:
   ```json
   {
     "status": "OK",
     "service": "TuCitaSegura API",
     "version": "1.0.0",
     "message": "Backend FZ6 operativo ✅"
   }
   ```

3. **Public API**:
   ```bash
   curl https://tu-app.railway.app/api/public
   ```

4. **API Docs**:
   - Abre en tu navegador: `https://tu-app.railway.app/docs`
   - Deberías ver la documentación interactiva de FastAPI

## ⚠️ Problemas Comunes

### Error: "Nixpacks download failed"
**Solución**: Ya está resuelto. La configuración usa DOCKERFILE en lugar de Nixpacks.

### Error: "Firebase not initialized"
**Causa**: Falta la variable `SERVICE_ACCOUNT_JSON`
**Solución**: Configura la variable en Railway Settings → Variables

### Error: "Port already in use"
**Causa**: Railway asigna el puerto dinámicamente vía `$PORT`
**Solución**: El Dockerfile ya usa `$PORT` correctamente

### Error 403 en git push
**Causa**: Branch name no coincide con session ID
**Solución**: Ya estás usando el branch correcto: `claude/add-profile-geolocation-map-019NMwMwYpp4HGoBJpobKj88`

## 📊 Recursos Railway

Una vez desplegado, Railway te dará:
- ✅ URL pública del backend (ej: `https://tucitasegura-backend.railway.app`)
- ✅ Logs en tiempo real
- ✅ Métricas de CPU/RAM
- ✅ Dominio personalizado (opcional)

## 🔐 Seguridad Post-Deployment

1. **Revoca las credenciales expuestas anteriormente**:
   - Ve a Firebase Console → Service Accounts
   - Elimina cualquier clave que hayas compartido en chat
   - Genera una nueva clave

2. **Restringe la Google Maps API Key**:
   - Ve a Google Cloud Console
   - Restringe la key a tu dominio de producción
   - Ejemplo: `tucitasegura.vercel.app`, `tucitasegura.com`

3. **Configura CORS correctamente**:
   - Actualiza `CORS_ORIGINS` en Railway
   - Solo incluye dominios de producción autorizados

## 📱 Integración Frontend-Backend

Una vez desplegado el backend en Railway, actualiza tu frontend:

1. En `webapp/js/firebase-config.js` o donde configures las APIs:
   ```javascript
   const API_BASE_URL = 'https://tu-app.railway.app';
   ```

2. Para llamar endpoints protegidos desde el frontend:
   ```javascript
   const token = await firebase.auth().currentUser.getIdToken();

   fetch(`${API_BASE_URL}/api/protected`, {
     headers: {
       'Authorization': `Bearer ${token}`
     }
   });
   ```

## ✅ Checklist Final

- [ ] Repositorio conectado a Railway
- [ ] Branch correcto seleccionado
- [ ] `SERVICE_ACCOUNT_JSON` configurado en Railway
- [ ] `FIREBASE_STORAGE_BUCKET` configurado
- [ ] Build completado exitosamente
- [ ] Health check respondiendo correctamente
- [ ] `/docs` accesible
- [ ] Frontend apuntando al backend de Railway
- [ ] Credenciales antiguas revocadas
- [ ] Google Maps API Key restringida

---

🎉 **¡Todo listo para deployment en Railway!**

Si tienes problemas, revisa los logs en Railway Dashboard → Deployments → View Logs
