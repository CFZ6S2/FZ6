# 🧪 Testing de Validación de Pagos en Firestore Rules

## 📋 Resumen de Cambios

Se han implementado **validaciones de pago a nivel de backend** en Firestore Rules para garantizar que las restricciones no puedan ser bypasseadas desde el frontend.

### ✅ Validaciones Implementadas

| Operación | Colección | Validación | Aplica a |
|-----------|-----------|------------|----------|
| **Enviar solicitud de cita** | `matches` | Requiere membresía activa | 🚹 Hombres |
| **Enviar mensajes de chat** | `conversations/{id}/messages` | Requiere membresía activa | 🚹 Hombres |
| **Agendar cita confirmada** | `appointments` | Requiere membresía + seguro | 🚹 Hombres |

### 🔒 Funciones Helper Añadidas

```javascript
// Obtener datos del usuario actual
function getUserData() {
  return get(/databases/$(database)/documents/users/$(uid())).data;
}

// Verificar membresía activa
function hasActiveMembership() {
  return getUserData().hasActiveSubscription == true;
}

// Verificar seguro anti-plantón
function hasInsurance() {
  return getUserData().hasAntiGhostingInsurance == true;
}

// Validar permiso para chatear
function canChat() {
  return isFemale() || (isMale() && hasActiveMembership()) || isAdmin();
}

// Validar permiso para agendar citas
function canSchedule() {
  return isFemale() || (isMale() && hasActiveMembership() && hasInsurance()) || isAdmin();
}
```

---

## 🧪 Guía de Testing en Firebase Console

### Preparación

1. Ve a **Firebase Console** → Tu Proyecto
2. **Firestore Database** → **Rules**
3. Click en **Rules Playground**

---

## Test Suite

### 🔴 Test 1: Hombre sin membresía intenta enviar match

**Escenario:** Usuario masculino sin membresía intenta enviar solicitud de cita

```javascript
// Configuración del test
Operation: create
Location: /databases/(default)/documents/matches/match123

Auth:
{
  "uid": "male-user-123",
  "token": {
    "role": "regular",
    "gender": "masculino"
  }
}

Data:
{
  "senderId": "male-user-123",
  "receiverId": "female-user-456",
  "status": "pending",
  "createdAt": "2024-12-19T10:00:00Z"
}

// Simular documento de usuario en Firestore
Mock data for /users/male-user-123:
{
  "uid": "male-user-123",
  "gender": "masculino",
  "hasActiveSubscription": false,     // ❌ Sin membresía
  "hasAntiGhostingInsurance": false
}
```

**Resultado Esperado:** ❌ **DENIED** (Permission denied)

**Razón:** `canChat()` retorna `false` porque es hombre sin membresía.

---

### 🟢 Test 2: Hombre con membresía intenta enviar match

**Escenario:** Usuario masculino con membresía activa envía solicitud

```javascript
Operation: create
Location: /databases/(default)/documents/matches/match124

Auth:
{
  "uid": "male-user-456",
  "token": {
    "role": "regular",
    "gender": "masculino"
  }
}

Data:
{
  "senderId": "male-user-456",
  "receiverId": "female-user-789",
  "status": "pending",
  "createdAt": "2024-12-19T10:00:00Z"
}

Mock data for /users/male-user-456:
{
  "uid": "male-user-456",
  "gender": "masculino",
  "hasActiveSubscription": true,      // ✅ Con membresía
  "hasAntiGhostingInsurance": false
}
```

**Resultado Esperado:** ✅ **ALLOWED**

**Razón:** `canChat()` retorna `true` (hombre con membresía).

---

### 🟢 Test 3: Mujer sin pagos intenta enviar match

**Escenario:** Usuaria femenina sin pagos envía solicitud (gratis)

```javascript
Operation: create
Location: /databases/(default)/documents/matches/match125

Auth:
{
  "uid": "female-user-789",
  "token": {
    "role": "regular",
    "gender": "femenino"
  }
}

Data:
{
  "senderId": "female-user-789",
  "receiverId": "male-user-123",
  "status": "pending",
  "createdAt": "2024-12-19T10:00:00Z"
}

Mock data for /users/female-user-789:
{
  "uid": "female-user-789",
  "gender": "femenino",
  "hasActiveSubscription": false,     // No necesita
  "hasAntiGhostingInsurance": false   // No necesita
}
```

**Resultado Esperado:** ✅ **ALLOWED**

**Razón:** `canChat()` retorna `true` para mujeres sin validar pagos.

---

### 🔴 Test 4: Hombre sin membresía intenta enviar mensaje

