# 🧪 PayPal - Guía Completa de Testing

> **Proyecto:** TuCitaSegura
> **Última actualización:** 2025-11-15
> **Entorno:** Sandbox → Producción

---

## 📋 Tabla de Contenidos

1. [Configuración Inicial](#configuración-inicial)
2. [Testing en Sandbox](#testing-en-sandbox)
3. [Casos de Prueba](#casos-de-prueba)
4. [Testing de Webhooks](#testing-de-webhooks)
5. [Testing de Cloud Functions](#testing-de-cloud-functions)
6. [Testing en Producción](#testing-en-producción)
7. [Troubleshooting](#troubleshooting)

---

## 🔧 Configuración Inicial

### 1. Crear Cuentas de Prueba en PayPal Sandbox

**URL:** https://developer.paypal.com/dashboard/accounts

#### Cuenta Personal (Comprador)

```yaml
Tipo: Personal
País: Spain
Email: auto-generado (sb-xxxxx@personal.example.com)
Password: auto-generado
Balance inicial: €1000
```

**Pasos:**
1. Click **"Create Account"**
2. Account Type: **Personal**
3. Country: **Spain**
4. Click **"Create"**
5. **Guardar credenciales** (email + password)

#### Cuenta Business (Vendedor)

Ya debe existir la cuenta business asociada a tu app. Si no:

```yaml
Tipo: Business
País: Spain
Email: auto-generado (sb-xxxxx@business.example.com)
Balance inicial: €500
```

### 2. Verificar Configuración

**Checklist:**
- [x] Cloud Functions desplegadas
- [x] Credenciales configuradas en Firebase
- [x] Webhook configurado en PayPal
- [x] Webhook ID configurado en Firebase
- [x] Client ID correcto en frontend (sandbox)
- [x] Plan ID correcto en suscripcion.html

---

## 🧪 Testing en Sandbox

### Test 1: Suscripción Mensual (€29.99)

#### Setup
```bash
# Abrir página de suscripción
URL: http://localhost:8000/webapp/suscripcion.html

# Usuario de prueba en Firebase
Email: testuser-male@test.com
Password: Test123456
Gender: masculino
```

#### Pasos
1. **Login en TuCitaSegura:**
   - Ir a `index.html`
   - Login con usuario masculino de Firebase Auth
   - Navegar a `/webapp/suscripcion.html`

2. **Verificar UI:**
   - ✅ Título: "Membresía Premium"
   - ✅ Precio: €29.99/mes
   - ✅ Botón PayPal renderizado
   - ✅ Lista de beneficios visible

3. **Iniciar Pago:**
   - Click en botón PayPal
   - Se abre popup de PayPal

4. **Completar Pago en PayPal:**
   - Login con cuenta **Personal de Sandbox**
   - Email: `sb-xxxxx@personal.example.com`
   - Password: (el generado por PayPal)
   - Revisar detalles:
     - Monto: €29.99
     - Tipo: Suscripción mensual
     - Comerciante: TuCitaSegura
   - Click **"Agree & Subscribe"**

5. **Verificar Éxito:**
   - Popup se cierra
   - Modal de éxito aparece en TuCitaSegura
   - Mensaje: "¡Suscripción activada exitosamente!"
   - Redirect a `/webapp/buscar-usuarios.html`

#### Verificación Backend

**Firebase Console → Firestore → users → {userId}:**
```javascript
{
  hasActiveSubscription: true,
  subscriptionId: "I-XXXXXXXXX",  // ID de PayPal
  subscriptionStartDate: Timestamp,
  subscriptionStatus: "active"
}
```

**Firebase Functions Logs:**
```bash
firebase functions:log --only paypalWebhook

# Debe mostrar:
[paypalWebhook] Event received: BILLING.SUBSCRIPTION.ACTIVATED
[paypalWebhook] Subscription activated for user: {userId}
```

**PayPal Dashboard:**
1. Ve a: https://www.sandbox.paypal.com
2. Login con cuenta Business
3. Transactions → Subscription active

#### Resultado Esperado
✅ **PASS:** Usuario tiene membresía activa, puede usar features premium

❌ **FAIL:** Ver [Troubleshooting](#troubleshooting)

---

### Test 2: Seguro Anti-Plantón (€120 - Autorización)

#### Setup
```bash
URL: http://localhost:8000/webapp/seguro.html
Usuario: Mismo usuario masculino del Test 1
```

#### Pasos

1. **Navegar a Seguro:**
   - Login en TuCitaSegura
   - Ir a `/webapp/seguro.html`

2. **Verificar UI:**
   - ✅ Título: "Seguro Anti-Plantón"
   - ✅ Precio: €120 (pago único)
   - ✅ Botón PayPal renderizado
   - ✅ Explicación de retención vs cobro

3. **Iniciar Autorización:**
   - Click en botón PayPal
   - Popup PayPal se abre

4. **Completar Autorización:**
   - Login con cuenta Personal de Sandbox
   - **IMPORTANTE:** Debe tener tarjeta vinculada
   - Revisar:
     - Monto: €120.00
     - Tipo: **Autorización** (no se cobra ahora)
     - Texto: "Se retendrá €120, solo se cobrará si plantas"
   - Click **"Authorize"**

5. **Verificar Éxito:**
   - Modal de éxito
   - Mensaje: "Seguro activado. €120 retenidos."

#### Verificación Backend

**Firestore:**
```javascript
{
  hasAntiGhostingInsurance: true,
  insuranceAuthorizationId: "2AB12345CD678901E",  // ID de autorización
  insuranceOrderId: "ORDER123",
  insuranceStatus: "authorized",  // NO "captured"
  insurancePurchaseDate: Timestamp,
  insuranceAmount: 120
}
```

**PayPal Dashboard:**
1. Login a Sandbox PayPal (Business account)
2. Activity → Authorizations
3. Debe mostrar: **€120 On Hold** (no cobrado)

#### Resultado Esperado
✅ **PASS:** €120 retenidos, NO cobrados. Usuario puede programar citas.

---

### Test 3: Captura de Seguro (Cuando alguien planta)

#### Prerequisitos
- Test 2 completado (autorización activa)
- Tener `authorizationId` del usuario "ghoster"
- Tener `appointmentId` de una cita

#### Pasos (Desde Consola del Navegador)

```javascript
// 1. Importar Firebase Functions
import { getFunctions, httpsCallable } from 'firebase/functions';

const functions = getFunctions();
const captureInsurance = httpsCallable(functions, 'captureInsuranceAuthorization');

// 2. Ejecutar captura
const result = await captureInsurance({
  authorizationId: "2AB12345CD678901E",  // Del ghoster
  appointmentId: "appt123",
  victimUserId: "victim-user-id"
});

console.log('Resultado:', result.data);
```

#### Resultado Esperado

**Consola:**
```javascript
{
  success: true,
  captureId: "CAPTURE123",
  status: "COMPLETED",
  amount: 120,
  currency: "EUR"
}
```

**Firestore - Usuario Ghoster:**
```javascript
{
  insuranceStatus: "captured",  // Cambió de "authorized"
  insuranceCaptureId: "CAPTURE123",
  insuranceCaptureDate: Timestamp,
  insuranceCaptureReason: "no_show"
}
```

**Firestore - Nueva Colección `insurance_captures`:**
```javascript
{
  ghosterId: "user123",
  victimId: "victim-user-id",
  appointmentId: "appt123",
  captureId: "CAPTURE123",
  amount: 120,
  status: "COMPLETED",
  capturedAt: Timestamp
}
```

**PayPal:**
- Balance de cuenta Business: +€120
- Autorización cambia a "Captured"

---

### Test 4: Liberar Autorización (Void)

#### Cuándo usar
- Usuario cancela su cuenta
- Cancelación mutua de cita

#### Pasos

```javascript
const voidInsurance = httpsCallable(functions, 'voidInsuranceAuthorization');

const result = await voidInsurance({
  authorizationId: "2AB12345CD678901E",
  userId: "current-user-id",
  reason: "account_cancelled"
});

console.log(result.data);
```

#### Resultado Esperado

**Consola:**
```javascript
{
  success: true,
  status: "voided",
  reason: "account_cancelled"
}
```

**Firestore:**
```javascript
{
  insuranceStatus: "voided",
  insuranceVoidDate: Timestamp,
  insuranceVoidReason: "account_cancelled"
}
```

**PayPal:**
- Autorización liberada
- Balance: €120 devueltos al usuario

---

### Test 5: Consultar Estado de Autorización

```javascript
const getAuthStatus = httpsCallable(functions, 'getInsuranceAuthorizationStatus');

const result = await getAuthStatus({
  authorizationId: "2AB12345CD678901E"
});

console.log(result.data);
```

**Resultado:**
```javascript
{
  success: true,
  status: "CREATED" | "CAPTURED" | "VOIDED" | "EXPIRED",
  amount: {
    currency_code: "EUR",
    value: "120.00"
  },
  createTime: "2025-11-15T10:00:00Z",
  expirationTime: "2025-12-14T10:00:00Z"  // 29 días después
}
```

---

## 🔔 Testing de Webhooks

### Test 6: Webhook BILLING.SUBSCRIPTION.ACTIVATED

#### Trigger
- Completar Test 1 (suscripción)

#### Verificación

**Firebase Functions Logs:**
```bash
firebase functions:log --only paypalWebhook --lines 50

# Buscar:
[paypalWebhook] Event received: BILLING.SUBSCRIPTION.ACTIVATED
[paypalWebhook] Subscription ID: I-XXXXXXXXX
[paypalWebhook] User ID: {userId}
[paypalWebhook] User updated successfully
```

**Firestore:**
```javascript
// Debe haberse actualizado automáticamente
{
  hasActiveSubscription: true,
  subscriptionStatus: "active"
}
```

---

### Test 7: Webhook BILLING.SUBSCRIPTION.CANCELLED

#### Trigger (Manual)

**Método 1: Desde PayPal Sandbox**
1. Login a https://www.sandbox.paypal.com
2. Login con cuenta **Personal** (la que suscribió)
3. Settings → Payments → Manage automatic payments
4. Click en "TuCitaSegura"
5. Click "Cancel"

**Método 2: Desde código**
```javascript
// Llamar endpoint de PayPal (requiere backend)
// Ver PAYPAL_INTEGRATION.md
```

#### Verificación

**Logs:**
```
[paypalWebhook] Event received: BILLING.SUBSCRIPTION.CANCELLED
[paypalWebhook] Subscription cancelled for user: {userId}
```

**Firestore:**
```javascript
{
  hasActiveSubscription: false,  // Cambió a false
  subscriptionStatus: "cancelled",
  subscriptionCancelDate: Timestamp
}
```

---

### Test 8: Verificar Firma de Webhook (Seguridad)

#### Test de Webhook Inválido

```bash
# Intentar enviar webhook sin firma válida
curl -X POST https://us-central1-tuscitasseguras-2d1a6.cloudfunctions.net/paypalWebhook \
  -H "Content-Type: application/json" \
  -d '{
    "event_type": "BILLING.SUBSCRIPTION.ACTIVATED",
    "resource": {
      "id": "FAKE-123",
      "custom_id": "victim-user-id"
    }
  }'
```

#### Resultado Esperado

**Response:**
```
HTTP 401 Unauthorized
{
  "error": "Webhook signature verification failed"
}
```

**Logs:**
```
[paypalWebhook] ❌ Webhook signature verification failed
```

✅ **PASS:** Webhooks falsos son rechazados

---

## 🎯 Casos de Prueba Completos

### Matriz de Testing

| ID | Caso | Usuario | Acción | Resultado Esperado | Estado |
|----|------|---------|--------|-------------------|--------|
| TC-01 | Suscripción exitosa | Masculino sin membresía | Pagar €29.99 | `hasActiveSubscription: true` | ☐ |
| TC-02 | Seguro exitoso | Masculino con membresía | Autorizar €120 | `insuranceStatus: "authorized"` | ☐ |
| TC-03 | Usuario femenino accede gratis | Femenino | Navegar a perfil | Sin pago requerido | ☐ |
| TC-04 | Bloqueo sin membresía | Masculino sin pago | Enviar mensaje | Modal "Membresía requerida" | ☐ |
| TC-05 | Bloqueo sin seguro | Masculino con membresía | Agendar cita | Modal "Seguro requerido" | ☐ |
| TC-06 | Captura por plantón | Ghoster | No llegar a cita | €120 cobrados | ☐ |
| TC-07 | Liberar autorización | Usuario válido | Cancelar cuenta | €120 liberados | ☐ |
| TC-08 | Webhook activación | N/A | Webhook PayPal | Firestore actualizado | ☐ |
| TC-09 | Webhook cancelación | Usuario | Cancelar en PayPal | `subscriptionStatus: "cancelled"` | ☐ |
| TC-10 | Seguridad webhook | Atacante | Enviar webhook falso | HTTP 401 | ☐ |
| TC-11 | Autorización expirada | Usuario | Esperar 30 días | Status: "EXPIRED" | ☐ |
| TC-12 | Doble pago prevención | Usuario con membresía | Pagar otra vez | Modal "Ya tienes membresía" | ☐ |

---

## 🔍 Testing de Cloud Functions

### Test Unitario (Local)

```bash
cd functions

# Ejecutar tests
npm test

# Con coverage
npm run test:coverage
```

**Archivo de test:** `functions/test/paypal.test.js` (crear si no existe)

```javascript
const { expect } = require('chai');
const sinon = require('sinon');
const admin = require('firebase-admin');
const test = require('firebase-functions-test')();

describe('PayPal Functions', () => {

  describe('captureInsuranceAuthorization', () => {
    it('should capture €120 when user no-shows', async () => {
      // Mock data
      const data = {
        authorizationId: '2AB123',
        appointmentId: 'appt456',
        victimUserId: 'victim789'
      };

      const context = {
        auth: { uid: 'admin-user' }
      };

      // Test
      const result = await captureInsuranceAuthorization(data, context);

      // Assertions
      expect(result.success).to.be.true;
      expect(result.amount).to.equal(120);
    });
  });

});
```

---

## 🚀 Testing en Producción

### Pre-Requisitos

⚠️ **NO probar en producción sin estos pasos:**

1. Completar TODO el testing en Sandbox
2. Cambiar a credenciales de producción
3. Actualizar frontend con Client ID de producción
4. Configurar webhook en modo Live

### Test de Producción Seguro

#### Paso 1: Montos Pequeños

Temporalmente cambiar precios:

**suscripcion.html:**
```javascript
// Línea ~268
amount: {
  currency_code: 'EUR',
  value: '0.01'  // Era 29.99
}
```

**seguro.html:**
```javascript
// Línea ~285
amount: {
  currency_code: 'EUR',
  value: '0.01'  // Era 120.00
}
```

#### Paso 2: Prueba Real

1. Crear usuario de prueba real en Firebase
2. Completar pago de €0.01
3. Verificar todo funciona
4. **IMPORTANTE:** Reembolsar inmediatamente

#### Paso 3: Revertir Precios

Cambiar de vuelta a €29.99 y €120.00

#### Paso 4: Monitoreo Intensivo

```bash
# Logs en tiempo real
firebase functions:log --tail

# Alertas en Firebase Console
# Performance Monitoring activado
```

---

## 🐛 Troubleshooting

### Error: "PayPal button not rendering"

**Causa:**
- Client ID incorrecto
- PayPal SDK no cargó
- Usuario no autenticado

**Solución:**
```javascript
// Consola del navegador
console.log(typeof paypal);  // Debe ser "object"
console.log(firebase.auth().currentUser);  // Debe existir
```

---

### Error: "Firestore permission denied"

**Causa:**
- Firestore Rules bloquean escritura
- Usuario no autenticado

**Solución:**
```bash
# Verificar rules
firebase firestore:rules get

# Ver logs
firebase functions:log
```

---

### Error: "Webhook signature verification failed"

**Causa:**
- Webhook ID no configurado
- Webhook ID incorrecto

**Solución:**
```bash
# Verificar configuración
firebase functions:config:get

# Re-configurar
firebase functions:config:set paypal.webhook_id="WH-CORRECTO"
firebase deploy --only functions
```

---

### Error: "Authorization expired"

**Causa:**
- Autorización tiene más de 29 días

**Solución:**
- Usuario debe crear nueva autorización
- Implementar sistema de renovación automática (TODO)

---

## 📊 Métricas de Testing

### KPIs a Monitorear

```yaml
Conversión de pagos:
  - Iniciados vs Completados
  - Abandonos en PayPal popup

Errores:
  - Rate de errores de webhook
  - Rate de errores de captura

Performance:
  - Tiempo de respuesta de Cloud Functions
  - Tiempo de actualización de Firestore
```

---

## ✅ Checklist Final de Testing

### Sandbox
- [ ] Suscripción funciona
- [ ] Seguro funciona
- [ ] Captura funciona
- [ ] Void funciona
- [ ] Webhooks llegan
- [ ] Firestore se actualiza
- [ ] Logs sin errores
- [ ] UI muestra estados correctos

### Producción
- [ ] Credenciales actualizadas
- [ ] Webhook configurado en Live
- [ ] Test con €0.01 exitoso
- [ ] Precios revertidos
- [ ] Monitoreo activo
- [ ] Alertas configuradas

---

**Última actualización:** 2025-11-15
**Próximo paso:** Ejecutar todos los tests en orden
