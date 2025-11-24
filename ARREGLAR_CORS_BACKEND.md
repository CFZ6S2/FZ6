# 🔧 Cómo Arreglar CORS del Backend en Railway

## ❌ Problema Actual

```
Access to fetch at 'https://t2c06-production.up.railway.app/health'
from origin 'https://tucitasegura.com' has been blocked by CORS policy
```

---

## ✅ Solución

El código del backend **YA TIENE** los orígenes CORS correctos en `backend/main.py` (líneas 179-185):

```python
required = [
    "https://tucitasegura.com",
    "https://www.tucitasegura.com",
    "https://api.tucitasegura.com",
    "https://tuscitasseguras-2d1a6.web.app",
    "https://tuscitasseguras-2d1a6.firebaseapp.com",
]
```

**PERO** el código desplegado en Railway está desactualizado.

---

## 🚀 PASOS PARA ARREGLAR

### OPCIÓN 1: Redeploy Manual desde Railway Dashboard (MÁS RÁPIDO)

1. **Abre Railway Dashboard**:
   - Ve a: https://railway.app
   - Login con tu cuenta

2. **Selecciona tu proyecto**:
   - Click en el proyecto "tuscitasseguras" (o como se llame)

3. **Ve al servicio backend**:
   - Click en el servicio que tiene la URL `t2c06-production.up.railway.app`

4. **Fuerza un redeploy**:
   - Click en el botón "..." (tres puntos)
   - Selecciona "Redeploy"
   - O en la pestaña "Deployments", click en "Deploy" > "Redeploy Latest"

5. **Espera el deploy**:
   - Tardará 2-3 minutos
   - Verás los logs en tiempo real

---

### OPCIÓN 2: Configurar Branch Correcto

Si Railway no está monitoreando el branch correcto:

1. **Ve a Settings del servicio**:
   - Railway Dashboard > Tu proyecto > Backend service > Settings

2. **Verifica "Source"**:
   - Debería estar conectado a tu repositorio GitHub
   - Verifica qué branch está monitoreando

3. **Cambia el branch** (si es necesario):
   - Si dice "main" o "master" pero no tienes ese branch
   - Cámbialo a: `claude/fix-remaining-issues-011L65UsYfEWF5tSfLPML2A6`
   - Railway automáticamente hará redeploy

---

### OPCIÓN 3: Verificar Variable de Entorno

El backend necesita saber que está en producción:

1. **Ve a Variables**:
   - Railway Dashboard > Tu proyecto > Backend service > Variables

2. **Verifica que exista**:
   ```
   RAILWAY_ENVIRONMENT=production
   ```

3. **Si no existe, agrégala**:
   - Click en "New Variable"
   - Variable: `RAILWAY_ENVIRONMENT`
   - Value: `production`
   - Click "Add"

4. **Railway hará redeploy automático**

---

## 🔍 VERIFICAR QUE FUNCIONÓ

Después del redeploy, verifica:

1. **Abre la consola del navegador** (F12) en https://tucitasegura.com

2. **Busca el error de CORS**:
   - ❌ ANTES: `Access to fetch at 'https://t2c06-production.up.railway.app/health' from origin 'https://tucitasegura.com' has been blocked`
   - ✅ AHORA: No debería aparecer este error

3. **Verifica que el backend conecta**:
   - Debería aparecer: `✅ Backend connection successful`
   - Y: `Backend health: {status: 'healthy', service: 'tuscitassegura'}`

---

## 📋 INFORMACIÓN ÚTIL

### Archivos Relevantes

- **CORS Config**: `backend/main.py` líneas 178-188
- **Railway Config**: `railway.json`
- **Requirements**: `backend/requirements.txt`

### URLs

- **Backend URL**: https://t2c06-production.up.railway.app
- **Frontend URL**: https://tucitasegura.com
- **Railway Dashboard**: https://railway.app

### Orígenes Permitidos (después del deploy)

```
✅ https://tucitasegura.com
✅ https://www.tucitasegura.com
✅ https://api.tucitasegura.com
✅ https://tuscitasseguras-2d1a6.web.app
✅ https://tuscitasseguras-2d1a6.firebaseapp.com
```

---

## 🐛 Troubleshooting

### El error persiste después del redeploy

1. **Limpia cache del navegador**:
   - Ctrl + Shift + R
   - O modo incógnito

2. **Verifica logs de Railway**:
   - Railway Dashboard > Backend > Logs
   - Busca: `Production CORS origins:`
   - Debería mostrar la lista completa

3. **Verifica la variable de entorno**:
   - `RAILWAY_ENVIRONMENT=production`
   - Si dice "development", los CORS serán solo localhost

### El deploy falla

1. **Revisa los logs de build**:
   - Railway Dashboard > Backend > Deployments > Latest > Build Logs

2. **Verifica requirements.txt**:
   - Todas las dependencias deben estar especificadas

3. **Verifica el comando de inicio**:
   - Debería ser: `cd backend && uvicorn main:app --host 0.0.0.0 --port $PORT`

---

## ⏱️ Tiempo Estimado

- **Redeploy manual**: 2-3 minutos
- **Cambio de branch**: 3-5 minutos (incluye redeploy)
- **Agregar variable**: 2-3 minutos (incluye redeploy)

---

**Última actualización**: 24 de Noviembre de 2025
**Branch**: claude/fix-remaining-issues-011L65UsYfEWF5tSfLPML2A6
