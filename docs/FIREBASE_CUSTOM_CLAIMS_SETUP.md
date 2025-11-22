# Configuración de Custom Claims en Firebase

Las **Firebase Storage Rules** requieren que los usuarios tengan **custom claims** en su token de autenticación para verificar género y rol sin hacer queries a Firestore.

## ⚠️ IMPORTANTE

**Las Storage Rules NO FUNCIONARÁN** hasta que configures los custom claims. Los usuarios recibirán errores de permisos al intentar subir/ver fotos.

---

## 📋 Custom Claims Necesarios

Cada usuario debe tener estos custom claims en su token JWT:

```javascript
{
  "role": "regular" | "admin" | "concierge",
  "gender": "masculino" | "femenino"
}
```

---

## 🛠️ Opción 1: Configurar con Cloud Functions (Recomendado)

### 1. Instala Firebase Admin SDK

```bash
cd functions  # O crea una carpeta functions si no existe
npm init -y
npm install firebase-admin firebase-functions
```

### 2. Crea `functions/index.js`

```javascript
const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();

// Trigger cuando se crea un nuevo usuario en Firestore
exports.setCustomClaims = functions.firestore
  .document('users/{userId}')
  .onWrite(async (change, context) => {
    const userId = context.params.userId;
    const userData = change.after.exists ? change.after.data() : null;

    if (!userData) {
      // Usuario eliminado
      return null;
    }

    try {
      // Obtener custom claims actuales
      const user = await admin.auth().getUser(userId);
      const currentClaims = user.customClaims || {};

      // Preparar nuevos claims
      const newClaims = {
        role: userData.userRole || 'regular',
        gender: userData.gender || null
      };

      // Solo actualizar si cambiaron
      if (JSON.stringify(currentClaims) !== JSON.stringify(newClaims)) {
        await admin.auth().setCustomClaims(userId, newClaims);
        console.log(`Custom claims updated for user ${userId}:`, newClaims);
      }

      return null;
    } catch (error) {
      console.error(`Error setting custom claims for ${userId}:`, error);
      return null;
    }
  });

// Función HTTP para actualizar claims manualmente (útil para testing)
exports.updateUserClaims = functions.https.onCall(async (data, context) => {
  // Solo admins pueden llamar esta función
  if (!context.auth || context.auth.token.role !== 'admin') {
    throw new functions.https.HttpsError(
      'permission-denied',
      'Solo admins pueden actualizar custom claims'
    );
  }

  const { userId, role, gender } = data;

  if (!userId || !role || !gender) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'Faltan parámetros requeridos'
    );
  }

  try {
    await admin.auth().setCustomClaims(userId, { role, gender });
    return { success: true, message: `Claims actualizados para ${userId}` };
  } catch (error) {
    throw new functions.https.HttpsError('internal', error.message);
  }
});
```

### 3. Despliega las Cloud Functions

```bash
firebase deploy --only functions
```

### 4. Actualiza usuarios existentes

Ejecuta esta función una vez para actualizar todos los usuarios existentes:

```javascript
// Script one-time: update-existing-users.js
const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function updateAllUsers() {
  const usersSnapshot = await db.collection('users').get();

  for (const doc of usersSnapshot.docs) {
    const userData = doc.data();
    const userId = doc.id;

    try {
      await admin.auth().setCustomClaims(userId, {
        role: userData.userRole || 'regular',
        gender: userData.gender || null
      });

      console.log(`✅ Updated ${userId}: role=${userData.userRole}, gender=${userData.gender}`);
    } catch (error) {
      console.error(`❌ Error updating ${userId}:`, error.message);
    }
  }

  console.log('✅ Todos los usuarios actualizados!');
  process.exit(0);
}

updateAllUsers();
```

Ejecuta:

```bash
node update-existing-users.js
```

---

## 🛠️ Opción 2: Configurar Manualmente (Para Testing)

### 1. Instala Firebase Admin SDK

```bash
npm install firebase-admin
```

### 2. Obtén Service Account Key

