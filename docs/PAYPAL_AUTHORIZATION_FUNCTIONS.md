# PayPal Authorization Functions - Gestión de Retenciones del Seguro Anti-Plantón

## 📋 Descripción

Este documento describe las Cloud Functions implementadas para gestionar las **retenciones (authorization holds)** del seguro anti-plantón de €120 en PayPal.

## 🔑 Configuración Requerida

### 1. Configurar credenciales de PayPal en Firebase

```bash
# Configurar Client ID y Secret
firebase functions:config:set paypal.client_id="AQouhwoeHU6p26B7mxYl5rYyl2Hj6xl2kfo11pQbLq6oUFDv12JQkZ5Kg-HN_kzU0wzvX6CbgNbPcNYI"
firebase functions:config:set paypal.secret="EClAPLW1_Vedhq_u19Ok5MYcyjLLwm_Kd5W-QhOMsbSrN8F3ynUZd5wuJmvOke6mLLMyyv-QGZ1MK6qd"

# Configurar modo (sandbox o live)
firebase functions:config:set paypal.mode="sandbox"

# Configurar Webhook ID (opcional, para verificar webhooks)
firebase functions:config:set paypal.webhook_id="YOUR_WEBHOOK_ID"

# Verificar configuración
firebase functions:config:get
```

### 2. Variables de entorno locales (desarrollo)

Crea `.env` en `/functions/`:

```bash
PAYPAL_CLIENT_ID=AQouhwoeHU6p26B7mxYl5rYyl2Hj6xl2kfo11pQbLq6oUFDv12JQkZ5Kg-HN_kzU0wzvX6CbgNbPcNYI
PAYPAL_SECRET=EClAPLW1_Vedhq_u19Ok5MYcyjLLwm_Kd5W-QhOMsbSrN8F3ynUZd5wuJmvOke6mLLMyyv-QGZ1MK6qd
PAYPAL_MODE=sandbox
```

### 3. Instalar dependencias

```bash
cd functions
npm install
```

---

## 🚀 Funciones Implementadas

### 1. `captureInsuranceAuthorization`

**Propósito:** Capturar (cobrar) los €120 retenidos cuando un usuario planta a otro.

**Parámetros:**
```javascript
{
  authorizationId: string,  // ID de la autorización de PayPal
  appointmentId: string,     // ID de la cita
  victimUserId: string       // UID del usuario que fue plantado
}
```

**Retorna:**
```javascript
{
  success: true,
  captureId: string,    // ID de la captura de PayPal
  status: string,       // Estado: "COMPLETED"
  amount: 120,
  currency: "EUR"
}
```

**Ejemplo de uso (frontend):**
```javascript
import { getFunctions, httpsCallable } from 'firebase/functions';

const functions = getFunctions();
const captureInsurance = httpsCallable(functions, 'captureInsuranceAuthorization');

try {
  const result = await captureInsurance({
    authorizationId: appointment.ghosterAuthorizationId,
    appointmentId: appointment.id,
    victimUserId: currentUser.uid
  });

  console.log('Capture successful:', result.data.captureId);
  showToast('Se ha procesado la compensación de €120', 'success');
} catch (error) {
  console.error('Error capturing:', error);
  showToast('Error al procesar compensación', 'error');
}
```

**Qué hace:**
1. ✅ Verifica que la cita existe
2. ✅ Verifica que victimUserId es participante
3. ✅ Captura los €120 del usuario que plantó
4. ✅ Actualiza Firestore con el estado
5. ✅ Registra la captura en `insurance_captures`
6. ✅ Notifica a ambos usuarios

---

### 2. `voidInsuranceAuthorization`

**Propósito:** Liberar (anular) la retención de €120.

**Cuándo usarla:**
- ❌ ~~Cuando ambos llegan a la cita (NO SE USA - retención permanece activa)~~
- ✅ Cuando el usuario cancela su cuenta permanentemente
- ✅ Cuando se cancela una cita de mutuo acuerdo

**Parámetros:**
```javascript
{
  authorizationId: string,
  userId: string,
  reason: 'successful_date' | 'account_cancelled' | 'mutual_cancellation'
}
```

**Retorna:**
```javascript
{
  success: true,
  status: 'voided',
  reason: string
}
```

**Ejemplo de uso (frontend):**
```javascript
// Solo para cancelación de cuenta
const voidInsurance = httpsCallable(functions, 'voidInsuranceAuthorization');

try {
  const result = await voidInsurance({
    authorizationId: userData.insuranceAuthorizationId,
    userId: currentUser.uid,
    reason: 'account_cancelled'
  });

  console.log('Authorization voided:', result.data);
  showToast('Retención liberada exitosamente', 'success');
} catch (error) {
  console.error('Error voiding:', error);
}
```

**⚠️ IMPORTANTE:**
- La retención **NO** se libera después de cada cita exitosa
- La retención permanece activa indefinidamente
- Solo se libera si el usuario cancela su cuenta