**Escenario:** Usuario masculino sin membresía intenta chatear

```javascript
Operation: create
Location: /databases/(default)/documents/conversations/conv123/messages/msg001

Auth:
{
  "uid": "male-user-123",
  "token": {
    "role": "regular",
    "gender": "masculino"
  }
}

Data:
{
  "senderId": "male-user-123",
  "text": "Hola, ¿cómo estás?",
  "createdAt": "2024-12-19T10:00:00Z"
}

Mock data for /conversations/conv123:
{
  "participants": ["male-user-123", "female-user-456"]
}

Mock data for /users/male-user-123:
{
  "hasActiveSubscription": false      // ❌ Sin membresía
}
```

**Resultado Esperado:** ❌ **DENIED**

**Razón:** `canChat()` falla porque es hombre sin membresía.

---

### 🟢 Test 5: Hombre con membresía envía mensaje

**Escenario:** Usuario masculino con membresía puede chatear

```javascript
Operation: create
Location: /databases/(default)/documents/conversations/conv124/messages/msg002

Auth:
{
  "uid": "male-user-456",
  "token": {
    "role": "regular",
    "gender": "masculino"
  }
}

Data:
{
  "senderId": "male-user-456",
  "text": "¡Hola! Me encantó tu perfil",
  "createdAt": "2024-12-19T10:00:00Z"
}

Mock data for /conversations/conv124:
{
  "participants": ["male-user-456", "female-user-789"]
}

Mock data for /users/male-user-456:
{
  "hasActiveSubscription": true       // ✅ Con membresía
}
```

**Resultado Esperado:** ✅ **ALLOWED**

---

### 🔴 Test 6: Hombre con membresía pero sin seguro intenta agendar cita

**Escenario:** Usuario masculino con membresía pero sin seguro intenta crear appointment

```javascript
Operation: create
Location: /databases/(default)/documents/appointments/appt001

Auth:
{
  "uid": "male-user-456",
  "token": {
    "role": "regular",
    "gender": "masculino"
  }
}

Data:
{
  "participants": ["male-user-456", "female-user-789"],
  "date": "2024-12-25",
  "time": "19:00",
  "place": "Restaurante La Buena Mesa",
  "status": "pending",
  "createdAt": "2024-12-19T10:00:00Z"
}

Mock data for /users/male-user-456:
{
  "hasActiveSubscription": true,      // ✅ Con membresía
  "hasAntiGhostingInsurance": false   // ❌ Sin seguro
}
```

**Resultado Esperado:** ❌ **DENIED**

**Razón:** `canSchedule()` requiere membresía + seguro. Falta el seguro.

---

### 🟢 Test 7: Hombre con membresía + seguro agenda cita

**Escenario:** Usuario masculino con ambos pagos puede agendar

```javascript
Operation: create
Location: /databases/(default)/documents/appointments/appt002

Auth:
{
  "uid": "male-user-789",
  "token": {
    "role": "regular",
    "gender": "masculino"
  }
}

Data:
{
  "participants": ["male-user-789", "female-user-123"],
  "date": "2024-12-25",
  "time": "20:00",
  "place": "Café Central",
  "status": "confirmed",
  "createdAt": "2024-12-19T10:00:00Z"
}

Mock data for /users/male-user-789:
{
  "hasActiveSubscription": true,      // ✅ Con membresía
  "hasAntiGhostingInsurance": true    // ✅ Con seguro
}
```

**Resultado Esperado:** ✅ **ALLOWED**

**Razón:** `canSchedule()` retorna `true` (membresía + seguro).

---

### 🟢 Test 8: Mujer sin pagos agenda cita

**Escenario:** Usuaria femenina puede agendar sin pagos

```javascript
Operation: create
Location: /databases/(default)/documents/appointments/appt003

Auth:
{
  "uid": "female-user-456",
  "token": {
    "role": "regular",
    "gender": "femenino"
  }
}

Data:
{
  "participants": ["female-user-456", "male-user-789"],
  "date": "2024-12-26",
  "time": "18:00",
  "place": "Parque Central",
  "status": "pending",
  "createdAt": "2024-12-19T10:00:00Z"
}

Mock data for /users/female-user-456:
{
  "hasActiveSubscription": false,     // No necesita
  "hasAntiGhostingInsurance": false   // No necesita
}
```

**Resultado Esperado:** ✅ **ALLOWED**

**Razón:** `canSchedule()` retorna `true` para mujeres.

---

### 🟡 Test 9: Admin sin pagos puede hacer todo

**Escenario:** Usuario admin puede bypassear validaciones de pago

