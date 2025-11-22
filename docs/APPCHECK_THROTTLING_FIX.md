# Firebase App Check Throttling - Solución Completa

**Error:** `AppCheck: Requests throttled due to 403 error. Attempts allowed again after 23h:59m:11s`

**Última Actualización:** 2025-11-14

---

## 🚨 Síntoma del Problema

Cuando intentas registrar un usuario, ves estos errores en la consola del navegador:

```
[2025-11-14T21:57:53.386Z]  @firebase/app-check: AppCheck: Requests throttled due to 403 error. Attempts allowed again after 23h:59m:11s (appCheck/throttled).

[2025-11-14T21:57:53.390Z]  @firebase/auth: Auth (10.12.2): Error while retrieving App Check token: FirebaseError: AppCheck: Requests throttled due to 403 error. Attempts allowed again after 23h:59m:11s (appCheck/throttled).

POST https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=... 401 (Unauthorized)

[ERROR] Registration error: FirebaseError: Firebase: Error (auth/network-request-failed).
```

---

## 🔍 Análisis de Causa Raíz

### ¿Qué es el Throttling de App Check?

Firebase App Check implementa un mecanismo de **throttling (limitación)** para protegerse contra ataques:

1. **Errores 403 Repetidos:** Si App Check recibe múltiples errores 403 al intentar validar tokens, interpreta esto como un ataque potencial
2. **Bloqueo Automático:** Firebase activa un throttling que **bloquea todos los intentos durante 24 horas**
3. **Estado Persistente:** Este bloqueo se guarda en el **localStorage**, **sessionStorage** e **IndexedDB** del navegador
4. **Continúa Bloqueado:** Aunque cierres y reabras el navegador, el bloqueo persiste

### ¿Por Qué Ocurre en Localhost?

El throttling en localhost se activa cuando:

1. **App Check Habilitado:** La importación de `firebase-appcheck.js` está activa
2. **Dominio No Configurado:** localhost NO está configurado como dominio permitido en:
   - reCAPTCHA Enterprise
   - O Firebase App Check
3. **Errores 403:** Firebase rechaza las peticiones de App Check con error 403
4. **Throttling Activado:** Después de varios errores 403, Firebase activa el bloqueo de 24 horas

### Secuencia de Eventos

```
1. Usuario carga página de registro
   ↓
2. firebase-appcheck.js se importa e intenta inicializarse
   ↓
3. App Check intenta obtener token de reCAPTCHA Enterprise
   ↓
4. reCAPTCHA rechaza la petición (403) porque localhost no está autorizado
   ↓
5. App Check reintenta varias veces → más errores 403
   ↓
6. Firebase detecta errores repetidos → activa throttling
   ↓
7. Throttling guardado en localStorage/IndexedDB
   ↓
8. TODOS los intentos posteriores fallan con error "throttled"
   ↓
9. Aunque desactives App Check, el estado de throttling persiste
   ↓
10. Usuario bloqueado durante 24 horas
```

---

## ⚡ SOLUCIÓN COMPLETA (3 Pasos - 10 minutos)

### Paso 1: Limpiar Estado de Throttling del Navegador

#### Opción A: Usar Herramienta Automática (Recomendado)

1. **Abrir herramienta de limpieza:**
   ```
   http://localhost:8000/webapp/clear-appcheck-throttle.html
   ```

2. **Click en "Limpiar Estado de App Check"**
   - Esto eliminará todo el estado de Firebase guardado en el navegador

3. **Verificar mensaje de éxito:**
   ```
   ✅ Estado limpiado exitosamente!
   Eliminados: X localStorage, Y sessionStorage, Z databases
   ```

#### Opción B: Limpiar Manualmente

1. **Abrir DevTools:** `F12`

2. **Ir a Application/Aplicación Tab**

3. **Limpiar localStorage:**
   - Application → Storage → Local Storage → `http://localhost:8000`
   - Click derecho → Clear
   - O ejecutar en Console:
   ```javascript
   localStorage.clear();
   ```

4. **Limpiar sessionStorage:**
   ```javascript
   sessionStorage.clear();
   ```

5. **Limpiar IndexedDB:**
   - Application → Storage → IndexedDB
   - Eliminar estos databases:
     - `firebaseLocalStorageDb`
     - `firebase-app-check-database`
     - `firebase-heartbeat-database`
     - `firebase-installations-database`

6. **Limpiar Cookies:**
   - Application → Storage → Cookies → `http://localhost:8000`
   - Clear All

---

### Paso 2: Limpiar Caché del Navegador

1. **Presionar:** `Ctrl + Shift + Delete`

