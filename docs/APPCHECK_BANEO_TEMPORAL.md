# App Check - Baneo Temporal (22 horas)

## 🚨 Situación Actual

**Problema:** Baneado de App Check por 22 horas debido a múltiples intentos de login fallidos

**Solución Temporal:** App Check completamente desactivado en localhost

**Estado:** ✅ Puedes trabajar normalmente en localhost sin restricciones

---

## ✅ Cambios Realizados

### 1. App Check Desactivado en Localhost

**Archivo modificado:** `webapp/js/firebase-appcheck.js`

**Cambios:**
- App Check NO se inicializa en localhost/127.0.0.1
- Variable `appCheck` queda en `null` en desarrollo
- No se intenta obtener tokens
- No hay verificación automática

**Logs que verás en consola:**
```javascript
⚠️  App Check COMPLETAMENTE DESACTIVADO en modo desarrollo
💡 La app funcionará sin App Check en localhost
✅ Todas las operaciones funcionarán sin restricciones
🔧 Esto evita el baneo temporal de App Check
```

---

## 🔧 Verificar Firebase Console (CRÍTICO)

Para que funcione sin App Check, **DEBES** tener enforcement desactivado:

### Paso 1: Ir a Firebase Console
```
https://console.firebase.google.com/project/tuscitasseguras-2d1a6/appcheck
```

### Paso 2: Verificar Enforcement

**TODOS deben estar en "Unenforced":**

| Servicio | Estado Requerido | Acción si está "Enforced" |
|----------|------------------|---------------------------|
| Authentication | **Unenforced** | Click en servicio → Click "Unenforce" |
| Cloud Firestore | **Unenforced** | Click en servicio → Click "Unenforce" |
| Cloud Storage | **Unenforced** | Click en servicio → Click "Unenforce" |

### ⚠️ Si NO Desactivas Enforcement

**Verás estos errores:**
```
403 Forbidden - Firebase App Check token is missing
auth/firebase-app-check-token-is-invalid
Could not reach Cloud Firestore backend
```

**La app NO funcionará** porque Firebase rechazará todas las requests sin App Check token.

---

## ✅ Probar que Funciona

### 1. Limpiar Cache
```bash
# En DevTools Console (F12)
localStorage.clear();
sessionStorage.clear();
```

### 2. Recargar App
```
Ctrl + Shift + R (hard reload)
```

### 3. Verificar Console
**Deberías ver:**
```javascript
⚠️  App Check COMPLETAMENTE DESACTIVADO en modo desarrollo
💡 La app funcionará sin App Check en localhost
✅ Firebase inicializado correctamente
```

**NO deberías ver:**
```javascript
❌ POST exchangeDebugToken 403 (Forbidden)
❌ POST exchangeToken 400 (Bad Request)
❌ AppCheck: Requests throttled
```

### 4. Probar Funcionalidades

**Login/Registro:**
- [ ] Crear cuenta nueva
- [ ] Login con email/password
- [ ] Verificar que no hay errores 403

**Firestore:**
- [ ] Leer documentos
- [ ] Escribir documentos
- [ ] Verificar que Firestore NO está en modo offline

**Storage:**
- [ ] Subir foto de perfil
- [ ] Ver fotos de otros usuarios

---

## 🔄 Reactivar App Check (Después de 22 horas)

### Cuándo: Después del 2025-11-16 a las [HORA_BANEO + 22h]

### Paso 1: Obtener Nuevo Debug Token

#### Opción A: Generar Automáticamente
```javascript
// En DevTools Console
self.FIREBASE_APPCHECK_DEBUG_TOKEN = true;
location.reload();

// Copia el token que aparezca en consola:
// App Check debug token: [TOKEN_AQUÍ]
```

#### Opción B: Usar Debug Token Existente
Si ya lo tienes registrado: `cb4a5b8b-3dbf-40af-b973-0115297ecb84`

### Paso 2: Registrar Debug Token en Firebase Console

```
1. https://console.firebase.google.com/project/tuscitasseguras-2d1a6/appcheck
2. Apps tab → Tu web app
3. "Manage debug tokens"
4. "+ Add debug token"
5. Pegar token
6. Display name: "Localhost Development"
7. Save
```

### Paso 3: Reactivar App Check en Código

**Editar:** `webapp/js/firebase-appcheck.js`

