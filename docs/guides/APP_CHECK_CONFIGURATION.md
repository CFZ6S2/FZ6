# Configuración de Firebase App Check con reCAPTCHA Enterprise

## 📋 Resumen

Firebase App Check protege tu aplicación contra bots y abuso mediante reCAPTCHA Enterprise. Esta guía te ayudará a configurarlo correctamente.

## 🚨 Síntomas de Mala Configuración

Si ves estos errores en la consola del navegador:

```
POST https://content-firebaseappcheck.googleapis.com/...exchangeRecaptchaEnterpriseToken 403 (Forbidden)
AppCheck: Requests throttled due to 403 error. Attempts allowed again after 01d:00m:00s (appCheck/throttled)
```

**Causa:** El dominio `tucitasegura.com` no está configurado en reCAPTCHA Enterprise.

---

## ✅ Solución 1: Configurar reCAPTCHA Enterprise (RECOMENDADO)

### Paso 1: Acceder a Google Cloud Console

1. Ve a: https://console.cloud.google.com/security/recaptcha
2. Selecciona el proyecto: **tuscitasseguras-2d1a6**
3. Si no tienes acceso, pide permisos al propietario del proyecto

### Paso 2: Editar la Key de reCAPTCHA Enterprise

1. Busca la key: `6Lc4QBcsAAAAACFZLEgaTz3DuLGiBuXpScrBKt7w`
2. Click en **EDITAR** (icono de lápiz)

### Paso 3: Agregar Dominios Permitidos

En la sección **"Dominios"**, agrega:

```
tucitasegura.com
www.tucitasegura.com
localhost
127.0.0.1
```

**IMPORTANTE:**
- No incluyas `http://` o `https://`
- Solo el dominio puro
- Un dominio por línea

### Paso 4: Configurar Firebase Console

1. Ve a: https://console.firebase.google.com/project/tuscitasseguras-2d1a6/appcheck
2. Selecciona la app web: **1:924208562587:web:5291359426fe390b36213e**
3. En **"Enforcement"**:
   - Para desarrollo: **Unenforced** (no bloqueará peticiones sin token)
   - Para producción: **Enforced** (bloqueará peticiones sin token)

**Recomendación:** Usa **Unenforced** hasta que todo funcione correctamente.

### Paso 5: Verificar Configuración

1. Limpia el cache del navegador (Ctrl+Shift+Delete)
2. Recarga `https://tucitasegura.com/webapp/login.html`
3. Abre la consola (F12)
4. Deberías ver:
   ```
   ✅ App Check inicializado correctamente
   ✅ App Check token obtenido (producción)
   ```

---

## 🔧 Solución 2: Limpiar Estado de Throttling (24h Block)

Si ya configuraste reCAPTCHA pero sigues viendo el error de throttling:

### Opción A: Usar la Herramienta de Limpieza

1. Abre: https://tucitasegura.com/webapp/clear-appcheck-throttle.html
2. Click en **"Limpiar Estado de App Check"**
3. Cierra todas las pestañas de tucitasegura.com
4. Abre una nueva pestaña en modo incógnito
5. Navega a: https://tucitasegura.com/webapp/login.html

### Opción B: Limpieza Manual

1. Abre DevTools (F12) → Application tab
2. **LocalStorage:** Elimina todas las keys que contengan:
   - `firebase`
   - `appCheck`
   - `fac`
   - `heartbeat`

3. **IndexedDB:** Elimina estas bases de datos:
   - `firebaseLocalStorageDb`
   - `firebase-app-check-database`
   - `firebase-heartbeat-database`
   - `firebase-installations-database`

4. **Hard Refresh:** Presiona `Ctrl+Shift+R`

### Opción C: Modo Incógnito

1. Cierra todas las pestañas de tucitasegura.com
2. Abre ventana de incógnito: `Ctrl+Shift+N`
3. Navega a: https://tucitasegura.com
4. El cache estará limpio automáticamente

---

## 🔍 Verificación y Debugging

### 1. Verificar Token de App Check

Abre la consola del navegador (F12) y ejecuta:

```javascript
const result = await window.getAppCheckToken();
console.log('Token:', result);
```

**Resultado esperado:**
```javascript
{
  token: "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
  expireTimeMillis: 1234567890123
}
```

### 2. Verificar Estado de Throttling

```javascript
const isThrottled = window.detectAppCheckThrottled();
console.log('¿Throttled?:', isThrottled);
```

**Resultado esperado:** `false`

### 3. Limpiar Throttling desde Consola

```javascript
await window.clearAppCheckThrottle({ reload: true });
```

Esto limpiará el estado local y recargará la página.

---

## 📝 Notas Importantes

### Firebase Auth Funciona Sin App Check

**IMPORTANTE:** Firebase Authentication y Firestore funcionan perfectamente SIN App Check. App Check es una capa adicional de seguridad, pero no es obligatoria para el funcionamiento básico.

Si App Check falla:
- ✅ Los usuarios pueden iniciar sesión
- ✅ Firestore lee/escribe datos normalmente
- ✅ Cloud Functions funcionan correctamente
- ⚠️ Solo pierdes la protección extra contra bots

### Enforcement Modes

| Modo | Descripción | Recomendación |
|------|-------------|---------------|
| **Unenforced** | App Check se ejecuta pero no bloquea peticiones sin token | Desarrollo y testing |
| **Enforced** | Firebase rechaza peticiones sin App Check token válido | Solo en producción cuando todo esté configurado |

### Debug Token para Desarrollo Local

Para desarrollo en localhost con App Check habilitado:

1. Ve a: https://console.firebase.google.com/project/tuscitasseguras-2d1a6/appcheck/apps
2. Selecciona tu app web
3. Click en **"Add debug token"**
4. Copia el token generado
5. En tu código, antes de cargar `firebase-appcheck.js`:

```html
<script>
  self.FIREBASE_APPCHECK_DEBUG_TOKEN = 'TU_DEBUG_TOKEN_AQUI';
</script>
<script type="module" src="./js/firebase-appcheck.js"></script>
```

O en la consola del navegador:

```javascript
localStorage.setItem('FIREBASE_APPCHECK_DEBUG_TOKEN', 'TU_DEBUG_TOKEN_AQUI');
location.reload();
```

---

## 🚀 Checklist de Configuración Completa

- [ ] reCAPTCHA Enterprise key configurada con dominios correctos
- [ ] Firebase Console App Check enforcement configurado (Unenforced para empezar)
- [ ] Cache del navegador limpiado
- [ ] Estado de throttling eliminado
- [ ] Token de App Check obtenido exitosamente en producción
- [ ] Login funciona sin errores 403
- [ ] (Opcional) Debug token configurado para desarrollo local

---

## 🆘 Soporte

Si sigues teniendo problemas:

1. Verifica los permisos en Google Cloud Console
2. Revisa que el proyecto Firebase sea `tuscitasseguras-2d1a6`
3. Confirma que la key de reCAPTCHA sea `6Lc4QBcsAAAAACFZLEgaTz3DuLGiBuXpScrBKt7w`
4. Verifica en Network tab (F12) que las peticiones a `content-firebaseappcheck.googleapis.com` retornen 200, no 403

---

## 📚 Referencias

- [Firebase App Check Docs](https://firebase.google.com/docs/app-check)
- [reCAPTCHA Enterprise Console](https://console.cloud.google.com/security/recaptcha)
- [Firebase Console - App Check](https://console.firebase.google.com/project/tuscitasseguras-2d1a6/appcheck)