2. **Seleccionar:**
   - ✅ Cached images and files (Imágenes y archivos en caché)
   - ✅ Cookies and other site data (Cookies y datos del sitio)

3. **Time range:** Últimas 24 horas o Todo el tiempo

4. **Click:** Clear data / Borrar datos

---

### Paso 3: Cerrar y Reabrir Navegador

1. **Cerrar TODAS las pestañas** de localhost:8000

2. **Cerrar el navegador completamente**

3. **Abrir navegador nuevo**

4. **Ir a la página de registro:**
   ```
   http://localhost:8000/webapp/register.html
   ```

5. **Verificar en Console (F12):**
   - NO debería haber mensajes de App Check
   - NO debería haber errores de throttling

6. **Probar registro:**
   - Llenar formulario
   - Submit
   - ✅ Debería funcionar SIN errores 401

---

## 🛠️ Cambios Implementados en el Código

### 1. App Check Imports Deshabilitados (Temporal)

**Archivos modificados:** 20 archivos HTML

**Cambio:**
```javascript
// Antes (causaba throttling):
import './js/firebase-appcheck.js';

// Ahora (deshabilitado temporalmente):
// TEMP DISABLED (throttling): import './js/firebase-appcheck.js';
```

**Razón:** Prevenir que App Check intente inicializarse y cause más throttling

### 2. Herramienta de Limpieza Creada

**Archivo:** `webapp/clear-appcheck-throttle.html`

**Funcionalidad:**
- Interfaz gráfica para limpiar estado de App Check
- Elimina localStorage, sessionStorage, IndexedDB
- Muestra resultados y próximos pasos

### 3. Scripts de Automatización

**Archivos creados:**
- `scripts/enable-appcheck-imports.sh` - Habilita App Check en todos los archivos
- `scripts/disable-appcheck-imports.sh` - Deshabilita App Check en todos los archivos

**Uso:**
```bash
# Deshabilitar App Check (ya ejecutado)
./scripts/disable-appcheck-imports.sh

# Habilitar App Check (cuando esté configurado correctamente)
./scripts/enable-appcheck-imports.sh
```

---

## 🔄 Cómo Prevenir el Problema en el Futuro

### Opción 1: NO Usar App Check en Desarrollo (Recomendado)

**Mantener imports deshabilitados:**
```javascript
// TEMP DISABLED (throttling): import './js/firebase-appcheck.js';
```

**Ventajas:**
- ✅ Sin errores de throttling
- ✅ Sin configuración adicional
- ✅ Funciona inmediatamente

**Desventajas:**
- ⚠️ No pruebas App Check en desarrollo
- ⚠️ Debes recordar habilitarlo para producción

---

### Opción 2: Configurar Debug Tokens (Para Probar App Check)

Si quieres **probar App Check en localhost**, sigue estos pasos:

#### 2.1. Habilitar App Check Imports

```bash
./scripts/enable-appcheck-imports.sh
```

#### 2.2. Obtener Debug Token

1. **Abrir página en localhost:**
   ```
   http://localhost:8000/webapp/register.html
   ```

2. **Abrir Console (F12)**

3. **Buscar mensaje:**
   ```
   Firebase App Check debug token: XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX
   ```

4. **Copiar el token**

#### 2.3. Registrar Debug Token en Firebase Console

1. **Ir a Firebase Console:**
   ```
   https://console.firebase.google.com/project/tuscitasseguras-2d1a6/appcheck/apps
   ```

2. **Seleccionar tu Web App**

3. **Scroll a "App Check debug tokens"**

4. **Click "Add debug token"**

5. **Pegar el token copiado**

6. **Nombre:** "Localhost Development - [Tu Nombre]"

7. **Click "Save"**

#### 2.4. Configurar Enforcement

1. **Ir a:** Firebase Console → App Check → APIs

2. **Configurar cada servicio:**
   - Authentication → **Unenforced** (para desarrollo)
   - Cloud Firestore → **Unenforced**
   - Cloud Storage → **Unenforced**

#### 2.5. Verificar

1. **Hard refresh:** `Ctrl + Shift + R`

2. **Console debe mostrar:**
   ```
   ✅ App Check inicializado correctamente
   ```

3. **Probar registro** - debería funcionar sin errores

**Notas:**
- Debug tokens expiran después de cierto tiempo
- Cada desarrollador necesita su propio debug token
- Debug tokens solo funcionan en el navegador donde se generaron

---

### Opción 3: Configurar reCAPTCHA Enterprise para Localhost

#### 3.1. Ir a Google Cloud Console

