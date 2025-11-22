# 🔧 Solución: Error 400 App Check en Producción

## 🐛 Error Actual

```
POST https://content-firebaseappcheck.googleapis.com/.../exchangeRecaptchaEnterpriseToken 400 (Bad Request)
AppCheck: Requests throttled due to 400 error
```

**Causa:** El dominio `tucitasegura.com` NO está registrado en reCAPTCHA Enterprise.

---

## ✅ Solución: Añadir Dominio a reCAPTCHA Enterprise

### Paso 1: Acceder a Google Cloud Console

Ve a:
```
https://console.cloud.google.com/security/recaptcha?project=tuscitasseguras-2d1a6
```

O manualmente:
1. https://console.cloud.google.com/
2. Selecciona proyecto: **tuscitasseguras-2d1a6**
3. Menú ☰ → **Security** → **reCAPTCHA Enterprise**

---

### Paso 2: Seleccionar tu Key

Busca la key con Site Key:
```
6LfdTvQrAAAAACkGjvbbFIkqHMsTHwRYYZS_CGq2
```

Click en el nombre de la key para editarla.

---

### Paso 3: Añadir Dominios

En la sección **"Domains"**, deberías ver:
```
✅ localhost
✅ 127.0.0.1
✅ tuscitasseguras-2d1a6.web.app
✅ tuscitasseguras-2d1a6.firebaseapp.com
```

**Añade estos dominios:**
```
tucitasegura.com
www.tucitasegura.com
```

**Cómo añadir:**
1. Click en el campo de dominios
2. Escribe: `tucitasegura.com`
3. Presiona Enter
4. Escribe: `www.tucitasegura.com`
5. Presiona Enter

---

### Paso 4: Guardar Cambios

1. Scroll hasta abajo
2. Click en **"Save"** o **"Guardar"**
3. Espera la confirmación

---

### Paso 5: Verificar en la App

1. Espera **2-3 minutos** (propagación de cambios)
2. Abre: https://tucitasegura.com/webapp/perfil.html
3. **Recarga con Ctrl + Shift + R** (limpiar caché)
4. Verifica la consola (F12)

**Deberías ver:**
```
✅ App Check inicializado correctamente
📍 Modo: PRODUCCIÓN (reCAPTCHA Enterprise)
```

**Ya NO deberías ver:**
```
❌ 400 Bad Request
❌ Requests throttled
```

---

## 🔄 Alternativa: Desactivar App Check Temporalmente

**Si NO tienes acceso a Google Cloud Console:**

### Opción A: Pedir Acceso

Contacta al owner del proyecto para que te dé acceso a:
- Google Cloud Console → reCAPTCHA Enterprise

### Opción B: Desactivar Enforcement (Recomendado)

Ve a Firebase Console:
```
https://console.firebase.google.com/project/tuscitasseguras-2d1a6/appcheck
```

En la pestaña **"APIs"**, configura TODO en **"Unenforced"**:
- Firebase Authentication → ⋮ → **Unenforced**
- Cloud Firestore → ⋮ → **Unenforced**
- Cloud Storage → ⋮ → **Unenforced**

Esto permite que la app funcione **sin** App Check.

---

## 📊 Comparación de Soluciones

| Solución | Pros | Contras | Seguridad |
|----------|------|---------|-----------|
| **Añadir dominio a reCAPTCHA** | ✅ App Check funciona<br>✅ Máxima seguridad<br>✅ Solución definitiva | ⚠️ Requiere acceso Google Cloud | 🔒🔒🔒 Alta |
| **Desactivar Enforcement** | ✅ Fácil<br>✅ No requiere Google Cloud<br>✅ App funciona inmediatamente | ⚠️ Menor seguridad<br>⚠️ No usa App Check | 🔒 Media |
| **Comentar imports App Check** | ✅ Muy fácil<br>✅ No requiere consola | ❌ Hay que modificar código<br>❌ Requiere re-deploy | 🔒 Baja |

---

## 🎯 Recomendación

**Para Producción:**
1. **Primera opción:** Añadir dominio a reCAPTCHA Enterprise ✅
2. **Segunda opción:** Desactivar Enforcement en Firebase Console
3. **Tercera opción:** Comentar imports (solo desarrollo)

---

## ✅ Verificación Final

Después de aplicar la solución, verifica:

### 1. Abrir la app
```
https://tucitasegura.com/webapp/perfil.html
```

### 2. Ver la consola (F12)
```javascript
// Deberías ver:
✅ App Check inicializado correctamente
📍 Modo: PRODUCCIÓN (reCAPTCHA Enterprise)
🔑 Provider: reCAPTCHA Enterprise

// NO deberías ver:
❌ 400 Bad Request
❌ AppCheck: Requests throttled
```

### 3. Probar funcionalidades
- ✅ Login/Registro funciona
- ✅ No hay errores 401
- ✅ Firestore funciona
- ✅ Notificaciones funcionan

---

## 📝 Checklist de Configuración Completa

Después de la configuración, verifica que tienes:

### reCAPTCHA Enterprise
- [x] Site key creada
- [x] Tipo: reCAPTCHA Enterprise (no v3)
- [x] Dominios incluyen:
  - [x] localhost
  - [x] 127.0.0.1
  - [x] tuscitasseguras-2d1a6.web.app
  - [x] tuscitasseguras-2d1a6.firebaseapp.com
  - [x] tucitasegura.com ← **IMPORTANTE**
  - [x] www.tucitasegura.com ← **IMPORTANTE**

### Firebase App Check
- [x] Configurado en Firebase Console
- [x] Web app registrada
- [x] reCAPTCHA Enterprise provider configurado
- [x] Enforcement en "Unenforced" (desarrollo) o "Enforced" (producción)

### Firebase SDK
- [x] firebase-appcheck.js configurado
- [x] RECAPTCHA_ENTERPRISE_SITE_KEY correcto
- [x] ReCaptchaEnterpriseProvider usado (no v3)

---

## 🆘 Si Sigue Sin Funcionar

### Verifica en Network tab (F12 → Network)

Busca request a:
```
https://content-firebaseappcheck.googleapis.com/.../exchangeRecaptchaEnterpriseToken
```

**Si ves 400:**
- El dominio NO está en reCAPTCHA
- La site key es incorrecta
- El proyecto es incorrecto

**Si ves 401:**
- Enforcement está activo
- Necesitas desactivarlo en Firebase Console

**Si NO ves el request:**
- App Check no se está inicializando
- Verifica que el import no esté comentado

---

## 💬 URLs Útiles

- **reCAPTCHA Console:** https://console.cloud.google.com/security/recaptcha?project=tuscitasseguras-2d1a6
- **App Check Console:** https://console.firebase.google.com/project/tuscitasseguras-2d1a6/appcheck
- **Firebase Project:** https://console.firebase.google.com/project/tuscitasseguras-2d1a6

---

**Última actualización:** 2025-11-14  
**Prioridad:** 🔴 ALTA - Requerido para producción
