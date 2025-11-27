# 🔧 Solución Rápida: Error 503 Service Unavailable

**Problema**: El backend en Railway muestra error 503 después del deploy

---

## 🎯 DIAGNÓSTICO RÁPIDO (5 minutos)

### Paso 1: Verifica los LOGS en Railway

```bash
# Opción A: En Railway Dashboard
1. Ir a: https://railway.app/project/[tu-proyecto]
2. Click en tu servicio backend
3. Tab "Deployments" → Último deployment → "View Logs"

# Opción B: Desde CLI
railway logs -f
```

### Busca estos errores comunes:

#### ❌ Error 1: "Address already in use"
```
Error: Address 0.0.0.0:8000 already in use
```
**Causa**: El puerto está hardcodeado en lugar de usar $PORT
**Solución**: Verificar que `start.sh` use la variable $PORT

#### ❌ Error 2: "SECRET_KEY validation error"
```
ValueError: SECRET_KEY must be at least 32 characters long
```
**Causa**: SECRET_KEY no configurada o muy corta
**Solución**: Generar y agregar SECRET_KEY en Railway

#### ❌ Error 3: "Firebase credentials not found"
```
Warning: Credenciales de Firebase no encontradas
```
**Causa**: FIREBASE_SERVICE_ACCOUNT_B64 no configurada
**Solución**: Agregar credenciales de Firebase

#### ❌ Error 4: "ModuleNotFoundError"
```
ModuleNotFoundError: No module named 'xyz'
```
**Causa**: Dependencia faltante en requirements.txt
**Solución**: Agregar la dependencia y redeploy

#### ❌ Error 5: "Health check timeout"
```
Health check timeout after 300 seconds
```
**Causa**: La app tarda mucho en arrancar o crashea
**Solución**: Ver causas abajo

---

## 🚀 SOLUCIONES POR PROBLEMA

### 🔴 PROBLEMA 1: Puerto Incorrecto

El script `start.sh` debe usar la variable `$PORT` que Railway asigna dinámicamente.

**Verificar:**
```bash
cat backend/start.sh
```

**Debe contener:**
```bash
#!/bin/bash
if [ -z "$PORT" ]; then
    PORT=8000
fi

exec uvicorn main:app --host 0.0.0.0 --port "$PORT"
```

**Si está mal, corregir:**
```bash
# Editar start.sh
nano backend/start.sh

# Hacer el archivo ejecutable
chmod +x backend/start.sh

# Commit y push
git add backend/start.sh
git commit -m "fix: Use PORT environment variable"
git push
```

---

### 🔴 PROBLEMA 2: SECRET_KEY Faltante

Railway **necesita** SECRET_KEY de al menos 32 caracteres.

**Generar SECRET_KEY:**
```bash
# Opción 1: OpenSSL
openssl rand -hex 32

# Opción 2: Python
python -c "import secrets; print(secrets.token_urlsafe(32))"
```

**Agregar en Railway:**
```
1. Railway Dashboard → Tu servicio → Variables tab
2. Click "New Variable"
3. Name: SECRET_KEY
4. Value: [pegar el secret generado]
5. Click "Add"
```

Railway redesplegará automáticamente.

---

### 🔴 PROBLEMA 3: Firebase Credentials

Si ves `Firebase Auth: disabled` en logs, necesitas configurar Firebase.

**Opción A: Usar variable de entorno (RECOMENDADO)**

1. **Descargar credenciales de Firebase:**
   - https://console.firebase.google.com/project/tuscitasseguras-2d1a6/settings/serviceaccounts/adminsdk
   - Click "Generate New Private Key"
   - Guarda el archivo JSON

2. **Convertir a Base64:**
   ```bash
   # Linux/Mac:
   cat tuscitasseguras-*.json | base64 -w 0

   # Windows PowerShell:
   [Convert]::ToBase64String([IO.File]::ReadAllBytes("tuscitasseguras-*.json"))
   ```

3. **Agregar en Railway:**
   ```
   Variable: FIREBASE_SERVICE_ACCOUNT_B64
   Value: [pegar todo el texto base64]
   ```

**Opción B: Subir archivo directamente**

Si Railway permite subir archivos:
```bash
railway run --command "mkdir -p /app/backend"
# Copiar firebase-credentials.json a /app/backend/
```

---

### 🔴 PROBLEMA 4: Health Check Timeout

Railway espera que `/health` responda en < 300 segundos.

**Causas comunes:**

1. **App crashea al arrancar**
   - Ver logs para errores
   - Usualmente es SECRET_KEY o Firebase

2. **Cold start muy lento**
   - Primera vez puede tardar 3-5 minutos
   - Es NORMAL, esperar pacientemente

3. **Dependencias pesadas**
   - OpenCV, ML models tardan en cargar
   - Optimizar: lazy loading

**Verificar health check manualmente:**

Después de 5 minutos del deploy:
```bash
curl https://fz6-production.up.railway.app/health
```