```
https://console.cloud.google.com/security/recaptcha?project=tuscitasseguras-2d1a6
```

#### 3.2. Seleccionar Site Key

Click en: `6LfdTvQrAAAAACkGjvbbFIkqHMsTHwRYYZS_CGq2`

#### 3.3. Añadir Dominio

1. **Scroll a "Domains"**

2. **Click "Add a domain"**

3. **Añadir:**
   - `localhost`
   - `127.0.0.1`

4. **Save**

5. **Esperar 2-3 minutos** para que los cambios se propaguen

#### 3.4. Actualizar firebase-appcheck.js

En `webapp/js/firebase-appcheck.js`, verificar que localhost esté en ALLOWED_DOMAINS:

```javascript
const ALLOWED_DOMAINS = [
  'localhost',                              // ✅ Ya incluido
  '127.0.0.1',                             // ✅ Ya incluido
  'tuscitasseguras-2d1a6.web.app',
  'tuscitasseguras-2d1a6.firebaseapp.com'
];
```

#### 3.5. Modificar Lógica de Development

En `webapp/js/firebase-appcheck.js` (líneas 66-70), **comentar** la lógica que desactiva App Check en desarrollo:

```javascript
// OPCIÓN A: Comentar completamente
// } else if (isDevelopment) {
//   console.log('⚠️  App Check DESACTIVADO en modo desarrollo');
//   // No inicializar App Check en desarrollo
// } else {

// OPCIÓN B: Permitir localhost pero no otras IPs locales
} else if (isDevelopment && !location.hostname.includes('localhost') && !location.hostname.includes('127.0.0.1')) {
  console.log('⚠️  App Check DESACTIVADO en desarrollo (IP local)');
} else {
```

#### 3.6. Habilitar App Check Imports

```bash
./scripts/enable-appcheck-imports.sh
```

#### 3.7. Verificar

1. **Hard refresh:** `Ctrl + Shift + R`
2. **Console debe mostrar:**
   ```
   🔐 Inicializando App Check...
   ✅ App Check inicializado correctamente
   📍 Modo: PRODUCCIÓN (localhost)
   🔑 Provider: reCAPTCHA Enterprise
   ```

---

## 📊 Comparación de Opciones

| Opción | Configuración | Seguridad Dev | Seguridad Prod | Complejidad |
|--------|--------------|---------------|----------------|-------------|
| **1. Sin App Check** | ✅ Ninguna | ⚠️ Baja | ❌ Debes recordar habilitar | ⭐ Muy fácil |
| **2. Debug Tokens** | ⚠️ Por desarrollador | ✅ Media | ✅ Alta | ⭐⭐ Fácil |
| **3. reCAPTCHA localhost** | ⚠️ Una vez | ✅ Alta | ✅ Alta | ⭐⭐⭐ Media |

**Recomendación:**
- **Desarrollo rápido:** Opción 1 (Sin App Check)
- **Pruebas de seguridad:** Opción 2 (Debug Tokens)
- **Setup permanente:** Opción 3 (reCAPTCHA localhost)

---

## 🧪 Verificación Post-Fix

Después de aplicar cualquier solución, verifica:

### 1. Limpiar Todo

```bash
# En navegador
localStorage.clear();
sessionStorage.clear();

# Cerrar todas las pestañas
# Reabrir navegador
```

### 2. Abrir Register

```
http://localhost:8000/webapp/register.html
```

### 3. Verificar Console

**✅ CORRECTO (Sin App Check):**
```
(No hay mensajes de App Check)
```

**✅ CORRECTO (Con App Check y Debug Token):**
```
🔐 Inicializando App Check...
✅ App Check inicializado correctamente
```

**❌ ERROR (Throttling persiste):**
```
AppCheck: Requests throttled due to 403 error
```
→ Repetir Paso 1-3 de la solución

### 4. Probar Registro

- Llenar formulario
- Submit
- **✅ Éxito:** Usuario creado, redirect a login
- **❌ Error:** Ver sección de Troubleshooting abajo

---

## 🐛 Troubleshooting

### Error: Todavía Veo Throttling

**Síntoma:**
```
AppCheck: Requests throttled due to 403 error
```

**Soluciones:**

1. **Verificar que limpiaste TODO:**
   ```javascript
   // En Console
   console.log('localStorage:', localStorage.length);  // Debe ser 0
   console.log('sessionStorage:', sessionStorage.length);  // Debe ser 0
   ```

2. **Usar modo incógnito:**
   - `Ctrl + Shift + N` (Chrome)
   - Ir a `http://localhost:8000/webapp/register.html`
   - Si funciona → problema es el caché

