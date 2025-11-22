# TuCitaSegura - Cloud Functions

Cloud Functions automáticas para TuCitaSegura que gestionan custom claims y permisos de Storage.

## 📦 Funciones Incluidas

### 1. `onUserDocCreate` (Trigger Firestore)
**Trigger:** Cuando se crea un documento en `users/{userId}`

**Qué hace:**
- Establece `displayName` en Firebase Auth
- Crea custom claims iniciales: `{ role: 'regular', gender: 'masculino' | 'femenino' }`

**Ejemplo:**
```javascript
// Cuando un usuario se registra:
await addDoc(collection(db, 'users'), {
  alias: 'Juan',
  gender: 'masculino',
  userRole: 'regular',
  // ...
});

// Function automáticamente setea:
// auth.token.role = 'regular'
// auth.token.gender = 'masculino'
```

---

### 2. `onUserDocUpdate` (Trigger Firestore)
**Trigger:** Cuando se actualiza un documento en `users/{userId}`

**Qué hace:**
- Detecta cambios en `userRole` o `gender`
- Actualiza custom claims si cambiaron

**Ejemplo:**
```javascript
// Admin actualiza un usuario a concierge:
await updateDoc(doc(db, 'users', userId), {
  userRole: 'concierge'
});

// Function automáticamente actualiza:
// auth.token.role = 'concierge'
```

---

### 3. `syncChatACL` (Trigger Firestore)
**Trigger:** Cuando se crea/actualiza/elimina `conversations/{conversationId}`

**Qué hace:**
- Sincroniza ACL en Storage para chat attachments
- Crea archivos vacíos: `chat_attachments/{conversationId}/__acl__/{userId}`
- Permite verificar permisos sin queries a Firestore

**Ejemplo:**
```javascript
// Cuando se crea una conversación:
await addDoc(collection(db, 'conversations'), {
  participants: ['user1', 'user2'],
  // ...
});

// Function automáticamente crea en Storage:
// chat_attachments/conv123/__acl__/user1 (archivo vacío)
// chat_attachments/conv123/__acl__/user2 (archivo vacío)

// Storage Rules pueden verificar con exists():
// exists(/b/{bucket}/o/chat_attachments/{conversationId}/__acl__/{request.auth.uid})
```

---

### 4. `updateUserClaims` (Función HTTP Callable)
**Tipo:** `functions.https.onCall`

**Permisos:** Solo admins

**Qué hace:**
- Actualiza custom claims manualmente (útil para testing)

**Ejemplo de uso (Frontend):**
```javascript
import { getFunctions, httpsCallable } from 'firebase/functions';

const functions = getFunctions();
const updateClaims = httpsCallable(functions, 'updateUserClaims');

// Solo admin puede ejecutar esto:
const result = await updateClaims({
  userId: 'USER_ID_AQUI',
  role: 'concierge',
  gender: 'masculino'
});

console.log(result.data.message); // "Claims actualizados para USER_ID_AQUI"
```

---

### 5. `getUserClaims` (Función HTTP Callable)
**Tipo:** `functions.https.onCall`

**Permisos:** Usuarios pueden ver sus propios claims, admins pueden ver cualquiera

**Qué hace:**
- Obtiene custom claims de un usuario (útil para debugging)

**Ejemplo de uso:**
```javascript
const getClaims = httpsCallable(functions, 'getUserClaims');

// Ver tus propios claims:
const result = await getClaims({});
console.log(result.data.customClaims); // { role: 'regular', gender: 'masculino' }

// Admin puede ver claims de otro usuario:
const result = await getClaims({ userId: 'OTHER_USER_ID' });
console.log(result.data.customClaims);
```

---

## 🚀 Instalación

### 1. Instalar dependencias

```bash
cd functions
npm install
```

### 2. Obtener Service Account Key (para script one-time)