```javascript
Operation: create
Location: /databases/(default)/documents/appointments/appt004

Auth:
{
  "uid": "admin-user-001",
  "token": {
    "role": "admin",          // 🔑 Admin role
    "gender": "masculino"
  }
}

Data:
{
  "participants": ["admin-user-001", "female-user-123"],
  "date": "2024-12-27",
  "time": "19:00",
  "place": "Restaurante Gourmet",
  "status": "confirmed",
  "createdAt": "2024-12-19T10:00:00Z"
}

Mock data for /users/admin-user-001:
{
  "userRole": "admin",
  "hasActiveSubscription": false,     // Admin no necesita
  "hasAntiGhostingInsurance": false   // Admin no necesita
}
```

**Resultado Esperado:** ✅ **ALLOWED**

**Razón:** `canSchedule()` permite admins sin validar pagos.

---

## 📊 Resumen de Tests

| Test # | Escenario | Usuario | Membresía | Seguro | Operación | Resultado |
|--------|-----------|---------|-----------|--------|-----------|-----------|
| 1 | Enviar match | 🚹 Hombre | ❌ | ❌ | `matches.create` | ❌ DENY |
| 2 | Enviar match | 🚹 Hombre | ✅ | ❌ | `matches.create` | ✅ ALLOW |
| 3 | Enviar match | 🚺 Mujer | ❌ | ❌ | `matches.create` | ✅ ALLOW |
| 4 | Enviar mensaje | 🚹 Hombre | ❌ | ❌ | `messages.create` | ❌ DENY |
| 5 | Enviar mensaje | 🚹 Hombre | ✅ | ❌ | `messages.create` | ✅ ALLOW |
| 6 | Agendar cita | 🚹 Hombre | ✅ | ❌ | `appointments.create` | ❌ DENY |
| 7 | Agendar cita | 🚹 Hombre | ✅ | ✅ | `appointments.create` | ✅ ALLOW |
| 8 | Agendar cita | 🚺 Mujer | ❌ | ❌ | `appointments.create` | ✅ ALLOW |
| 9 | Agendar cita | 👨‍💼 Admin | ❌ | ❌ | `appointments.create` | ✅ ALLOW |

**Total Tests:** 9
**Tests Denegados (esperados):** 3
**Tests Permitidos (esperados):** 6

---

## 🚀 Deployment

### Paso 1: Verificar sintaxis
```bash
firebase deploy --only firestore:rules --dry-run
```

### Paso 2: Deploy a producción
```bash
firebase deploy --only firestore:rules
```

### Paso 3: Verificar deployment
```bash
firebase firestore:rules get
```

---

## ⚠️ Notas Importantes

### 1. Performance de `getUserData()`
La función `getUserData()` hace un `get()` a Firestore cada vez que se ejecuta. Esto consume:
- **1 read operation** por validación
- Puede incrementar costos en operaciones masivas

**Mitigación:** Los custom claims (`token.gender`, `token.role`) ya están en el token, no requieren reads.

### 2. Cache de Firestore
Firestore cachea documentos leídos en rules por un corto periodo, reduciendo reads duplicados.

### 3. Campos requeridos en `users`
Asegúrate que todos los usuarios tengan estos campos:
```javascript
{
  hasActiveSubscription: boolean,
  hasAntiGhostingInsurance: boolean
}
```

### 4. Sincronización con pagos
Cuando un usuario paga, actualizar estos campos inmediatamente:
```javascript
await updateDoc(doc(db, 'users', userId), {
  hasActiveSubscription: true,
  subscriptionId: 'stripe_sub_xxx',
  subscriptionStartDate: Timestamp.now()
});
```

---

## 📚 Referencias

- [Firestore Security Rules Docs](https://firebase.google.com/docs/firestore/security/get-started)
- [Testing Rules](https://firebase.google.com/docs/firestore/security/test-rules-emulator)
- `BUSINESS_RULES.md` - Reglas de negocio
- `FIRESTORE_SECURITY_RULES.md` - Guía de security rules

---

## ✅ Checklist de Implementación

- [x] Agregar funciones helper de validación
- [x] Implementar validación en `matches`
- [x] Implementar validación en `messages`
- [x] Implementar validación en `appointments`
- [ ] Deploy a producción
- [ ] Testear en Firebase Console
- [ ] Actualizar frontend para manejar errores de permiso
- [ ] Sincronizar pagos con Stripe/PayPal webhooks
- [ ] Documentar en `FIRESTORE_SECURITY_RULES.md`

---

**🎉 Con estas validaciones, es IMPOSIBLE bypassear las restricciones de pago desde el frontend.**