---

### 3. `getInsuranceAuthorizationStatus`

**Propósito:** Consultar el estado actual de una autorización en PayPal.

**Parámetros:**
```javascript
{
  authorizationId: string
}
```

**Retorna:**
```javascript
{
  success: true,
  status: 'CREATED' | 'CAPTURED' | 'VOIDED' | 'EXPIRED',
  amount: {
    currency_code: 'EUR',
    value: '120.00'
  },
  createTime: '2025-01-15T10:00:00Z',
  expirationTime: '2025-02-13T10:00:00Z'  // Autorización válida por 29 días
}
```

**Ejemplo de uso:**
```javascript
const getAuthStatus = httpsCallable(functions, 'getInsuranceAuthorizationStatus');

try {
  const result = await getAuthStatus({
    authorizationId: userData.insuranceAuthorizationId
  });

  console.log('Authorization status:', result.data.status);

  if (result.data.status === 'EXPIRED') {
    // Autorización expiró, solicitar nueva retención
    showToast('Tu retención ha expirado, debes renovarla', 'warning');
  }
} catch (error) {
  console.error('Error getting status:', error);
}
```

---

## ⏰ Límites Temporales de PayPal

### Duración de Autorización

- **Máximo 29 días** desde la creación
- Después de 29 días, PayPal automáticamente:
  - **LIBERA** la retención (no cobra)
  - Estado cambia a `EXPIRED`
  - Ya no se puede capturar

### Solución: Re-autorización

Si la autorización expira, el usuario debe:
1. Volver a la página de seguro (`/webapp/seguro.html`)
2. Crear una nueva autorización de €120
3. El sistema actualiza `insuranceAuthorizationId` con el nuevo ID

---

## 📊 Flujo Completo del Sistema

### Escenario 1: Ambos llegan a la cita ✅

```
1. Usuario A y B confirman asistencia 24h antes
2. Día de la cita: ambos verifican presencia con QR
3. Sistema marca cita como "completed"
4. ✅ NO se llama a ninguna función
5. Retención permanece activa para futuras citas
```

### Escenario 2: Usuario A planta a Usuario B ❌

```
1. Usuario A no verifica presencia
2. Sistema detecta no-show después de 30 min
3. Admin o sistema automático llama:

   captureInsuranceAuthorization({
     authorizationId: userA.insuranceAuthorizationId,
     appointmentId: appointment.id,
     victimUserId: userB.uid
   })

4. PayPal cobra €120 de Usuario A
5. Usuario A recibe notificación de cargo
6. Usuario B recibe notificación de compensación
7. Reputación de Usuario A baja significativamente
```

### Escenario 3: Usuario cancela cuenta

```
1. Usuario solicita cancelar cuenta
2. Sistema llama:

   voidInsuranceAuthorization({
     authorizationId: user.insuranceAuthorizationId,
     userId: user.uid,
     reason: 'account_cancelled'
   })

3. PayPal libera la retención de €120
4. Usuario recibe notificación
5. Cuenta se desactiva
```

---

## 🗄️ Estructura de Datos en Firestore

### Colección `users` (campos añadidos)

```javascript
{
  // Campos existentes...
  hasAntiGhostingInsurance: true,
  insuranceAuthorizationId: "2AB12345CD678901E",  // ID de autorización PayPal
  insuranceOrderId: "ORDER123",
  insurancePurchaseDate: Timestamp,
  insuranceAmount: 120,
  insuranceStatus: "authorized" | "captured" | "voided" | "expired",

  // Si fue capturada (plantón)
  insuranceCaptureId: "CAPTURE123",
  insuranceCaptureDate: Timestamp,
  insuranceCaptureReason: "no_show",
  insuranceCaptureAppointmentId: "appointment123",

  // Si fue liberada
  insuranceVoidDate: Timestamp,
  insuranceVoidReason: "account_cancelled"
}
```

### Colección `insurance_captures` (nueva)

```javascript
{
  ghosterId: "user123",          // Quien plantó
  victimId: "user456",           // Quien fue plantado
  appointmentId: "appt789",
  authorizationId: "2AB12345",   // ID de autorización original
  captureId: "CAPTURE123",       // ID de captura de PayPal
  amount: 120,
  currency: "EUR",
  status: "COMPLETED",
  reason: "no_show",
  capturedAt: Timestamp,
  paypalResponse: { ... }        // Respuesta completa de PayPal
}
```

### Colección `insurance_voids` (nueva)

```javascript
{
  userId: "user123",
  authorizationId: "2AB12345",
  reason: "account_cancelled",
  voidedAt: Timestamp
}
```

### Colección `payment_errors` (logs)

```javascript
{
  type: "insurance_capture" | "insurance_void",
  authorizationId: "2AB12345",
  appointmentId: "appt789",  // Solo para captures
  userId: "user123",         // Solo para voids
  error: { ... },
  timestamp: Timestamp
}
```

