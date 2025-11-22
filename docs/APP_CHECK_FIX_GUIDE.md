# 🔧 Guía Completa: Resolver Problema de App Check

## 📋 Resumen del Problema

**Error actual:**
```
POST https://content-firebaseappcheck.googleapis.com/.../exchangeDebugToken 403 (Forbidden)
```

**Causa:** El debug token no está registrado en Firebase Console

**Impacto:**
- ❌ Firestore no conecta (modo offline)
- ❌ Authentication falla
- ❌ Storage no accesible
- ❌ App no funcional en desarrollo

---

## ✅ Solución Paso a Paso

### **PASO 1: Acceder a Firebase Console**

Abre directamente la configuración de App Check:

```
https://console.firebase.google.com/project/tuscitasseguras-2d1a6/appcheck
```

### **PASO 2: Registrar Debug Token**

1. En la página de App Check, busca la pestaña **"Apps"**
2. Encuentra tu aplicación web con ID: `1:924208562587:web:5291359426fe390b36213e`
3. Haz click en **"Manage debug tokens"**
4. Click en **"+ Add debug token"**

**Copia y pega este token:**
```
BCF51A42-7B5F-4009-B8D7-30AF50EA661B
```

**Display name sugerido:** `Localhost Development`

5. Click en **"Save"** o **"Add"**

### **PASO 3: Desactivar Enforcement (Temporal)**

En la misma página de App Check, verás una tabla de servicios:

Para **cada servicio**, haz click y selecciona **"Unenforced"**:

- [ ] **Authentication** → Unenforced
- [ ] **Cloud Firestore** → Unenforced
- [ ] **Cloud Storage** → Unenforced

> ⚠️ **Importante:** "Unenforced" significa que App Check está activo pero no bloquea requests sin token. Esto es perfecto para desarrollo.

### **PASO 4: Limpiar Cache Local**

Abre la consola del navegador (F12) y ejecuta:

```javascript
localStorage.clear();
sessionStorage.clear();
```

Luego haz un hard reload:
- **Windows/Linux:** `Ctrl + Shift + R`
- **Mac:** `Cmd + Shift + R`

### **PASO 5: Verificar Funcionamiento**

Abre la consola del navegador (F12 → Console) y busca:

**✅ Deberías ver:**
```
✅ App Check inicializado correctamente
📍 Modo: DESARROLLO (debug tokens)
⏳ Esperando debug token...
✅ App Check Token obtenido: eyJhbGc...
✅ App Check funcionando correctamente
```

**❌ NO deberías ver:**
```
❌ POST ...exchangeDebugToken 403 (Forbidden)
❌ Could not reach Cloud Firestore backend
❌ Firestore offline mode
```

---

## 🛠️ Herramientas de Diagnóstico

### 1. Generar Nuevo Debug Token

Si el token actual no funciona, usa esta página:

```
http://localhost:5000/webapp/generate-new-debug-token.html
```

**Esta herramienta te permite:**
- ✅ Ver tu debug token actual
- ✅ Copiar el token al portapapeles
- ✅ Verificar el estado de App Check
- ✅ Generar un nuevo token si es necesario
- ✅ Ver instrucciones paso a paso

### 2. Test de Conexión Firebase

Para hacer un diagnóstico completo, abre:

```
http://localhost:5000/webapp/test-firebase-connection.html
```

**Esta herramienta prueba:**
- ✅ Presencia de debug token
- ✅ Intercambio de token con Firebase
- ✅ Estado de autenticación
- ✅ Acceso de lectura a Firestore
- ✅ Modo de conexión (online/offline)

---

## 🔍 Troubleshooting Avanzado

### Problema: Sigue apareciendo 403 después de registrar el token

#### Solución 1: Verificar que el token está activo

1. Ve a Firebase Console → App Check → Apps
2. Verifica que ves el token `BCF51A42-7B5F-4009-B8D7-30AF50EA661B`
3. Confirma que el estado es **"Active"** (no "Revoked")

#### Solución 2: Generar un nuevo token

1. Abre: `/webapp/generate-new-debug-token.html`
2. Click en **"Generar Nuevo Token"**
3. Confirma la acción
4. Copia el nuevo token
5. Regístralo en Firebase Console
6. Recarga la app

#### Solución 3: Verificar Enforcement

A veces Firebase activa Enforcement automáticamente. Verifica que:

```
Authentication:     Unenforced ✅
Cloud Firestore:    Unenforced ✅
Cloud Storage:      Unenforced ✅
```

Si alguno dice "Enforced", cámbialo a "Unenforced".

#### Solución 4: Limpiar todo y empezar de cero

```javascript
// En consola del navegador
localStorage.clear();
sessionStorage.clear();
indexedDB.deleteDatabase('firebaseLocalStorageDb');
```

Luego:
1. Cierra todas las pestañas de la app
2. Cierra el navegador completamente
3. Abre el navegador de nuevo
4. Accede a la app
5. Verifica que se genera un nuevo token
6. Regístralo en Firebase Console