3. **Usar otro navegador:**
   - Probar en Firefox / Edge / Safari
   - Si funciona → limpiar Chrome más agresivamente

4. **Reinstalar extensiones:**
   - Algunas extensiones guardan estado
   - Desactivar todas las extensiones
   - Probar nuevamente

---

### Error: 401 Pero Sin Throttling

**Síntoma:**
```
POST .../accounts:signUp 401 (Unauthorized)
(Sin mensaje de throttling)
```

**Causa:** Enforcement de App Check activado en Firebase Console

**Solución:** Ver `docs/FIREBASE_AUTH_401_FIX.md`

---

### Error: App Check No Se Desactiva

**Síntoma:**
```
🔐 Inicializando App Check...
(En localhost, cuando debería estar desactivado)
```

**Causa:** Lógica de detección de desarrollo no funciona

**Solución:**

1. **Verificar firebase-appcheck.js líneas 18-20:**
   ```javascript
   const isDevelopment = location.hostname === "localhost" ||
                        location.hostname === "127.0.0.1" ||
                        location.hostname.includes("192.168.");
   ```

2. **Verificar ALLOWED_DOMAINS:**
   ```javascript
   const ALLOWED_DOMAINS = [
     'localhost',      // ✅ Debe estar aquí
     '127.0.0.1',      // ✅ Debe estar aquí
     // ...
   ];
   ```

3. **Verificar lógica de inicialización (líneas 66-72):**
   ```javascript
   } else if (isDevelopment) {
     console.log('⚠️  App Check DESACTIVADO en modo desarrollo');
     // No inicializar App Check en desarrollo
   } else {
   ```

---

## 📝 Resumen de Archivos Modificados

### Código de Aplicación

```
webapp/register.html              - App Check import deshabilitado
webapp/login.html                 - App Check import deshabilitado
webapp/buscar-usuarios.html       - App Check import deshabilitado
(+ 17 archivos HTML más)
```

### Herramientas Creadas

```
webapp/clear-appcheck-throttle.html       - Herramienta de limpieza
scripts/enable-appcheck-imports.sh        - Script habilitar App Check
scripts/disable-appcheck-imports.sh       - Script deshabilitar App Check
```

### Documentación

```
docs/APPCHECK_THROTTLING_FIX.md           - Este archivo
docs/FIREBASE_AUTH_401_FIX.md             - Fix para 401 sin throttling
QUICK_FIX_FIREBASE_401.md                 - Guía rápida
```

---

## 🎯 Decisión Final: ¿Qué Hacer?

### Para Desarrollo Inmediato (AHORA)

✅ **Usar Opción 1: Sin App Check**

```bash
# Ya ejecutado:
./scripts/disable-appcheck-imports.sh

# Próximos pasos:
1. Limpiar navegador (clear-appcheck-throttle.html)
2. Cerrar todas las pestañas
3. Abrir registro en pestaña nueva
4. Probar - debería funcionar
```

### Para Deployment a Producción (DESPUÉS)

✅ **Habilitar App Check con reCAPTCHA Enterprise**

```bash
# Antes de deploy:
./scripts/enable-appcheck-imports.sh

# En Firebase Console:
1. Configurar dominio de producción en reCAPTCHA
2. Activar Enforcement en Firebase App Check
3. Deploy

# App Check se activará automáticamente en producción
```

---

## 🔗 Referencias

- [Firebase App Check Documentation](https://firebase.google.com/docs/app-check)
- [reCAPTCHA Enterprise](https://cloud.google.com/recaptcha-enterprise/docs)
- [App Check Throttling](https://firebase.google.com/docs/app-check/web/debug-provider)

---

## ✅ Checklist de Solución

- [ ] Limpiar localStorage/sessionStorage (clear-appcheck-throttle.html)
- [ ] Limpiar IndexedDB
- [ ] Limpiar caché del navegador (Ctrl + Shift + Delete)
- [ ] Cerrar todas las pestañas de localhost
- [ ] Cerrar navegador completamente
- [ ] Abrir navegador nuevo
- [ ] Ir a register.html
- [ ] Verificar NO hay mensajes de App Check en Console
- [ ] Probar registro
- [ ] ✅ Usuario creado exitosamente

---

**Estado:** ✅ Solución implementada y lista para usar
**Prioridad:** 🔴 Crítica (bloquea registro de usuarios)
**Tiempo de Solución:** 10 minutos
**Complejidad:** ⭐⭐ Media

---

**Última Actualización:** 2025-11-14
**Versión:** 1.0
**Autor:** Claude Code Assistant
