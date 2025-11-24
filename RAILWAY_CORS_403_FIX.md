# 🚨 Railway CORS 403 Error - Solución

## ❌ Problema

Railway está bloqueando las requests CORS con **403 Forbidden** a nivel de proxy (Envoy), antes de que lleguen al backend.

```
curl -H "Origin: https://tucitasegura.com" https://t2c06-production.up.railway.app/health
→ HTTP/2 403 Forbidden
→ NO hay headers Access-Control-Allow-Origin
```

Pero en los logs internos se ve:
```
INFO: "GET /health HTTP/1.1" 200 OK
```

Esto significa que el **proxy de Railway** está bloqueando, no el backend.

---

## ✅ SOLUCIÓN 1: Verificar Dominio Personalizado (RECOMENDADO)

Railway puede estar bloqueando porque el servicio solo está configurado para el dominio de Railway, no para dominios externos.

### Pasos:

1. **Ve a Railway Dashboard**:
   - https://railway.app
   - Tu proyecto > Backend service

2. **Ve a Settings > Networking**

3. **Verifica "Public Networking"**:
   - Debe estar **ENABLED**
   - Debe mostrar la URL: `t2c06-production.up.railway.app`

4. **Agrega Dominio Personalizado** (si tienes):
   - Click en "Add Domain"
   - Agrega: `api.tucitasegura.com`
   - Configura los DNS records

5. **Verifica "CORS Configuration"** (si existe):
   - Algunas veces Railway tiene configuración de CORS a nivel de proyecto
   - Busca en Settings > Environment o Settings > Security

---

## ✅ SOLUCIÓN 2: Usar Dominio de Railway Directamente

Si el problema es específico con dominios externos, usa el dominio de Railway directamente en el frontend:

### En el frontend (api-service.js):

Cambia la URL base de:
```javascript
const API_BASE_URL = 'https://t2c06-production.up.railway.app';
```

A:
```javascript
const API_BASE_URL = window.location.hostname === 'tucitasegura.com' 
  ? 'https://t2c06-production.up.railway.app'
  : 'https://t2c06-production.up.railway.app';
```

(Ya está así, así que este no es el problema)

---

## ✅ SOLUCIÓN 3: Configurar Railway.toml

Railway puede necesitar configuración explícita para CORS.

Crea o actualiza `railway.toml` en la raíz del proyecto:

```toml
[build]
builder = "NIXPACKS"

[deploy]
startCommand = "cd backend && uvicorn main:app --host 0.0.0.0 --port $PORT --proxy-headers --forwarded-allow-ips='*'"
healthcheckPath = "/health"
healthcheckTimeout = 100
restartPolicyType = "ON_FAILURE"

[experimental]
cors = true
```

Luego haz push y Railway redeplegará automáticamente.

---

## ✅ SOLUCIÓN 4: Verificar WAF/Firewall

Railway puede tener un WAF (Web Application Firewall) bloqueando:

1. **Ve a Settings > Security** (si existe)
2. Busca opciones de **WAF** o **DDoS Protection**
3. Verifica que **CORS** esté **permitido**
4. Agrega **tucitasegura.com** a la whitelist si es necesario

---

## ✅ SOLUCIÓN 5: Contact Railway Support

Si nada funciona, el problema puede ser específico de tu proyecto en Railway:

1. **Ve a Railway Dashboard**
2. Click en "Help" o "Support" (abajo izquierda)
3. Abre un ticket explicando:

```
Subject: CORS 403 Forbidden from Envoy proxy

I'm getting 403 Forbidden responses for CORS requests to my backend:
- Service: t2c06-production.up.railway.app
- Origin: https://tucitasegura.com
- Method: GET /health
- Error: No Access-Control-Allow-Origin header

The backend logs show 200 OK, but the Envoy proxy returns 403.
My FastAPI app has CORSMiddleware configured correctly.

Can you help configure CORS at the Railway level?
```

---

## 🧪 PRUEBA TEMPORAL: Usar Firebase Functions

Mientras arreglas Railway, puedes usar Firebase Functions como proxy:

En `functions/index.js`:

```javascript
const functions = require('firebase-functions');
const cors = require('cors')({origin: true});

exports.railwayProxy = functions.https.onRequest((req, res) => {
  cors(req, res, async () => {
    const url = `https://t2c06-production.up.railway.app${req.path}`;
    const response = await fetch(url, {
      method: req.method,
      headers: req.headers,
      body: req.body
    });
    const data = await response.json();
    res.json(data);
  });
});
```

Luego en el frontend usar:
```javascript
const API_BASE_URL = 'https://us-central1-tuscitasseguras-2d1a6.cloudfunctions.net/railwayProxy';
```

---

## 📊 VERIFICAR QUE FUNCIONA

Después de aplicar cualquier solución, prueba con:

```bash
curl -H "Origin: https://tucitasegura.com" https://t2c06-production.up.railway.app/health -v
```

Deberías ver:
```
< HTTP/2 200 OK
< access-control-allow-origin: https://tucitasegura.com
< access-control-allow-credentials: true
```

---

## 🎯 RECOMENDACIÓN

El problema es **a nivel de Railway**, no del código del backend.

**La solución más probable** es:
1. Verificar Public Networking (Solución 1)
2. Configurar railway.toml con --proxy-headers (Solución 3)
3. Contactar Railway Support (Solución 5)

El backend está funcionando correctamente, Railway solo necesita configuración adicional para CORS.
