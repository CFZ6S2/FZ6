# 🚀 Deployment a Producción - TuCitaSegura

## ⚡ Deployment Rápido (Recomendado)

### En Windows (PowerShell):

```powershell
# Desde el directorio del proyecto
.\deploy-production.ps1
```

### En Linux/Mac (Bash):

```bash
# Desde el directorio del proyecto
./deploy-production.sh
```

**El script automáticamente:**
- ✅ Verifica que estés en la rama correcta
- ✅ Hace pull de los últimos cambios
- ✅ Verifica que los archivos clave tengan el contenido correcto
- ✅ Instala dependencias si es necesario
- ✅ Despliega Hosting y Cloud Functions
- ✅ Verifica que el deployment fue exitoso

---

## 📋 Deployment Manual

Si prefieres hacerlo paso a paso:

### 1. Asegúrate de tener los últimos cambios

```bash
git checkout claude/final-security-fixes-01BjGpKGPPPQ99KhLtREzxiA
git pull origin claude/final-security-fixes-01BjGpKGPPPQ99KhLtREzxiA
```

### 2. Instala dependencias de Cloud Functions

```bash
cd functions
npm install
cd ..
```

### 3. Despliega a Firebase

**Opción A: Desplegar todo (Hosting + Functions)**

```bash
firebase deploy --only hosting,functions
```

**Opción B: Desplegar solo Hosting**

```bash
firebase deploy --only hosting
```

**Opción C: Desplegar solo Functions**

```bash
firebase deploy --only functions
```

**Opción D: Desplegar funciones específicas**

```bash
# Solo las funciones de reCAPTCHA
firebase deploy --only functions:verifyRecaptcha,functions:verifyRecaptchaCallable

# Solo las funciones de notificaciones
firebase deploy --only functions:onMatchCreated,functions:onMessageCreated
```

### 4. Verifica el deployment

```bash
# Verificar que la clave de reCAPTCHA es correcta
curl https://tucitasegura.com/webapp/js/firebase-appcheck.js | grep "6Lc4QBcsAAAAACFZLEgaTz3DuLGiBuXpScrBKt7w"

# O en PowerShell:
Invoke-WebRequest -Uri "https://tucitasegura.com/webapp/js/firebase-appcheck.js" | Select-String "6Lc4QBcsAAAAACFZLEgaTz3DuLGiBuXpScrBKt7w"
```

---

## 🧹 Limpiar Cache del Navegador

**IMPORTANTE:** Después de cada deployment, debes limpiar el cache del navegador para ver los cambios.

### Opción 1: Hard Refresh (Rápido)

- **Windows/Linux:** `Ctrl + Shift + R` o `Ctrl + F5`
- **Mac:** `Cmd + Shift + R`

### Opción 2: Modo Incógnito (Más Fácil)

- **Windows/Linux:** `Ctrl + Shift + N`
- **Mac:** `Cmd + Shift + N`

### Opción 3: Limpiar Cache Completo

1. Presiona `Ctrl + Shift + Delete` (`Cmd + Shift + Delete` en Mac)
2. Selecciona:
   - ✅ Cookies y datos de sitios
   - ✅ Imágenes y archivos en caché
3. Periodo: **Desde siempre**
4. Click en "Borrar datos"
5. Cierra el navegador completamente
6. Abre de nuevo

---

## 🔍 Verificar que Funcionó

### 1. Verificar App Check

1. Abre: https://tucitasegura.com/webapp/login.html
2. Abre la consola (F12)
3. Busca en los logs:

**✅ Deberías ver:**
```
✅ App Check inicializado correctamente
📍 Modo: PRODUCCIÓN (tucitasegura.com)
```

**❌ NO deberías ver:**
```
404 (Not Found) firebase-appcheck-disabled.js
The requested module does not provide an export named 'auth'
AppCheck: Requests throttled
```

### 2. Verificar Cloud Functions

```bash
# Verificar que las funciones están desplegadas
firebase functions:list

# Deberías ver:
# - verifyRecaptcha (https)
# - verifyRecaptchaCallable (https callable)
# - onMatchCreated (firestore trigger)
# - etc...
```

