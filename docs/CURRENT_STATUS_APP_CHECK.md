# Estado Actual: App Check - Error 403 Forbidden

## 🔴 Problema Actual

**Error:**
```
POST https://content-firebaseappcheck.googleapis.com/.../exchangeDebugToken 403 (Forbidden)
```

**Consecuencias:**
- Firestore opera en modo offline
- Auth requests fallan
- App no puede conectarse a Firebase backend

**Causa Raíz:** Debug token `cb4a5b8b-3dbf-40af-b973-0115297ecb84` **NO está registrado** en Firebase Console.

---

## ✅ Configuración de Código (COMPLETA)

### 1. Firebase App Check - Código ✅
- **Archivo:** `webapp/js/firebase-appcheck.js`
- **Site Key:** `6LfdTvQrAAAAACkGjvbbFIkqHMsTHwRYYZS_CGq2`
- **Debug Mode:** Activado para localhost
- **Estado:** ✅ Correctamente configurado

### 2. Firebase Config ✅
- **Archivo:** `webapp/js/firebase-config.js`
- **Project ID:** `tuscitasseguras-2d1a6`
- **Estado:** ✅ Correctamente configurado

### 3. Firestore Rules ✅
- **Archivo:** `firestore.rules`
- **Usando:** Custom claims (role, gender) desde JWT
- **Estado:** ✅ Listas para deploy

### 4. Storage Rules ✅
- **Archivo:** `firebase-storage.rules`
- **Estructura:** `profile_photos/{gender}/{userId}/`
- **Estado:** ✅ Listas para deploy

### 5. Cloud Functions ✅
- **Archivo:** `functions/index.js`
- **Funciones:**
  - `onUserDocCreate` - Auto-set custom claims
  - `onUserDocUpdate` - Sync custom claims
  - `syncChatACL` - Manage chat permissions
- **Estado:** ✅ Listas para deploy

---

## 🚨 ACCIÓN REQUERIDA: Registrar Debug Token

### Tu Debug Token (CÓPIALO):
```
cb4a5b8b-3dbf-40af-b973-0115297ecb84
```

### Pasos para Registrar:

#### 1. Abre Firebase Console
```
https://console.firebase.google.com/project/tuscitasseguras-2d1a6/appcheck
```

#### 2. Ve a "Apps" Tab
- Verás tu web app: `1:924208562587:web:5291359426fe390b36213e`

#### 3. Haz clic en "Manage debug tokens"
- O busca sección "Debug tokens" en la página

#### 4. Haz clic en "+ Add debug token"

#### 5. Pega el Token
```
Token: cb4a5b8b-3dbf-40af-b973-0115297ecb84
Display name: Localhost Development
```

#### 6. Haz clic en "Save" o "Add"

#### 7. Verifica el Estado de Enforcement

**CRÍTICO:** Si ves Enforcement activado ("Enforced"), temporalmente **desactívalo** hasta confirmar que todo funciona:

- ❌ **Authentication** → Click "Unenforced" (si está Enforced)
- ❌ **Cloud Firestore** → Click "Unenforced" (si está Enforced)
- ❌ **Cloud Storage** → Click "Unenforced" (si está Enforced)

**Por qué:** Enforcement bloquea requests sin App Check token válido. Desactívalo mientras pruebas.

---

## ✅ Después de Registrar el Token

### 1. Recarga tu App
```
Ctrl + Shift + R (hard reload)
```

### 2. Abre DevTools Console (F12)

### 3. Deberías Ver:
```javascript
✅ App Check inicializado correctamente
📍 Modo: DESARROLLO (debug tokens)
⏳ Esperando debug token...
✅ App Check Token obtenido: eyJhbGc...
✅ App Check funcionando correctamente
```

### 4. NO Deberías Ver:
```javascript
❌ POST ...exchangeDebugToken 403 (Forbidden)
❌ Could not reach Cloud Firestore backend
```

### 5. Prueba Funcionalidad
- Intenta login/registro
- Intenta leer/escribir en Firestore
- Intenta subir foto de perfil

---

## 🔧 Troubleshooting

### Si Sigue Error 403 Después de Registrar Token:

#### Opción 1: Limpiar Cache
```javascript
// En DevTools Console
localStorage.clear();
sessionStorage.clear();
// Luego: Ctrl + Shift + R
```