1. Ve a [Firebase Console](https://console.firebase.google.com/)
2. Project Settings > Service Accounts
3. Haz clic en "Generate new private key"
4. Guarda el archivo como `serviceAccountKey.json`

### 3. Script Manual

```javascript
// set-claims.js
const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

// CAMBIA ESTO con los datos reales de tus usuarios
const users = [
  { uid: 'USER_ID_1', role: 'regular', gender: 'masculino' },
  { uid: 'USER_ID_2', role: 'regular', gender: 'femenino' },
  { uid: 'USER_ID_3', role: 'admin', gender: 'masculino' },
  { uid: 'USER_ID_4', role: 'concierge', gender: 'masculino' }
];

async function setClaimsForUsers() {
  for (const user of users) {
    try {
      await admin.auth().setCustomClaims(user.uid, {
        role: user.role,
        gender: user.gender
      });
      console.log(`✅ Claims set for ${user.uid}`);
    } catch (error) {
      console.error(`❌ Error for ${user.uid}:`, error.message);
    }
  }

  console.log('✅ Done!');
  process.exit(0);
}

setClaimsForUsers();
```

Ejecuta:

```bash
node set-claims.js
```

---

## 🔍 Verificar Custom Claims

### Frontend (en la consola del navegador)

```javascript
// Después de login
const user = auth.currentUser;
const token = await user.getIdTokenResult();
console.log('Custom claims:', token.claims);
// Debería mostrar: { role: 'regular', gender: 'masculino', ... }
```

### Backend (con Admin SDK)

```javascript
const user = await admin.auth().getUser(userId);
console.log('Custom claims:', user.customClaims);
```

---

## ⚡ Forzar Refresh del Token

Después de actualizar claims, el usuario debe hacer logout/login O forzar refresh:

```javascript
// Frontend: Forzar refresh del token
await auth.currentUser.getIdToken(true); // true = forzar refresh
```

---

## 📊 Tabla de Roles

| Role | Descripción | Permisos |
|------|-------------|----------|
| `regular` | Usuario normal | Ve perfiles del género opuesto |
| `concierge` | Concierge VIP | Ve solo mujeres, gestiona eventos |
| `admin` | Administrador | Ve todos los perfiles |

---

## 🚨 Troubleshooting

### Error: "Permission denied" al subir fotos

**Causa:** Custom claims no configurados

**Solución:**
1. Verifica claims: `(await auth.currentUser.getIdTokenResult()).claims`
2. Si están vacíos, ejecuta el script de actualización
3. Haz logout/login para refrescar token

### Error: "Function getUserGender/getUserRole not defined"

**Causa:** Usando rules viejas que hacen queries a Firestore

**Solución:** Actualiza a las nuevas rules con custom claims (archivo `firebase-storage.rules`)

### Claims no se actualizan automáticamente

**Causa:** Cloud Function no desplegada o con errores

**Solución:**
1. Verifica logs: `firebase functions:log`
2. Redespliega: `firebase deploy --only functions`
3. Prueba manualmente con el script

---

## 📝 Notas Importantes

1. **Los custom claims se almacenan en el JWT** - No requieren queries adicionales
2. **Tienen un límite de 1000 bytes** - Solo guarda datos esenciales
3. **Se refrescan automáticamente cada 1 hora** - O al hacer login/logout
4. **Son más eficientes que queries a Firestore** - Especialmente para Storage Rules
5. **No son visibles para otros usuarios** - Solo el dueño del token puede verlos

---

## ✅ Checklist

- [ ] Cloud Function desplegada (`setCustomClaims`)
- [ ] Usuarios existentes actualizados (script one-time)
- [ ] Custom claims verificados en consola
- [ ] Storage Rules actualizadas en Firebase Console
- [ ] Probado subida de fotos desde la app
- [ ] Probado que género opuesto puede ver fotos
- [ ] Probado que mismo género NO puede ver fotos

---

## 🔗 Referencias

- [Firebase Custom Claims](https://firebase.google.com/docs/auth/admin/custom-claims)
- [Admin SDK Setup](https://firebase.google.com/docs/admin/setup)
- [Cloud Functions](https://firebase.google.com/docs/functions)