1. Ve a [Firebase Console](https://console.firebase.google.com/)
2. Project Settings > Service Accounts
3. Click "Generate new private key"
4. Guarda como `functions/serviceAccountKey.json`

**⚠️ IMPORTANTE:** Este archivo contiene credenciales sensibles. Está en `.gitignore`.

---

## 📤 Desplegar Functions

```bash
# Desde la raíz del proyecto
firebase deploy --only functions

# O desde functions/
cd functions
npm run deploy
```

**Primera vez:** Firebase te pedirá habilitar Cloud Functions y puede requerir upgrade a plan Blaze (pago por uso).

---

## 🔧 Actualizar Usuarios Existentes

**IMPORTANTE:** Las functions solo se ejecutan en **nuevos** usuarios o actualizaciones. Para usuarios existentes, ejecuta:

```bash
cd functions
npm install  # Si no lo hiciste antes
node scripts/update-existing-users.js
```

Este script:
- Lee todos los usuarios de Firestore
- Obtiene `userRole` y `gender` de cada documento
- Setea custom claims para cada usuario
- Muestra progreso en tiempo real

**Output esperado:**
```
🚀 Iniciando actualización de custom claims...

📊 Total de usuarios: 15

✅ user1 (juan@example.com): role=regular, gender=masculino
✅ user2 (maria@example.com): role=regular, gender=femenino
✅ user3 (admin@example.com): role=admin, gender=masculino
...

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📈 RESUMEN:
   ✅ Exitosos: 15
   ❌ Errores: 0
   ⏭️  Sin cambios: 0
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✨ Proceso completado!

⚠️  IMPORTANTE: Los usuarios deben hacer logout/login o ejecutar:
   await auth.currentUser.getIdToken(true); // Forzar refresh
```

---

## 🧪 Testing Local (Emulador)

```bash
cd functions
npm run serve
```

Esto inicia el emulador de Functions. Puedes probar triggers sin desplegar a producción.

---

## 📊 Monitorear Functions

### Ver logs en vivo
```bash
firebase functions:log
```

### Ver logs de una función específica
```bash
firebase functions:log --only onUserDocCreate
```

### Ver logs en Firebase Console
1. Ve a [Firebase Console](https://console.firebase.google.com/)
2. Functions > Logs
3. Filtra por función

---

## 🔍 Debugging

### Verificar claims después de desplegar

**En frontend:**
```javascript
// Después de login
const user = auth.currentUser;
const token = await user.getIdTokenResult();
console.log('Custom claims:', token.claims);

// Debería mostrar:
// {
//   role: 'regular',
//   gender: 'masculino',
//   iat: 1234567890,
//   exp: 1234567890,
//   ...
// }
```

**Con función HTTP:**
```javascript
const getClaims = httpsCallable(functions, 'getUserClaims');
const result = await getClaims({});
console.log(result.data);
```

### Claims no se actualizan

**Problema:** Usuario tiene claims viejos después de actualización

**Solución:**
```javascript
// Forzar refresh del token
await auth.currentUser.getIdToken(true);

// O hacer logout/login
await signOut(auth);
// ... login de nuevo
```

---

## 💰 Costos

Cloud Functions en plan **Blaze** (pago por uso):

- **Invocaciones:** Primeras 2M gratis/mes, luego $0.40 por millón
- **Compute time:** Primeros 400K GB-s gratis/mes
- **Network egress:** 5GB gratis/mes

**Estimado para TuCitaSegura:**
- 1000 registros/mes → ~1000 invocaciones de `onUserDocCreate`
- 5000 updates de perfil/mes → ~5000 invocaciones de `onUserDocUpdate`
- 10000 mensajes/mes → ~10000 invocaciones de `syncChatACL`

**Total estimado:** Gratis (dentro del tier gratuito)

---

## 🛠️ Comandos Útiles

```bash
# Instalar dependencias
npm install

# Desplegar solo una función
firebase deploy --only functions:onUserDocCreate

# Ver logs en tiempo real
firebase functions:log --only onUserDocCreate

# Eliminar una función
firebase functions:delete onUserDocCreate

# Ejecutar tests (si existen)
npm test

# Actualizar usuarios existentes
node scripts/update-existing-users.js
```

---

## 📝 Notas Importantes

1. **Service Account Key:**
   - Nunca subir a Git
   - Rotar cada 90 días
   - Revocar si se compromete

2. **Custom Claims Limits:**
   - Máximo 1000 bytes por usuario
   - Solo datos esenciales (role, gender)
   - Se refrescan cada 1 hora automáticamente

3. **Billing:**
   - Requiere plan Blaze para Cloud Functions
   - Configura alertas de billing en Firebase Console

4. **Rollback:**
   - Firebase guarda versiones previas de functions
   - Puedes hacer rollback desde Console

---

## 🔗 Referencias

- [Cloud Functions Docs](https://firebase.google.com/docs/functions)
- [Custom Claims Guide](https://firebase.google.com/docs/auth/admin/custom-claims)
- [Storage ACL Pattern](https://firebase.google.com/docs/storage/security)