#### Opción 2: Verificar Token en Firebase Console
1. Firebase Console → App Check → Apps → Debug tokens
2. Confirmar que ves: `cb4a5b8b-3dbf-40af-b973-0115297ecb84`
3. Confirmar que está "Active" (no revoked)

#### Opción 3: Generar Nuevo Debug Token
```javascript
// En DevTools Console
localStorage.clear();
location.reload();
// Copia el NUEVO token que aparezca
// Regístralo en Firebase Console
```

#### Opción 4: Desactivar Enforcement Temporalmente
Firebase Console → App Check:
- Authentication → Unenforced
- Cloud Firestore → Unenforced
- Cloud Storage → Unenforced

Recarga app y prueba. Si funciona, el problema era Enforcement bloqueando requests.

---

## 📋 Next Steps Después de Solucionar Error 403

### 1. Deploy Cloud Functions
```bash
cd /home/user/t2c06/functions
npm install
firebase deploy --only functions
```

**Esto activará:**
- Auto-set custom claims en nuevos usuarios
- Sync custom claims cuando user data cambia
- Chat ACL management automático

### 2. Actualizar Usuarios Existentes con Custom Claims
```bash
cd /home/user/t2c06/functions
# Primero descarga service account key:
# Firebase Console → Project Settings → Service Accounts → Generate new private key
# Guarda como functions/serviceAccountKey.json

node scripts/update-existing-users.js
```

### 3. Deploy Firebase Rules
```bash
cd /home/user/t2c06
firebase deploy --only firestore:rules,storage
```

**Esto activará:**
- Firestore rules con custom claims
- Storage rules con gender-based paths

### 4. Activar Enforcement (Gradualmente)
Una vez que TODO funcione sin errores:

```
Firebase Console → App Check:
1. Storage → Enforce (menos crítico)
2. Firestore → Enforce (después de probar reads/writes)
3. Authentication → Enforce (último - más crítico)
```

**Entre cada paso:** Prueba que todo sigue funcionando.

---

## 📊 Estado de Deployment

| Componente | Código | Deployed | Funcionando |
|------------|--------|----------|-------------|
| Firebase Config | ✅ | N/A | ⏳ Pendiente debug token |
| App Check | ✅ | N/A | ❌ 403 Forbidden |
| Firestore Rules | ✅ | ❌ | ⏳ Pendiente deploy |
| Storage Rules | ✅ | ❌ | ⏳ Pendiente deploy |
| Cloud Functions | ✅ | ❌ | ⏳ Pendiente deploy |
| Custom Claims | ✅ | ❌ | ⏳ Pendiente functions |

---

## 🎯 Prioridad Inmediata

### PASO 1 (AHORA):
**Registrar debug token en Firebase Console**
```
Token: cb4a5b8b-3dbf-40af-b973-0115297ecb84
URL: https://console.firebase.google.com/project/tuscitasseguras-2d1a6/appcheck
```

### PASO 2:
**Verificar Enforcement está desactivado** (mientras pruebas)

### PASO 3:
**Recargar app y confirmar** que error 403 desaparece

### PASO 4:
**Reportar resultado** para proceder con deployments

---

## 📞 Información para Debugging

**Project ID:** `tuscitasseguras-2d1a6`
**Web App ID:** `1:924208562587:web:5291359426fe390b36213e`
**reCAPTCHA Site Key:** `6LfdTvQrAAAAACkGjvbbFIkqHMsTHwRYYZS_CGq2`
**Debug Token:** `cb4a5b8b-3dbf-40af-b973-0115297ecb84`
**Git Branch:** `claude/build-user-search-page-011CUsoW7dRJdd1WfzCkvsE9`

---

## ✅ Checklist

- [ ] Debug token registrado en Firebase Console
- [ ] Enforcement verificado (debe estar "Unenforced" para pruebas)
- [ ] App recargada (Ctrl + Shift + R)
- [ ] Console muestra "App Check funcionando correctamente"
- [ ] No aparece error 403 Forbidden
- [ ] Firestore conecta correctamente (no "offline mode")
- [ ] Login/registro funciona
- [ ] Cloud Functions deployed
- [ ] Usuarios existentes actualizados con custom claims
- [ ] Firebase Rules deployed
- [ ] Enforcement activado gradualmente
- [ ] Google Maps API configurado (pendiente)

---

**Última actualización:** 2025-11-10
**Estado:** ⏳ Esperando registro de debug token en Firebase Console