Si responde 200 OK → Todo bien, solo fue cold start lento

---

### 🔴 PROBLEMA 5: Missing Environment Variables

**Variables MÍNIMAS necesarias:**

```bash
✅ ENVIRONMENT=production
✅ DEBUG=false
✅ SECRET_KEY=[32+ caracteres]
✅ FIREBASE_PROJECT_ID=tuscitasseguras-2d1a6
✅ CORS_ORIGINS=https://tucitasegura.com,https://www.tucitasegura.com
```

**Verificar en Railway:**
```
Dashboard → Variables tab → Asegúrate que estén todas
```

---

## ⚡ SOLUCIÓN EXPRESS (Si tienes prisa)

### Script automático para configurar todo:

```bash
# 1. Generar SECRET_KEY
SECRET_KEY=$(openssl rand -hex 32)
echo "SECRET_KEY generado: $SECRET_KEY"

# 2. Agregar en Railway (necesitas Railway CLI)
railway variables set SECRET_KEY="$SECRET_KEY"
railway variables set ENVIRONMENT="production"
railway variables set DEBUG="false"
railway variables set FIREBASE_PROJECT_ID="tuscitasseguras-2d1a6"
railway variables set CORS_ORIGINS="https://tucitasegura.com,https://www.tucitasegura.com"

# 3. Redeploy
railway up

# 4. Esperar 3-5 minutos (cold start)
echo "Esperando 3 minutos..."
sleep 180

# 5. Verificar health
curl https://fz6-production.up.railway.app/health
```

---

## 🔍 DEBUGGING AVANZADO

### Ver logs en tiempo real:

```bash
railway logs -f
```

### Ver variables configuradas:

```bash
railway variables
```

### SSH al contenedor (si Railway lo permite):

```bash
railway run bash
# Dentro del contenedor:
cd backend
ls -la
cat .env
python -c "from app.core.config import settings; print(settings.SECRET_KEY)"
```

### Probar localmente primero:

```bash
# Replicar entorno de Railway
cd backend
export ENVIRONMENT=production
export DEBUG=false
export SECRET_KEY=$(openssl rand -hex 32)
export FIREBASE_PROJECT_ID=tuscitasseguras-2d1a6
export PORT=8000

# Arrancar
./start.sh

# En otra terminal, probar
curl http://localhost:8000/health
```

---

## 📊 CHECKLIST COMPLETO

### Antes de Deploy:
- [ ] `SECRET_KEY` generado (32+ caracteres)
- [ ] Firebase credentials descargadas
- [ ] Variables de entorno configuradas en Railway
- [ ] `start.sh` usa variable `$PORT`
- [ ] `requirements.txt` tiene todas las dependencias

### Durante Deploy:
- [ ] Ver logs en Railway Dashboard
- [ ] Esperar 3-5 minutos (cold start)
- [ ] No cancelar el deployment

### Después de Deploy:
- [ ] Verificar `/health` responde 200 OK
- [ ] Verificar `/health/detailed` muestra servicios OK
- [ ] Probar un endpoint de API (ej: `/docs`)
- [ ] Verificar CORS desde frontend

---

## 🆘 SI NADA FUNCIONA

### Opción 1: Redeploy desde cero

```bash
# 1. Borrar servicio en Railway
railway service delete

# 2. Crear nuevo servicio
railway init

# 3. Configurar variables
railway variables set SECRET_KEY="$(openssl rand -hex 32)"
railway variables set ENVIRONMENT="production"
railway variables set DEBUG="false"

# 4. Deploy
railway up
```

### Opción 2: Usar Docker localmente

```bash
cd backend
docker build -t tucitasegura-backend -f Dockerfile.cloudrun .
docker run -p 8000:8000 \
  -e SECRET_KEY=$(openssl rand -hex 32) \
  -e ENVIRONMENT=production \
  tucitasegura-backend

# Probar
curl http://localhost:8000/health
```

### Opción 3: Simplificar temporalmente

Comentar servicios opcionales en `main.py`:

```python
# Comentar temporalmente:
# - Sentry
# - PayPal
# - Redis
# Solo dejar Firebase y health check básico
```

---

## 🎯 TIEMPOS ESPERADOS

| Acción | Tiempo Normal | Tiempo Máximo |
|--------|--------------|---------------|
| Build | 2-4 min | 8 min |
| Cold Start | 1-3 min | 5 min |
| Health Check | 5-10 seg | 30 seg |
| Redeploy | 3-5 min | 10 min |

---

## 📞 CONTACTO CON RAILWAY SUPPORT

Si después de todo sigue sin funcionar:

1. **Railway Discord**: https://discord.gg/railway
2. **Support ticket**: help@railway.app
3. **Docs**: https://docs.railway.app

---

**Última actualización**: 2025-11-27
**Autor**: Claude
**Branch**: claude/complete-deployment-01YCrznu73wKY9zeDCxV8GBM