### 3. Probar reCAPTCHA

Abre: https://tucitasegura.com/webapp/example-recaptcha-login.html

Deberías ver:
- ✅ Protección anti-bot activada
- ✅ Al hacer login, se verifica con el backend
- ✅ Score entre 0.0 y 1.0 en los logs

---

## ⚠️ Troubleshooting

### Error: "firebase: command not found"

Instala Firebase CLI:

```bash
npm install -g firebase-tools
firebase login
```

### Error: "403 Forbidden" al hacer git push

Estás intentando hacer push a `main` directamente. Usa la rama correcta:

```bash
git push origin claude/final-security-fixes-01BjGpKGPPPQ99KhLtREzxiA
```

### Error: "AppCheck throttled"

El navegador tiene cacheado el estado de throttling. Limpia TODO el cache:

1. `Ctrl+Shift+Delete`
2. Marca TODO
3. Periodo: Desde siempre
4. Borrar
5. Cierra el navegador
6. Abre en modo incógnito

### Los cambios no se ven en producción

1. Verifica que el deployment fue exitoso (sin errores)
2. Espera 1-2 minutos (cache de CDN)
3. Limpia cache del navegador
4. Prueba en modo incógnito
5. Verifica con curl/Invoke-WebRequest

---

## 📊 URLs Importantes Post-Deployment

### Frontend
- 🏠 **Home:** https://tucitasegura.com
- 🔐 **Login:** https://tucitasegura.com/webapp/login.html
- 📝 **Register:** https://tucitasegura.com/webapp/register.html
- 🧪 **reCAPTCHA Example:** https://tucitasegura.com/webapp/example-recaptcha-login.html

### Cloud Functions
- ✅ **Verify reCAPTCHA:** https://us-central1-tuscitasseguras-2d1a6.cloudfunctions.net/verifyRecaptcha
- 🏥 **Health Check:** https://us-central1-tuscitasseguras-2d1a6.cloudfunctions.net/health

### Firebase Console
- 🔥 **Project:** https://console.firebase.google.com/project/tuscitasseguras-2d1a6
- 🌐 **Hosting:** https://console.firebase.google.com/project/tuscitasseguras-2d1a6/hosting
- ⚡ **Functions:** https://console.firebase.google.com/project/tuscitasseguras-2d1a6/functions
- 🔒 **App Check:** https://console.firebase.google.com/project/tuscitasseguras-2d1a6/appcheck

### Google Cloud
- 🔐 **reCAPTCHA:** https://console.cloud.google.com/security/recaptcha?project=tuscitasseguras-2d1a6
- 📊 **IAM:** https://console.cloud.google.com/iam-admin/iam?project=tuscitasseguras-2d1a6
- 📝 **Logs:** https://console.cloud.google.com/logs/query?project=tuscitasseguras-2d1a6

---

## 🎯 Checklist Post-Deployment

- [ ] Deployment completado sin errores
- [ ] Cache del navegador limpiado
- [ ] Login.html carga sin errores 404
- [ ] No hay errores de "export named 'auth'"
- [ ] App Check se inicializa correctamente
- [ ] Cloud Functions responden (probar /health)
- [ ] reCAPTCHA funciona en example-recaptcha-login.html
- [ ] No hay errores de throttling en la consola

---

## 🆘 Soporte

Si tienes problemas después del deployment:

1. **Revisa los logs de Firebase Functions:**
   ```bash
   firebase functions:log
   ```

2. **Revisa la consola del navegador (F12)**

3. **Verifica la configuración de reCAPTCHA Enterprise:**
   - Key: `6Lc4QBcsAAAAACFZLEgaTz3DuLGiBuXpScrBKt7w`
   - Dominio `tucitasegura.com` configurado

4. **Consulta las guías:**
   - `docs/guides/APP_CHECK_CONFIGURATION.md`
   - `docs/guides/RECAPTCHA_BACKEND_SETUP.md`
