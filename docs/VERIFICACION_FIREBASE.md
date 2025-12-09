# 🔍 Verificación Completa de Firebase - TuCitaSegura

## 📋 Checklist de Verificaciones Necesarias

### 1. ✅ Firebase Project ID
- **Proyecto:** `tucitasegura-129cc`
- **App ID:** `1:180656060538:web:3168487130aa126db663c3`
- **API Key:** `AIzaSyAmaE2tXMBsKc8DjBd1ShJ1HnDxVYQ0yzU`

### 2. 🌐 Dominios Autorizados en Firebase Auth

**IMPORTANTE: Verificar en Firebase Console**

1. Ve a: https://console.firebase.google.com/project/tucitasegura-129cc/authentication/settings
2. Scroll hasta **"Authorized domains"**
3. **DEBE incluir:**
   - ✅ `localhost` (para desarrollo local)
   - ✅ `tucitasegura-129cc.web.app` (Firebase Hosting)
   - ✅ `tucitasegura-129cc.firebaseapp.com` (Firebase Hosting)
   - ✅ Tu dominio personalizado si tienes uno

**⚠️ Si falta alguno, agrégalo haciendo clic en "Add domain"**

### 3. 🔒 App Check - Estado de Enforcement

**IMPORTANTE: Verificar en Firebase Console**

1. Ve a: https://console.firebase.google.com/project/tucitasegura-129cc/appcheck
2. En la sección **"Enforcement"**, verifica:

   **Para DESARROLLO/PRUEBAS (debe estar UNENFORCED):**
   - ✅ Authentication: **Unenforced** (no enforced)
   - ✅ Cloud Firestore: **Unenforced** (no enforced)
   - ✅ Cloud Storage: **Unenforced** (no enforced)
   - ✅ Cloud Functions: **Unenforced** (no enforced)

   **⚠️ Si alguno está "Enforced", cámbialo a "Unenforced" para permitir el guardado**

### 4. 🗄️ Firestore Rules - Permisos de Escritura

**Verificar que las reglas permitan actualizar:**

```javascript
// Regla actual (línea 96-103):
allow update: if isAuthed() && (
  (uid() == userId && !request.resource.data.diff(resource.data).affectedKeys().hasAny(['userRole','email','createdAt'])) ||
  isAdmin()
);
```

**Esta regla permite:**
- ✅ Usuario autenticado puede actualizar su propio perfil
- ✅ No puede cambiar: userRole, email, createdAt
- ✅ Admin puede cambiar cualquier campo

**⚠️ Verificar que las reglas estén desplegadas:**
```bash
firebase deploy --only firestore:rules
```

### 5. 💾 Storage Rules - Permisos de Escritura

**Verificar que las reglas permitan subir fotos:**

```javascript
// Regla actual:
allow write: if isAuthed()
             && request.auth.uid == userId
             && request.resource.size < 5 * 1024 * 1024
             && request.resource.contentType.matches('image/.*');
```

**Esta regla permite:**
- ✅ Usuario autenticado puede subir fotos a su carpeta
- ✅ Tamaño máximo: 5MB
- ✅ Solo imágenes

**⚠️ Verificar que las reglas estén desplegadas:**
```bash
firebase deploy --only storage
```

### 6. 🔑 reCAPTCHA Enterprise - Dominios Configurados

**IMPORTANTE: Verificar en Google Cloud Console**

1. Ve a: https://console.cloud.google.com/security/recaptcha?project=tucitasegura-129cc
2. Busca la key: `6LdlmB8sAAAAAMHn-yHoJIAwg2iVQMIXCKtDq7eb`
3. Click en la key
4. En "Domains", **DEBE incluir:**
   - ✅ `tucitasegura-129cc.web.app`
   - ✅ `tucitasegura-129cc.firebaseapp.com`
   - ✅ `localhost` (para desarrollo)
   - ✅ Tu dominio personalizado si tienes uno

**⚠️ Si falta alguno, agrégalo haciendo clic en "Add domain"**

### 7. 👤 Custom Claims - Género del Usuario

**Verificar que el usuario tenga custom claims:**
- El código intenta obtener el género de:
  1. Custom claims (`auth.currentUser.getIdTokenResult().claims.gender`)
  2. Firestore (`users/{uid}.gender`)
  3. Formulario (fallback)

**⚠️ Si el usuario no tiene género en custom claims, el código usa el de Firestore**

### 8. 🔐 Firebase Auth - Métodos Habilitados

**Verificar en Firebase Console:**

1. Ve a: https://console.firebase.google.com/project/tucitasegura-129cc/authentication/providers
2. **DEBE estar habilitado:**
   - ✅ Email/Password

---

## 🐛 Debugging - Cómo Verificar que Funciona

### Paso 1: Abre la Consola del Navegador

1. Abre DevTools (F12)
2. Ve a la pestaña "Console"
3. Intenta guardar el perfil

### Paso 2: Verifica los Logs

Deberías ver en la consola:
```
🚀 saveProfile called
📝 Form data: {alias: "...", gender: "...", ...}
💾 Guardando perfil en Firestore: {...}
📋 User ID: ...
📋 User authenticated: true
📋 DB instance: ...
📋 UserRef path: users/...
✅ Perfil guardado exitosamente en Firestore
```

### Paso 3: Si hay Error

Si ves un error, debería mostrar:
```
❌ Error específico en updateDoc: ...
❌ Error code: permission-denied
❌ Error message: Missing or insufficient permissions.
```

**Códigos de error comunes:**
- `permission-denied`: Reglas de Firestore bloqueando
- `unauthenticated`: Usuario no autenticado
- `not-found`: Documento no existe
- `failed-precondition`: Documento existe pero no cumple condiciones

---

## 🛠️ Solución Rápida

### Si el perfil NO se guarda:

1. **Verifica App Check Enforcement:**
   - Ve a: https://console.firebase.google.com/project/tucitasegura-129cc/appcheck
   - Asegúrate de que TODO esté **"Unenforced"**

2. **Verifica Dominios Autorizados:**
   - Ve a: https://console.firebase.google.com/project/tucitasegura-129cc/authentication/settings
   - Agrega tu dominio si no está listado

3. **Verifica Firestore Rules:**
   ```bash
   firebase deploy --only firestore:rules
   ```

4. **Verifica Storage Rules:**
   ```bash
   firebase deploy --only storage
   ```

5. **Limpia la caché del navegador:**
   - Hard refresh: `Ctrl + Shift + R`
   - O limpia completamente el cache y service workers

---

## 📞 Enlaces Útiles

- **Firebase Console:** https://console.firebase.google.com/project/tucitasegura-129cc
- **Firestore Rules:** https://console.firebase.google.com/project/tucitasegura-129cc/firestore/rules
- **Storage Rules:** https://console.firebase.google.com/project/tucitasegura-129cc/storage/rules
- **App Check:** https://console.firebase.google.com/project/tucitasegura-129cc/appcheck
- **Auth Settings:** https://console.firebase.google.com/project/tucitasegura-129cc/authentication/settings
- **reCAPTCHA:** https://console.cloud.google.com/security/recaptcha?project=tucitasegura-129cc

---

## ✅ Verificación Final

Después de verificar todo, el perfil debería guardarse correctamente. Si aún no funciona, comparte los logs de la consola del navegador para identificar el problema específico.