---

## 🔒 Seguridad

### Validaciones Implementadas

1. **Autenticación obligatoria:** Todas las funciones requieren `context.auth`
2. **Verificación de participantes:** Solo se permite capturar si victimUserId es parte de la cita
3. **Validación de autorización:** Solo se puede liberar la autorización que pertenece al usuario
4. **Logs de errores:** Todos los errores se registran en `payment_errors`

### Reglas de Firestore Sugeridas

```javascript
// Proteger colecciones sensibles
match /insurance_captures/{captureId} {
  allow read: if isAdmin() ||
                 resource.data.ghosterId == uid() ||
                 resource.data.victimId == uid();
  allow write: if false;  // Solo Cloud Functions
}

match /insurance_voids/{voidId} {
  allow read: if isAdmin() || resource.data.userId == uid();
  allow write: if false;  // Solo Cloud Functions
}

match /payment_errors/{errorId} {
  allow read: if isAdmin();
  allow write: if false;  // Solo Cloud Functions
}
```

---

## 🧪 Testing

### Test en Sandbox (Desarrollo)

```bash
# 1. Configurar modo sandbox
firebase functions:config:set paypal.mode="sandbox"

# 2. Usar credenciales de sandbox
firebase functions:config:set paypal.client_id="SANDBOX_CLIENT_ID"
firebase functions:config:set paypal.secret="SANDBOX_SECRET"

# 3. Deployar funciones
firebase deploy --only functions

# 4. Probar desde frontend
# Las autorizaciones en sandbox se crean con tarjetas de prueba de PayPal
```

### Test de Captura

```javascript
// En consola del navegador
const functions = getFunctions();
const capture = httpsCallable(functions, 'captureInsuranceAuthorization');

const result = await capture({
  authorizationId: '2AB12345CD678901E',  // De una autorización de prueba
  appointmentId: 'test-appointment',
  victimUserId: 'victim-user-id'
});

console.log(result.data);
```

### Test de Void

```javascript
const voidAuth = httpsCallable(functions, 'voidInsuranceAuthorization');

const result = await voidAuth({
  authorizationId: '2AB12345CD678901E',
  userId: 'test-user-id',
  reason: 'account_cancelled'
});

console.log(result.data);
```

---

## 📝 Despliegue a Producción

### 1. Cambiar a credenciales de producción

```bash
firebase functions:config:set paypal.mode="live"
firebase functions:config:set paypal.client_id="PRODUCTION_CLIENT_ID"
firebase functions:config:set paypal.secret="PRODUCTION_SECRET"
```

### 2. Deployar funciones

```bash
cd functions
npm install
cd ..
firebase deploy --only functions
```

### 3. Verificar deployment

```bash
firebase functions:log --only captureInsuranceAuthorization
firebase functions:log --only voidInsuranceAuthorization
```

---

## ⚠️ Limitaciones Conocidas

### 1. Autorización expira en 29 días
- **Problema:** PayPal solo retiene autorizaciones por 29 días máximo
- **Solución:** Implementar un sistema de re-autorización automática cada 25 días

### 2. Solo tarjetas de crédito/débito
- **Problema:** PayPal no permite autorizaciones en saldos de PayPal
- **Solución:** Exigir tarjeta vinculada al crear la autorización

### 3. Límite de capturas
- **Problema:** Solo se puede capturar el 115% del monto original
- **Impacto:** No aplica (siempre capturamos exactamente €120)

---

## 🔄 Mejoras Futuras

### 1. Re-autorización Automática (Scheduled Function)

```javascript
exports.renewExpiringAuthorizations = functions.pubsub
  .schedule('every 24 hours')
  .onRun(async (context) => {
    // Buscar autorizaciones que expiran en < 4 días
    // Notificar usuarios para renovar
  });
```

### 2. Webhook para autorización expirada

```javascript
// En paypalWebhook, agregar:
case 'PAYMENT.AUTHORIZATION.VOIDED':
  await handleAuthorizationExpired(event.resource);
  break;
```

### 3. Dashboard de Admin

- Ver todas las autorizaciones activas
- Ver capturas realizadas
- Ver retenciones liberadas
- Estadísticas de plantones

---

## 📞 Soporte

**Documentación de PayPal:**
- [Authorization API](https://developer.paypal.com/docs/api/payments/v2/#authorizations)
- [Capture Authorization](https://developer.paypal.com/docs/api/payments/v2/#authorizations_capture)
- [Void Authorization](https://developer.paypal.com/docs/api/payments/v2/#authorizations_void)

**Errores Comunes:**
- `AUTHORIZATION_EXPIRED`: La autorización tiene más de 29 días
- `AUTHORIZATION_VOIDED`: Ya fue liberada previamente
- `INSUFFICIENT_FUNDS`: No hay fondos para capturar (raro con autorizaciones)

---

**Última actualización:** 2025-01-15
**Versión:** 1.0.0
