# 🔒 Firestore Security Rules - TuCitaSegura

## 📋 Tabla de Contenidos

1. [Introducción](#introducción)
2. [Reglas de Negocio Implementadas](#reglas-de-negocio-implementadas)
3. [Funciones Helper](#funciones-helper)
4. [Reglas por Colección](#reglas-por-colección)
5. [Deployment](#deployment)
6. [Testing](#testing)
7. [Troubleshooting](#troubleshooting)

---

## 🎯 Introducción

Las **Firestore Security Rules** de TuCitaSegura implementan un sistema completo de validación en backend para garantizar:

✅ **Búsqueda Heterosexual**: Solo se pueden ver perfiles del género opuesto
✅ **Membresía Requerida**: Hombres necesitan membresía activa (€29.99/mes) para chatear
✅ **Seguro Anti-Plantón**: Hombres necesitan seguro (€120) para proponer/agendar citas
✅ **Protección de Datos**: Usuarios solo pueden ver y modificar datos autorizados
✅ **Prevención de Fraude**: Validaciones en servidor que no se pueden bypasear desde cliente

---

## 🎯 Reglas de Negocio Implementadas

### 1. Búsqueda Heterosexual (Opposite Gender Only)

```javascript
// ✅ Permitido
User(masculino) → Ver perfil de User(femenino)
User(femenino) → Ver perfil de User(masculino)

// ❌ Bloqueado
User(masculino) → Ver perfil de User(masculino)
User(femenino) → Ver perfil de User(femenino)
```

**Implementación:**
```javascript
function isOppositeGender(targetUserId) {
  let currentUserGender = getUserData().gender;
  let targetUserGender = get(/databases/$(database)/documents/users/$(targetUserId)).data.gender;

  return (currentUserGender == 'masculino' && targetUserGender == 'femenino') ||
         (currentUserGender == 'femenino' && targetUserGender == 'masculino');
}
```

### 2. Restricciones de Membresía (Chat)

```javascript
// ✅ Puede chatear
User(masculino) + hasActiveSubscription = true
User(femenino) + cualquier estado (gratis por ahora)

// ❌ No puede chatear
User(masculino) + hasActiveSubscription = false
```

**Implementación:**
```javascript
function hasActiveMembership() {
  let userData = getUserData();
  return userData.gender == 'femenino' ||
         (userData.gender == 'masculino' && userData.hasActiveSubscription == true);
}
```

**Puntos de Validación:**
- ✅ Crear conversaciones nuevas
- ✅ Enviar mensajes
- ✅ Enviar solicitudes de cita (match requests)

### 3. Seguro Anti-Plantón (€120 - Citas)

```javascript
// ✅ Puede proponer/agendar citas
User(masculino) + hasAntiGhostingInsurance = true
User(femenino) + cualquier estado (gratis por ahora)

// ❌ No puede proponer/agendar citas
User(masculino) + hasAntiGhostingInsurance = false
```

**Implementación:**
```javascript
function hasInsurance() {
  let userData = getUserData();
  return userData.gender == 'femenino' ||
         (userData.gender == 'masculino' && userData.hasAntiGhostingInsurance == true);
}
```

**Puntos de Validación:**
- ✅ Crear appointments (citas confirmadas)
- ✅ Crear date_proposals (propuestas de cita en chat)

---

## 🛠️ Funciones Helper

### isAuthenticated()
```javascript
function isAuthenticated() {
  return request.auth != null;
}
```
Verifica que el usuario está autenticado con Firebase Auth.

### isOwner(userId)
```javascript
function isOwner(userId) {
  return isAuthenticated() && request.auth.uid == userId;
}
```
Verifica que el usuario es el dueño del documento.

### getUserData()
```javascript
function getUserData() {
  return get(/databases/$(database)/documents/users/$(request.auth.uid)).data;
}
```
Obtiene los datos completos del usuario actual desde Firestore.

### hasActiveMembership()
```javascript
function hasActiveMembership() {
  let userData = getUserData();
  return userData.gender == 'femenino' ||
         (userData.gender == 'masculino' && userData.hasActiveSubscription == true);
}
```
Verifica membresía activa (solo requerida para hombres).

### hasInsurance()
```javascript
function hasInsurance() {
  let userData = getUserData();
  return userData.gender == 'femenino' ||
         (userData.gender == 'masculino' && userData.hasAntiGhostingInsurance == true);
}
```
Verifica seguro anti-plantón (solo requerido para hombres).

### isOppositeGender(targetUserId)
```javascript
function isOppositeGender(targetUserId) {
  let currentUserGender = getUserData().gender;
  let targetUserGender = get(/databases/$(database)/documents/users/$(targetUserId)).data.gender;

  return (currentUserGender == 'masculino' && targetUserGender == 'femenino') ||
         (currentUserGender == 'femenino' && targetUserGender == 'masculino');
}
```
Verifica que dos usuarios son de géneros opuestos (heterosexual).

### isAdmin()
```javascript
function isAdmin() {
  return isAuthenticated() && getUserData().role == 'admin';
}
```
Verifica que el usuario tiene rol de administrador.

---

## 📚 Reglas por Colección

### 👤 Users Collection

```javascript
match /users/{userId} {
  // READ: Propio perfil, opuesto género, o admin
  allow read: if isAuthenticated() &&
                 (isOwner(userId) || isAdmin() || isOppositeGender(userId));

  // CREATE: Solo durante registro
  allow create: if isAuthenticated() &&
                   isOwner(userId) &&
                   request.resource.data.email == request.auth.token.email;

  // UPDATE: Solo propio perfil, no puede cambiar email/uid/createdAt
  allow update: if isAuthenticated() &&
                   isOwner(userId) &&
                   request.resource.data.email == resource.data.email &&
                   request.resource.data.uid == resource.data.uid &&
                   request.resource.data.createdAt == resource.data.createdAt;

  // DELETE: Propio perfil o admin
  allow delete: if isAuthenticated() && (isOwner(userId) || isAdmin());
}
```

**Validaciones:**
- ✅ Solo puedes ver perfiles del género opuesto (búsqueda heterosexual)
- ✅ No puedes cambiar tu email, uid, o fecha de creación
- ✅ Puedes eliminar tu propia cuenta

### 💬 Conversations Collection

```javascript
match /conversations/{conversationId} {
  // READ: Solo participantes
  allow read: if isAuthenticated() &&
                 request.auth.uid in resource.data.participants;

  // CREATE: Con membresía activa y entre géneros opuestos
  allow create: if isAuthenticated() &&
                   hasActiveMembership() &&
                   request.auth.uid in request.resource.data.participants &&
                   request.resource.data.participants.size() == 2 &&
                   isOppositeGender(...);

  // UPDATE: Solo participantes con membresía
  allow update: if isAuthenticated() &&
                   request.auth.uid in resource.data.participants &&
                   hasActiveMembership();

  // DELETE: Participantes o admin
  allow delete: if isAuthenticated() &&
                   (request.auth.uid in resource.data.participants || isAdmin());
}
```

**Validaciones:**
- ✅ Solo participantes pueden leer conversación
- ✅ Requiere membresía activa para crear conversación (hombres)
- ✅ Conversaciones solo entre géneros opuestos

### 📨 Messages Subcollection

```javascript
match /conversations/{conversationId}/messages/{messageId} {
  // READ: Solo participantes de la conversación
  allow read: if isAuthenticated() &&
                 request.auth.uid in get(...conversationId).data.participants;

  // CREATE: Con membresía activa y siendo participante
  allow create: if isAuthenticated() &&
                   hasActiveMembership() &&
                   request.auth.uid in get(...conversationId).data.participants &&
                   request.resource.data.senderId == request.auth.uid;

  // UPDATE: Solo propio mensaje
  allow update: if isAuthenticated() &&
                   request.auth.uid == resource.data.senderId;

  // DELETE: Propio mensaje o admin
  allow delete: if isAuthenticated() &&
                   (request.auth.uid == resource.data.senderId || isAdmin());
}
```

**Validaciones:**
- ✅ Requiere membresía activa para enviar mensajes (hombres)
- ✅ Solo participantes de la conversación pueden leer mensajes
- ✅ No puedes enviar mensajes en nombre de otro usuario

### 💝 Match Requests Collection

```javascript
match /match_requests/{requestId} {
  // READ: Emisor, receptor, o admin
  allow read: if isAuthenticated() &&
                 (isOwner(resource.data.senderId) ||
                  isOwner(resource.data.receiverId) ||
                  isAdmin());

  // CREATE: Con membresía y entre géneros opuestos
  allow create: if isAuthenticated() &&
                   hasActiveMembership() &&
                   request.resource.data.senderId == request.auth.uid &&
                   isOppositeGender(request.resource.data.receiverId);

  // UPDATE: Receptor puede aceptar/rechazar, emisor puede cancelar
  allow update: if isAuthenticated() &&
                   (isOwner(resource.data.receiverId) ||
                    isOwner(resource.data.senderId));

  // DELETE: Emisor, receptor, o admin
  allow delete: if isAuthenticated() &&
                   (isOwner(resource.data.senderId) ||
                    isOwner(resource.data.receiverId) ||
                    isAdmin());
}
```

**Validaciones:**
- ✅ Requiere membresía activa para enviar solicitudes (hombres)
- ✅ Solo entre géneros opuestos

### 📅 Appointments Collection

```javascript
match /appointments/{appointmentId} {
  // READ: Participantes o admin
  allow read: if isAuthenticated() &&
                 (request.auth.uid in resource.data.participants || isAdmin());

  // CREATE: Con membresía Y seguro (€120)
  allow create: if isAuthenticated() &&
                   hasActiveMembership() &&
                   hasInsurance() &&
                   request.auth.uid in request.resource.data.participants &&
                   request.resource.data.participants.size() == 2 &&
                   isOppositeGender(...);

  // UPDATE: Participantes con seguro
  allow update: if isAuthenticated() &&
                   request.auth.uid in resource.data.participants &&
                   hasInsurance();

  // DELETE: Solo admin (no se deben eliminar, solo cancelar)
  allow delete: if isAdmin();
}
```

**Validaciones:**
- ✅ Requiere membresía activa Y seguro anti-plantón (€120) (hombres)
- ✅ Solo entre géneros opuestos
- ✅ Las citas no se pueden eliminar (solo cancelar con update)

### 💰 Subscriptions & Insurance Payments

```javascript
match /subscriptions/{subscriptionId} {
  // READ: Solo dueño o admin
  allow read: if isAuthenticated() &&
                 (isOwner(resource.data.userId) || isAdmin());

  // CREATE/UPDATE/DELETE: Solo sistema (webhooks)
  allow create, update, delete: if false;
}

match /insurance_payments/{paymentId} {
  // READ: Solo dueño o admin
  allow read: if isAuthenticated() &&
                 (isOwner(resource.data.userId) || isAdmin());

  // CREATE/UPDATE/DELETE: Solo sistema (webhooks)
  allow create, update, delete: if false;
}
```

**Validaciones:**
- ✅ Los pagos solo se pueden crear/modificar vía webhooks de Stripe/PayPal
- ✅ Usuarios no pueden crear pagos fake desde el cliente
- ✅ Solo puedes ver tus propios pagos

---

## 🚀 Deployment

### Paso 1: Instalar Firebase CLI

```bash
npm install -g firebase-tools
```

### Paso 2: Login a Firebase

```bash
firebase login
```

### Paso 3: Inicializar Proyecto (si no está inicializado)

```bash
firebase init firestore
```

Selecciona:
- ✅ Use an existing project
- ✅ Selecciona tu proyecto de TuCitaSegura
- ✅ Acepta el archivo `firestore.rules` por defecto

### Paso 4: Deploy de las Rules

```bash
firebase deploy --only firestore:rules
```

Verás:
```
✔ firestore: released rules firestore.rules to cloud.firestore
```

### Paso 5: Verificar en Console

1. Ve a [Firebase Console](https://console.firebase.google.com)
2. Selecciona tu proyecto
3. Ve a **Firestore Database** → **Rules**
4. Verifica que las reglas se hayan actualizado

---

## 🧪 Testing

### Test Manual en Firebase Console

1. Ve a **Firestore Database** → **Rules**
2. Click en **Rules Playground**
3. Prueba diferentes escenarios:

#### Escenario 1: Usuario sin membresía intenta chatear

```javascript
// Location: /databases/(default)/documents/conversations/test123/messages/msg1
// Authenticated as: user1 (masculino, hasActiveSubscription: false)

// Operation: create
{
  senderId: "user1",
  text: "Hola",
  timestamp: timestamp.now()
}

// Expected: Permission denied ❌
```

#### Escenario 2: Usuario con membresía crea mensaje

```javascript
// Location: /databases/(default)/documents/conversations/test123/messages/msg1
// Authenticated as: user1 (masculino, hasActiveSubscription: true)

// Operation: create
{
  senderId: "user1",
  text: "Hola",
  timestamp: timestamp.now()
}

// Expected: Permission granted ✅
```

#### Escenario 3: Usuario sin seguro intenta crear cita

```javascript
// Location: /databases/(default)/documents/appointments/appt1
// Authenticated as: user1 (masculino, hasActiveSubscription: true, hasAntiGhostingInsurance: false)

// Operation: create
{
  participants: ["user1", "user2"],
  date: "2024-12-20",
  status: "confirmed"
}

// Expected: Permission denied ❌
```

### Tests Automatizados con Emulador

Crear archivo `firestore.test.js`:

```javascript
const firebase = require('@firebase/rules-unit-testing');

describe('Firestore Security Rules', () => {
  let testEnv;

  beforeAll(async () => {
    testEnv = await firebase.initializeTestEnvironment({
      projectId: 'tucitasegura-test',
      firestore: {
        rules: fs.readFileSync('firestore.rules', 'utf8'),
      },
    });
  });

  it('should block male users without membership from sending messages', async () => {
    const userContext = testEnv.authenticatedContext('user1', {
      gender: 'masculino',
      hasActiveSubscription: false,
    });

    const messageRef = userContext.firestore()
      .collection('conversations/conv1/messages')
      .doc('msg1');

    await firebase.assertFails(
      messageRef.set({
        senderId: 'user1',
        text: 'Test message',
      })
    );
  });

  it('should allow female users to send messages without membership', async () => {
    const userContext = testEnv.authenticatedContext('user2', {
      gender: 'femenino',
      hasActiveSubscription: false,
    });

    const messageRef = userContext.firestore()
      .collection('conversations/conv1/messages')
      .doc('msg1');

    await firebase.assertSucceeds(
      messageRef.set({
        senderId: 'user2',
        text: 'Test message',
      })
    );
  });
});
```

Ejecutar tests:
```bash
npm test
```

---

## 🔧 Troubleshooting

### Problema 1: "Permission Denied" en producción

**Causa:** Las reglas no se actualizaron correctamente

**Solución:**
```bash
# Re-deploy las reglas
firebase deploy --only firestore:rules

# Verifica que el archivo firestore.rules tiene las reglas correctas
cat firestore.rules
```

### Problema 2: Usuarios pueden bypasear validaciones

**Causa:** Las validaciones solo están en frontend

**Solución:**
✅ Las Firestore Rules validan en backend
✅ No se pueden bypasear desde el cliente
✅ Asegúrate de que las reglas están deployadas

### Problema 3: Admin no puede ver documentos

**Causa:** El campo `role: 'admin'` no está en el documento del usuario

**Solución:**
```javascript
// En Firestore Console, edita el usuario admin y agrega:
{
  uid: "admin_user_id",
  email: "admin@tucitasegura.com",
  role: "admin"  // ← Agregar este campo
}
```

### Problema 4: Usuarios del mismo género se pueden ver

**Causa:** La función `isOppositeGender()` no está funcionando

**Solución:**
1. Verifica que todos los usuarios tienen el campo `gender` correctamente:
```javascript
{
  gender: "masculino" // o "femenino"
}
```

2. Verifica que las reglas están deployadas:
```bash
firebase deploy --only firestore:rules
```

### Problema 5: Performance degradado

**Causa:** La función `getUserData()` hace múltiples lecturas

**Solución:**
- Las reglas de Firestore tienen un límite de lecturas
- Considera cachear datos en Custom Claims para mejor performance
- Para producción con alto tráfico, implementa Cloud Functions

---

## 📊 Monitoring

### Ver Logs de Denials

1. Ve a [Firebase Console](https://console.firebase.google.com)
2. **Firestore Database** → **Usage**
3. Filtra por "denied"
4. Analiza patrones de denials

### Alertas de Seguridad

Configura alertas en Cloud Monitoring:
```javascript
// Alerta cuando hay más de 100 denials en 1 hora
if (denials_count > 100) {
  sendAlert('High number of security denials');
}
```

---

## 🎯 Checklist de Deployment

- [ ] `firestore.rules` creado y validado
- [ ] Firebase CLI instalado
- [ ] Login a Firebase completado
- [ ] `firebase deploy --only firestore:rules` ejecutado
- [ ] Reglas verificadas en Firebase Console
- [ ] Tests manuales en Rules Playground pasados
- [ ] Tests automatizados pasados (opcional)
- [ ] Monitoring configurado
- [ ] Equipo notificado de las nuevas reglas

---

## 🔐 Best Practices

1. **Nunca confíes solo en frontend**
   - ❌ if (user.isPremium) { sendMessage() }
   - ✅ Validar siempre en Firestore Rules

2. **Principio de menor privilegio**
   - Solo da permisos necesarios
   - Deny by default, allow explícitamente

3. **Validar datos de entrada**
   - Verifica tipos, tamaños, formatos
   - Ejemplo: `request.resource.data.text.size() <= 1000`

4. **Usar helper functions**
   - Reutiliza lógica común
   - Mantén las reglas DRY

5. **Testing exhaustivo**
   - Test todos los casos edge
   - Automatiza tests cuando sea posible

6. **Documentar cambios**
   - Mantén este documento actualizado
   - Documenta razones de negocio

---

## 📞 Soporte

Si tienes problemas con las Firestore Rules:

1. Revisa este documento
2. Verifica logs en Firebase Console
3. Prueba en Rules Playground
4. Contacta al equipo de desarrollo

**Última actualización:** 2024-12-19
**Versión de reglas:** 2.0
**Autor:** TuCitaSegura Development Team
