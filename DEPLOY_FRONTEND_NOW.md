# 🚀 Redesplegar Frontend - Pasos Finales

**Situación Actual:**
- ✅ Código actualizado con nueva URL del backend (`fz6-production.up.railway.app`)
- ✅ Backend funcionando correctamente con CORS
- ❌ Frontend en tucitasegura.com **todavía usa URL antigua** (necesita redeploy)

---

## 📋 Qué Pasó

El error que ves:
```
Access to fetch at 'https://t2c06-production.up.railway.app/health'
CORS policy: No 'Access-Control-Allow-Origin' header
```

Es porque **tucitasegura.com todavía sirve código antiguo** que intenta conectarse a `t2c06-production.up.railway.app` (que ya no existe).

El código YA está actualizado en GitHub (commit `d8e591d`), pero **no se ha redesplegado el sitio web**.

---

## ✅ Solución Rápida (3 Opciones)

### Opción 1: Deploy desde tu Máquina (MÁS RÁPIDO)

Si tienes Firebase CLI en tu máquina local:

```bash
# 1. Pull los últimos cambios
git pull origin claude/review-railway-config-01HWTLDugrAfar4R7yBxxbEn

# 2. Deploy a Firebase Hosting
firebase deploy --only hosting

# 3. Espera 30 segundos

# 4. Abre tucitasegura.com y presiona Ctrl+Shift+R
```

### Opción 2: Usar el Script Automático (FÁCIL)

Desde el servidor o tu máquina:

```bash
# Ejecuta el script que creé:
./deploy-frontend.sh

# El script:
# - Verifica Firebase CLI
# - Te hace login si es necesario
# - Despliega el frontend
# - Te da instrucciones de verificación
```

### Opción 3: GitHub Actions (AUTO-DEPLOY)

Si tienes GitHub Actions configurado:

```bash
# Merge esta rama a main
git checkout main
git merge claude/review-railway-config-01HWTLDugrAfar4R7yBxxbEn
git push origin main

# GitHub Actions desplegará automáticamente
```

---

## 🧪 Verificar ANTES del Deploy

Antes de redesplegar, **verifica que el backend SÍ funciona** con la URL nueva:

### Test en Navegador:

1. **Abre este archivo en tu navegador:**
   ```
   file:///home/user/FZ6/test-new-url.html
   ```
   O súbelo a cualquier servidor y ábrelo.

2. **El test automático se ejecutará** y deberías ver:
   ```
   ✅ Health Check - SUCCESS
   ✅ Security Info - SUCCESS
   ✅ API v1 Info - SUCCESS
   ✅ CSRF Token - SUCCESS
   🎉 ¡PERFECTO! 4/4 tests pasados
   ```

### Test en Consola:

O en la consola del navegador (F12) en **cualquier sitio**:

```javascript
// Test directo al backend
fetch('https://fz6-production.up.railway.app/health')
  .then(r => r.json())
  .then(d => console.log('✅ Backend funciona:', d))
  .catch(e => console.error('❌ Error:', e));

// Deberías ver:
// ✅ Backend funciona: {status: "healthy", version: "unknown", ...}
```

---

## 📦 Deploy Paso a Paso

### Si no tienes Firebase CLI instalado:

```bash
# 1. Instalar Firebase CLI
npm install -g firebase-tools

# 2. Login a Firebase
firebase login

# 3. Deploy
firebase deploy --only hosting
```

### Output esperado:

```
=== Deploying to 'tuscitasseguras-2d1a6'...

i  deploying hosting
i  hosting[tuscitasseguras-2d1a6]: beginning deploy...
✔  hosting[tuscitasseguras-2d1a6]: file upload complete
i  hosting[tuscitasseguras-2d1a6]: finalizing version...
✔  hosting[tuscitasseguras-2d1a6]: version finalized
i  hosting[tuscitasseguras-2d1a6]: releasing new version...
✔  hosting[tuscitasseguras-2d1a6]: release complete

✔  Deploy complete!

Project Console: https://console.firebase.google.com/project/tuscitasseguras-2d1a6/overview
Hosting URL: https://tucitasegura.com
```

---

## ✅ Verificar DESPUÉS del Deploy

### 1. Espera 30-60 segundos

El CDN de Firebase puede tardar un poco en actualizar.

### 2. Hard Refresh

Abre **https://tucitasegura.com** y presiona:
- Chrome/Edge: `Ctrl + Shift + R`
- Firefox: `Ctrl + F5`
- Safari: `Cmd + Shift + R`

### 3. Verifica en Consola (F12)

```javascript
// Verifica que esté usando la URL nueva
console.log('API URL:', window.API_BASE_URL);
// Debe mostrar: https://fz6-production.up.railway.app

// Test de conexión
fetch(window.API_BASE_URL + '/health')
  .then(r => r.json())
  .then(d => console.log('✅ Conectado:', d))
  .catch(e => console.error('❌ Error:', e));
```

### 4. Resultado Esperado

```
API URL: https://fz6-production.up.railway.app
✅ Conectado: {status: "healthy", version: "unknown", ...}
```

**Sin errores de CORS** ❌ ~~`Access-Control-Allow-Origin`~~

---

## 🐛 Troubleshooting

### Sigue viendo la URL antigua después del deploy

1. **Limpia caché del navegador:**
   - Chrome: Settings → Privacy → Clear browsing data → Cached images and files
   - O abre en ventana privada/incógnito

2. **Verifica el deploy:**
   ```bash
   firebase hosting:channel:list
   ```

3. **Verifica el código desplegado:**
   - View Page Source en tucitasegura.com
   - Busca `API_BASE_URL`
   - Debe ser `fz6-production.up.railway.app`

### Firebase login falla

```bash
# Login con puerto diferente
firebase login --no-localhost

# O genera token CI
firebase login:ci
```

### Deploy falla con permisos

```bash
# Verifica que estés en el proyecto correcto
firebase projects:list

# Cambia al proyecto correcto
firebase use tuscitasseguras-2d1a6
```

---

## 📝 Resumen

**Archivos modificados (ya pusheados):**
- `index.html` - API_BASE_URL actualizado
- `functions/index.js` - Proxy URL actualizado
- `firebase.json` - CSP actualizado

**Commits:**
- `d8e591d` - fix: Update backend URL from t2c06 to fz6-production
- `b7dd72a` - chore: Add frontend deployment script and test page

**Siguiente acción:**
```bash
firebase deploy --only hosting
```

**Tiempo estimado:** 2 minutos

---

## 🎯 Quick Commands

```bash
# Opción más rápida - un comando:
firebase deploy --only hosting && echo "✅ Deploy completo! Espera 30 segundos y presiona Ctrl+Shift+R en tucitasegura.com"

# O usa el script automático:
./deploy-frontend.sh
```

---

**¿Listo?** Ejecuta `firebase deploy --only hosting` y en 2 minutos estará funcionando 🚀