**Línea 66-72:**
```javascript
// ANTES (desactivado):
} else if (isDevelopment) {
  console.log('⚠️  App Check COMPLETAMENTE DESACTIVADO en modo desarrollo');
  // NO inicializar App Check en desarrollo
  appCheck = null;
} else {

// DESPUÉS (reactivado):
} else if (isDevelopment) {
  console.log('🔧 Modo DESARROLLO detectado');
  console.log('💡 App Check usando debug tokens');

  // Activar debug mode
  self.FIREBASE_APPCHECK_DEBUG_TOKEN = true;

  // Inicializar con reCAPTCHA Enterprise
  appCheck = initializeAppCheck(app, {
    provider: new ReCaptchaEnterpriseProvider(RECAPTCHA_ENTERPRISE_SITE_KEY),
    isTokenAutoRefreshEnabled: true
  });
} else {
```

### Paso 4: Verificar en Auto-Verificación

**Línea 151:**
```javascript
// ANTES (solo producción):
if (!isDevelopment && appCheck) {

// DESPUÉS (también desarrollo):
if (isDevelopment && appCheck) {
```

### Paso 5: Probar
```bash
# Limpiar cache
localStorage.clear();
sessionStorage.clear();

# Recargar
Ctrl + Shift + R

# Verificar consola
✅ App Check inicializado correctamente
✅ App Check Token obtenido
```

---

## 🎯 Activar Enforcement (Opcional - Solo Producción)

**Cuándo:** Solo cuando vayas a lanzar a producción (1 enero 2025)

**NO lo hagas ahora** - Déjalo en "Unenforced" para desarrollo

### Activación Gradual

```
Firebase Console → App Check:

1. Storage → Enforce
   Probar que uploads/downloads funcionan

2. Firestore → Enforce
   Probar que reads/writes funcionan

3. Authentication → Enforce (último)
   Probar login/registro
```

**Entre cada paso:** Verifica que TODO funciona antes de continuar

---

## 📊 Estado Actual

| Componente | Estado | Funcionando |
|------------|--------|-------------|
| App Check en localhost | ❌ Desactivado | ✅ (evita baneo) |
| App Check en producción | ⏳ Pendiente | N/A |
| Enforcement | ❌ Unenforced | ✅ (permite desarrollo) |
| Firestore | ✅ Sin restricciones | ✅ |
| Storage | ✅ Sin restricciones | ✅ |
| Authentication | ✅ Sin restricciones | ✅ |

---

## 🔍 Troubleshooting

### Problema: Sigo viendo error 403 Forbidden

**Causa:** Enforcement está activado

**Solución:**
```
Firebase Console → App Check → Overview
Verificar que TODOS los servicios están en "Unenforced"
```

### Problema: Firestore en modo offline

**Causa:** App Check bloqueando requests o problemas de red

**Verificar:**
1. Enforcement desactivado
2. App Check NO inicializado (appCheck = null)
3. Console no muestra errores de App Check

**Solución:**
```javascript
// DevTools Console
console.log('App Check instance:', window._appCheckInstance);
// Debe mostrar: null

// Si no es null, hay un problema
localStorage.clear();
location.reload();
```

### Problema: Cannot read property 'token' of undefined

**Causa:** Código intentando usar App Check cuando está en null

**Solución:** Firestore/Auth funcionan sin App Check si enforcement está desactivado

---

## ⏰ Recordatorio

**Baneo termina:** [FECHA + 22 horas desde baneo]

**Antes de reactivar:**
1. Verificar que han pasado 22+ horas
2. Generar/registrar debug token
3. Probar en página de prueba primero
4. Luego reactivar en código

**Mientras tanto:**
✅ Puedes trabajar normalmente en localhost
✅ Todas las funcionalidades disponibles
✅ Sin restricciones de App Check

---

## 📞 Información

**Project ID:** `tuscitasseguras-2d1a6`
**Debug Token Anterior:** `cb4a5b8b-3dbf-40af-b973-0115297ecb84`
**reCAPTCHA Site Key:** `6LfdTvQrAAAAACkGjvbbFIkqHMsTHwRYYZS_CGq2`
**Lanzamiento:** 1 enero 2025

---

**Última actualización:** 2025-11-15
**Estado:** App Check desactivado temporalmente para evitar baneo
