# 🔧 Configuración de Backend API URL

## 📍 Ubicaciones de la URL del Backend

La URL del backend API se configura en **3 lugares diferentes** dependiendo del entorno:

---

## 1️⃣ Desarrollo Local

### Frontend `.env` (Vite)
**Archivo**: `webapp/.env`

```env
# URL del backend en desarrollo local
VITE_API_BASE_URL=http://localhost:8000
```

**Nota**: Esta variable NO se usa actualmente en el código (ver problema más abajo).

### API Service
**Archivo**: `webapp/js/api-service.js` (Línea 14)

```javascript
// En localhost, usa automáticamente:
this.baseURL = 'http://localhost:8001'
```

⚠️ **Inconsistencia detectada**:
- `.env.example` dice `http://localhost:8000`
- `api-service.js` usa `http://localhost:8001`

**Recomendación**: Cambiar a usar puerto 8000 en ambos lados.

---

## 2️⃣ Producción con Proxy (Vercel → Railway)

### Vercel Config - Proxy de API
**Archivo**: `vercel.json` (Línea 20-24)

```json
"rewrites": [
  {
    "source": "/api/:path*",
    "destination": "https://TU-BACKEND.railway.app/api/:path*"
  }
]
```

**Cómo funciona**:
1. Frontend en Vercel hace petición a: `https://tucitasegura.vercel.app/api/health`
2. Vercel proxy redirige a: `https://TU-BACKEND.railway.app/api/health`
3. El frontend NO necesita conocer la URL de Railway
4. **Ventajas**:
   - No hay CORS (same-origin)
   - Oculta la URL real del backend
   - Más seguro

### Configurar la URL de Railway

**Opción A: Variable de entorno en Vercel**

```bash
# En Vercel Dashboard > Settings > Environment Variables
BACKEND_URL=https://tu-proyecto.railway.app
```

Luego actualizar `vercel.json`:
```json
"destination": "${BACKEND_URL}/api/:path*"
```

**Opción B: Hardcodear (más simple)**

Reemplazar directamente en `vercel.json`:
```json
"destination": "https://tucitasegura-production.up.railway.app/api/:path*"
```

---

## 3️⃣ Producción sin Proxy (CORS directo)

### Frontend `.env.production`
**Archivo**: `webapp/.env.production`

```env
# URL directa del backend en Railway
VITE_API_BASE_URL=https://tucitasegura-backend.railway.app
```

### Inyectar en index.html

**Archivo**: `webapp/index.html` (Antes de cargar scripts)

```html
<script>
  // Inyectar variable de entorno de Vite
  window.API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';
</script>
```

**Problema**: `import.meta.env` NO funciona en HTML, solo en módulos JS.

**Solución correcta** - Build time replacement:

```javascript
// En build script (package.json)
"build": "vite build --mode production"

// Vite automáticamente reemplaza import.meta.env.VITE_* en el build
```

---

## 🔧 Configuración Actual (api-service.js)

```javascript
constructor() {
  const isLocal = hostname === 'localhost' || hostname === '127.0.0.1';

  // 1. Busca override manual
  const override = window.API_BASE_URL || '';

  // 2. Si es local, usa localhost:8001
  // 3. Si NO es local Y NO hay override, usa same-origin (proxy)
  this.baseURL = override
    ? override
    : (isLocal ? 'http://localhost:8001' : '');

  this.useSameOrigin = !isLocal && !override;
}
```

**Flujo de decisión**:
- ✅ Local → `http://localhost:8001`
- ✅ Producción CON proxy → Same-origin (usa proxy de Vercel)
- ⚠️ Producción SIN proxy → Same-origin (FALLA porque Vercel solo sirve estáticos)

---

## ✅ SOLUCIÓN RECOMENDADA

### Setup Completo

**1. Vercel (Frontend)**

`vercel.json`:
```json
{
  "rewrites": [
    {
      "source": "/api/:path*",
      "destination": "https://TU-BACKEND.railway.app/api/:path*"
    }
  ]
}
```

**2. Railway (Backend)**

Asegurar que CORS permite el dominio de Vercel:

`backend/.env`:
```env
CORS_ORIGINS=https://tucitasegura.vercel.app,https://www.tucitasegura.com
```

`backend/main.py`:
```python
origins = os.getenv("CORS_ORIGINS", "").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

**3. Local Development**

Cambiar puerto en `api-service.js`:
```javascript
// Línea 14
this.baseURL = override ? override : (isLocal ? 'http://localhost:8000' : '');
```

Y en backend:
```bash
cd backend
uvicorn main:app --reload --port 8000
```

---

## 🧪 Cómo Probar

### Test Local
```bash
# Terminal 1: Backend
cd backend
uvicorn main:app --reload --port 8000

# Terminal 2: Frontend
cd webapp
python -m http.server 8080

# Navegador: http://localhost:8080
# Debería conectar a http://localhost:8000/api/*
```

### Test Producción
```bash
# En consola del navegador (https://tucitasegura.vercel.app)
fetch('/api/health')
  .then(r => r.json())
  .then(console.log)

# Debería retornar:
{
  "status": "healthy",
  "service": "tucitasegura-api"
}
```

---

## 📊 Resumen de URLs

| Entorno | Frontend | Backend | Método |
|---------|----------|---------|--------|
| **Local** | localhost:8080 | localhost:8000 | Direct |
| **Staging** | staging.vercel.app | staging.railway.app | Proxy |
| **Production** | tucitasegura.com | backend.railway.app | Proxy |

---

## ⚠️ PROBLEMAS ACTUALES

1. ❌ **Puerto inconsistente**: `.env` dice 8000, código usa 8001
2. ❌ **Variable no inyectada**: `VITE_API_BASE_URL` no se usa en `window.API_BASE_URL`
3. ❌ **Sin proxy**: Vercel config NO tenía rewrite para `/api/**` (ahora agregado)
4. ⚠️ **Fallback incorrecto**: `this.fallbackBaseURL = 'https://tuscitasseguras-2d1a6.web.app'` apunta a Firebase Hosting, no Railway

---

## 🔧 PRÓXIMOS PASOS

1. **Obtener URL de Railway**:
   ```bash
   # En Railway dashboard, copiar la URL pública
   # Ejemplo: https://tucitasegura-production.up.railway.app
   ```

2. **Actualizar `vercel.json`**:
   ```json
   "destination": "https://TU-URL-RAILWAY.railway.app/api/:path*"
   ```

3. **Deployar a Vercel**:
   ```bash
   git add vercel.json
   git commit -m "feat: add API proxy to Railway backend"
   git push
   vercel --prod
   ```

4. **Verificar**:
   ```bash
   curl https://tucitasegura.vercel.app/api/health
   ```

---

## 📞 Railway Backend URL

**Necesitas proporcionar**:
- URL pública de Railway (ej: `https://tu-proyecto.railway.app`)
- O configurarla como variable de entorno en Vercel

**Actualizar en**: `vercel.json` línea 23

---

**Última actualización**: 28 de Noviembre de 2025