### Problema: Token registrado pero Firestore sigue offline

#### Causa posible: App Check está bloqueando Firestore

**Verificación:**
1. Ve a Firebase Console → App Check
2. Busca "Cloud Firestore" en la lista
3. Si dice "Enforced" → Cámbialo a "Unenforced"
4. Espera 1-2 minutos
5. Recarga la app

#### Verificación de red:

Abre DevTools → Network:
1. Filtra por "firestore"
2. Recarga la página
3. Busca requests a `firestore.googleapis.com`
4. Verifica que responden con 200 OK (no 403)

### Problema: Token funciona en un navegador pero no en otro

**Causa:** El debug token está almacenado en localStorage, que es específico por navegador.

**Solución:**
1. Copia el token del navegador que funciona:
   ```javascript
   // En consola
   console.log(localStorage.getItem('FIREBASE_APPCHECK_DEBUG_TOKEN'));
   ```
2. Pégalo en el otro navegador:
   ```javascript
   // En consola
   localStorage.setItem('FIREBASE_APPCHECK_DEBUG_TOKEN', 'BCF51A42-7B5F-4009-B8D7-30AF50EA661B');
   ```
3. Recarga

O simplemente registra ambos tokens en Firebase Console.

---

## 📊 Checklist de Verificación

Usa este checklist para confirmar que todo está correcto:

### En Firebase Console:
- [ ] Debug token `cb4a5b8b-3dbf-40af-b973-0115297ecb84` registrado
- [ ] Token está "Active" (no revoked)
- [ ] Authentication → Unenforced
- [ ] Cloud Firestore → Unenforced
- [ ] Cloud Storage → Unenforced

### En tu App:
- [ ] Cache limpiado (localStorage.clear())
- [ ] App recargada con hard reload (Ctrl + Shift + R)
- [ ] Console muestra "App Check funcionando correctamente"
- [ ] No aparece error 403 Forbidden
- [ ] Firestore conecta (no "offline mode")
- [ ] Puedes hacer login/registro

### Tests Funcionales:
- [ ] `/webapp/test-firebase-connection.html` → Todos los tests en verde
- [ ] Login/registro funciona
- [ ] Búsqueda de usuarios carga datos
- [ ] Chat conecta correctamente
- [ ] Subir foto funciona

---

## 🚀 Después de Resolver el Problema

### 1. Deploy de Cloud Functions

Una vez que App Check funciona, puedes hacer deploy de las funciones:

```bash
cd /home/user/t2c06/functions
npm install
firebase deploy --only functions
```

### 2. Deploy de Security Rules

```bash
cd /home/user/t2c06
firebase deploy --only firestore:rules,storage
```

### 3. Activar Enforcement (Producción)

**Solo cuando TODO funcione perfectamente:**

En Firebase Console → App Check:
1. Cloud Storage → **Enforce** (menos crítico)
2. Cloud Firestore → **Enforce** (después de probar)
3. Authentication → **Enforce** (último paso)

Prueba entre cada paso que todo sigue funcionando.

### 4. Configurar ReCAPTCHA para Producción

Para producción, necesitas configurar ReCAPTCHA Enterprise:

1. Firebase Console → App Check → Apps
2. Click en tu app web
3. En "App Check configuration" selecciona:
   - **Provider:** reCAPTCHA Enterprise
   - **Site key:** `6LfdTvQrAAAAACkGjvbbFIkqHMsTHwRYYZS_CGq2`
4. Save

---

## 📞 Información de Referencia

**Project ID:** `tuscitasseguras-2d1a6`
**Web App ID:** `1:924208562587:web:5291359426fe390b36213e`
**reCAPTCHA Site Key:** `6LfdTvQrAAAAACkGjvbbFIkqHMsTHwRYYZS_CGq2`
**Debug Token:** `BCF51A42-7B5F-4009-B8D7-30AF50EA661B`

**URLs Útiles:**
- Firebase Console App Check: https://console.firebase.google.com/project/tuscitasseguras-2d1a6/appcheck
- Firebase Console Project Settings: https://console.firebase.google.com/project/tuscitasseguras-2d1a6/settings/general
- Test de Conexión: `/webapp/test-firebase-connection.html`
- Generar Token: `/webapp/generate-new-debug-token.html`

---

## 🎯 Resumen Rápido (TL;DR)

1. **Abre:** https://console.firebase.google.com/project/tuscitasseguras-2d1a6/appcheck
2. **Registra token:** `BCF51A42-7B5F-4009-B8D7-30AF50EA661B`
3. **Desactiva Enforcement:** Authentication, Firestore, Storage → Unenforced
4. **Limpia cache:** `localStorage.clear(); sessionStorage.clear();`
5. **Recarga:** Ctrl + Shift + R
6. **Verifica:** Console debe mostrar "App Check funcionando correctamente"

---

**Última actualización:** 2025-11-14
**Estado:** Guía completa lista para usar ✅
