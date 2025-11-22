# 🔗 Guía de Configuración de Webhooks - TuCitaSegura

> **Versión:** 1.0.0
> **Fecha:** 2025-11-14
> **Autor:** TuCitaSegura Development Team

---

## 📋 Tabla de Contenidos

1. [Introducción](#introducción)
2. [Arquitectura de Webhooks](#arquitectura-de-webhooks)
3. [Configuración de Stripe](#configuración-de-stripe)
4. [Configuración de PayPal](#configuración-de-paypal)
5. [Deployment de Cloud Functions](#deployment-de-cloud-functions)
6. [Testing de Webhooks](#testing-de-webhooks)
7. [Monitoreo y Logs](#monitoreo-y-logs)
8. [Troubleshooting](#troubleshooting)

---

## 🎯 Introducción

Este documento explica cómo configurar webhooks de **Stripe** y **PayPal** para automatizar la sincronización de pagos en TuCitaSegura.

### ¿Qué son Webhooks?

Los webhooks son notificaciones HTTP que los servicios de pago envían a tu servidor cuando ocurre un evento (ej: pago exitoso, suscripción cancelada).

### ¿Por qué son críticos?

- ✅ **Sincronización automática** de estado de pagos
- ✅ **Actualización en tiempo real** de `hasActiveSubscription` y `hasAntiGhostingInsurance`
- ✅ **Validación backend** garantizada (no se puede bypassear)
- ✅ **Manejo de renovaciones** automáticas
- ✅ **Gestión de cancelaciones** y fallos de pago

---

## 🏗️ Arquitectura de Webhooks

```
┌─────────────────────────────────────────────────────────────┐
│                   Stripe / PayPal                           │
│                  (Payment Provider)                         │
└────────────────────┬────────────────────────────────────────┘
                     │ Webhook Event
                     ▼
┌─────────────────────────────────────────────────────────────┐
│        Cloud Function: stripeWebhook / paypalWebhook       │
│                    (Firebase Functions)                      │
│                                                             │
│  1. Verificar firma del webhook                             │
│  2. Parsear evento (subscription.created, payment.succeeded)│
│  3. Extraer userId de metadata                              │
│  4. Actualizar Firestore                                    │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                     Firestore                               │
│                                                             │
│  users/{userId}                                             │
│    - hasActiveSubscription: true ✅                         │
│    - subscriptionId: "sub_xxx"                              │
│    - subscriptionStartDate: Timestamp                       │
│    - subscriptionEndDate: Timestamp                         │
│                                                             │
│  OR                                                         │
│                                                             │
│  users/{userId}                                             │
│    - hasAntiGhostingInsurance: true ✅                      │
│    - insurancePaymentId: "pi_xxx"                           │
│    - insurancePurchaseDate: Timestamp                       │
└─────────────────────────────────────────────────────────────┘
```

### Eventos Manejados

#### Stripe

| Evento | Descripción | Acción |
|--------|-------------|--------|
| `customer.subscription.created` | Nueva suscripción | `hasActiveSubscription = true` |
| `customer.subscription.updated` | Suscripción actualizada | Actualizar datos |
| `customer.subscription.deleted` | Suscripción cancelada | `hasActiveSubscription = false` |
| `payment_intent.succeeded` | Pago único exitoso (seguro) | `hasAntiGhostingInsurance = true` |
| `payment_intent.payment_failed` | Pago fallido | Log + notificación |
| `invoice.payment_failed` | Renovación fallida | `status = past_due` |
| `invoice.payment_succeeded` | Renovación exitosa | Actualizar período |

#### PayPal

| Evento | Descripción | Acción |
|--------|-------------|--------|
| `BILLING.SUBSCRIPTION.ACTIVATED` | Suscripción activada | `hasActiveSubscription = true` |
| `BILLING.SUBSCRIPTION.UPDATED` | Suscripción actualizada | Actualizar datos |
| `BILLING.SUBSCRIPTION.CANCELLED` | Suscripción cancelada | `hasActiveSubscription = false` |
| `PAYMENT.SALE.COMPLETED` | Pago único completado | `hasAntiGhostingInsurance = true` |
| `PAYMENT.SALE.DENIED` | Pago denegado | Log + notificación |

---

## 🔐 Configuración de Stripe

### Paso 1: Obtener API Keys

1. Ve a [Stripe Dashboard](https://dashboard.stripe.com/)
2. Click en **Developers** → **API keys**
3. Copia:
   - **Publishable key** (pk_test_xxx o pk_live_xxx)
   - **Secret key** (sk_test_xxx o sk_live_xxx)

### Paso 2: Configurar Webhook

1. En Stripe Dashboard, ve a **Developers** → **Webhooks**
2. Click **Add endpoint**
3. Configurar:

```
Endpoint URL: https://YOUR_REGION-YOUR_PROJECT.cloudfunctions.net/stripeWebhook

Events to send:
✅ customer.subscription.created
✅ customer.subscription.updated
✅ customer.subscription.deleted
✅ payment_intent.succeeded
✅ payment_intent.payment_failed
✅ invoice.payment_failed
✅ invoice.payment_succeeded
```

4. Click **Add endpoint**
5. Copia el **Signing secret** (whsec_xxx)

### Paso 3: Configurar Firebase Functions Config

```bash
# Configurar Stripe keys
firebase functions:config:set \
  stripe.secret_key="sk_test_xxx" \
  stripe.webhook_secret="whsec_xxx"

# Ver configuración
firebase functions:config:get
```

### Paso 4: Variables de entorno (.env para desarrollo local)

Crea `/functions/.env`:

```bash
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
```

⚠️ **IMPORTANTE:** Agregar `.env` al `.gitignore`

---

## 💳 Configuración de PayPal

### Paso 1: Crear App en PayPal Developer

1. Ve a [PayPal Developer Dashboard](https://developer.paypal.com/dashboard/)
2. Click **My Apps & Credentials**
3. Click **Create App**
4. Nombre: "TuCitaSegura"
5. Copia:
   - **Client ID**
   - **Secret**

### Paso 2: Configurar Webhook

1. En PayPal Dashboard, ve a **Webhooks**
2. Click **Add Webhook**
3. Configurar:

```
Webhook URL: https://YOUR_REGION-YOUR_PROJECT.cloudfunctions.net/paypalWebhook

Event types:
✅ BILLING.SUBSCRIPTION.ACTIVATED
✅ BILLING.SUBSCRIPTION.UPDATED
✅ BILLING.SUBSCRIPTION.CANCELLED
✅ BILLING.SUBSCRIPTION.SUSPENDED
✅ PAYMENT.SALE.COMPLETED
✅ PAYMENT.SALE.DENIED
✅ PAYMENT.SALE.REFUNDED
```

4. Click **Save**

### Paso 3: Configurar Firebase Functions Config

```bash
# Configurar PayPal keys
firebase functions:config:set \
  paypal.client_id="xxx" \
  paypal.secret="xxx" \
  paypal.webhook_id="xxx"

# Ver configuración
firebase functions:config:get
```

### Paso 4: Variables de entorno (.env)

Agregar a `/functions/.env`:

```bash
PAYPAL_CLIENT_ID=xxx
PAYPAL_SECRET=xxx
PAYPAL_WEBHOOK_ID=xxx
```

---

## 🚀 Deployment de Cloud Functions

### Paso 1: Instalar Dependencias

```bash
cd functions
npm install
```

### Paso 2: Validar Código

```bash
# Lint (si tienes ESLint configurado)
npm run lint

# Test local (opcional)
firebase emulators:start --only functions
```

### Paso 3: Deploy

```bash
# Deploy todas las funciones
firebase deploy --only functions

# O deploy solo webhooks
firebase deploy --only functions:stripeWebhook,functions:paypalWebhook
```

### Paso 4: Obtener URLs de Webhooks

```bash
# Ver URLs deployadas
firebase functions:list

# Salida esperada:
# stripeWebhook: https://us-central1-YOUR_PROJECT.cloudfunctions.net/stripeWebhook
# paypalWebhook: https://us-central1-YOUR_PROJECT.cloudfunctions.net/paypalWebhook
```

### Paso 5: Actualizar URLs en Stripe/PayPal

1. Copia las URLs deployadas
2. Actualízalas en Stripe Dashboard → Webhooks
3. Actualízalas en PayPal Developer Dashboard → Webhooks

---

## 🧪 Testing de Webhooks

### Opción 1: Stripe CLI (Local Testing)

```bash
# Instalar Stripe CLI
brew install stripe/stripe-cli/stripe
# O: https://stripe.com/docs/stripe-cli

# Login
stripe login

# Escuchar webhooks localmente
stripe listen --forward-to http://localhost:5001/YOUR_PROJECT/us-central1/stripeWebhook

# Trigger test event
stripe trigger customer.subscription.created
stripe trigger payment_intent.succeeded
```

### Opción 2: Stripe Dashboard (Testing Mode)

1. Ve a **Developers** → **Webhooks** → Tu endpoint
2. Click **Send test webhook**
3. Selecciona evento: `customer.subscription.created`
4. Modifica JSON para incluir `metadata.userId`:

```json
{
  "object": {
    "id": "sub_test123",
    "object": "subscription",
    "status": "active",
    "metadata": {
      "userId": "FIREBASE_USER_ID_HERE",
      "plan": "monthly"
    },
    "current_period_start": 1700000000,
    "current_period_end": 1702592000,
    "items": {
      "data": [{
        "price": {
          "unit_amount": 2999
        }
      }]
    },
    "currency": "eur"
  }
}
```

5. Click **Send test webhook**

### Opción 3: PayPal Sandbox

1. Ve a [PayPal Sandbox](https://developer.paypal.com/tools/sandbox/)
2. Crea test accounts (buyer + seller)
3. Realiza una transacción de prueba
4. PayPal enviará webhooks automáticamente

### Verificar Logs

```bash
# Ver logs en tiempo real
firebase functions:log --only stripeWebhook,paypalWebhook

# Ver logs recientes
firebase functions:log --limit 50
```

### Verificar Actualización en Firestore

```javascript
// En Firebase Console → Firestore
// Navegar a: users/{userId}

// Campos actualizados:
hasActiveSubscription: true ✅
subscriptionId: "sub_xxx"
subscriptionStatus: "active"
subscriptionStartDate: Timestamp(...)
subscriptionEndDate: Timestamp(...)
```

---

## 📊 Monitoreo y Logs

### Firebase Console

1. Ve a **Functions** → Click en función → **Logs**
2. Filtrar por nivel:
   - `INFO`: Operaciones normales
   - `ERROR`: Errores críticos
   - `WARNING`: Advertencias

### Logs Importantes a Monitorear

#### Exitosos ✅

```
[stripeWebhook] Event received: customer.subscription.created
[handleSubscriptionUpdate] Subscription sub_xxx updated for user uid123: active
[updateUserMembership] User uid123 membership updated: active
```

#### Errores ❌

```
[stripeWebhook] Webhook signature verification failed
[handleSubscriptionUpdate] No userId in subscription metadata
[updateUserMembership] Error updating user: user not found
```

### Alertas Recomendadas

Configurar alertas en Google Cloud Console para:

1. **Tasa de error > 5%** en últimos 5 minutos
2. **Webhook signature failed** más de 3 veces
3. **Missing userId** en metadata

---

## 🛠️ Troubleshooting

### Problema 1: Webhook signature verification failed

**Síntoma:**
```
[stripeWebhook] Webhook signature verification failed: No signatures found matching the expected signature
```

**Causa:** Signing secret incorrecto

**Solución:**
```bash
# Verificar secret configurado
firebase functions:config:get stripe.webhook_secret

# Obtener nuevo secret de Stripe Dashboard
# Actualizar:
firebase functions:config:set stripe.webhook_secret="whsec_xxx"

# Re-deploy
firebase deploy --only functions:stripeWebhook
```

---

### Problema 2: No userId in metadata

**Síntoma:**
```
[handleSubscriptionUpdate] No userId in subscription metadata
```

**Causa:** No se incluyó `metadata.userId` al crear la suscripción/pago

**Solución:**

Al crear suscripción en frontend:

```javascript
// Stripe
const subscription = await stripe.subscriptions.create({
  customer: customerId,
  items: [{ price: priceId }],
  metadata: {
    userId: currentUser.uid,  // ✅ INCLUIR SIEMPRE
    plan: 'monthly'
  }
});

// PayPal
// Incluir custom_id en la suscripción
{
  "custom_id": currentUser.uid,  // ✅ INCLUIR SIEMPRE
  "plan_id": "PLAN_ID",
  ...
}
```

---

### Problema 3: User not found en Firestore

**Síntoma:**
```
Error updating user: No document to update
```

**Causa:** Usuario no existe en Firestore

**Solución:**

Asegurarse que el usuario existe antes de procesar pago:

```javascript
// Verificar en webhook
const userDoc = await db.collection('users').doc(userId).get();
if (!userDoc.exists) {
  console.error(`User ${userId} not found in Firestore`);
  return;
}
```

---

### Problema 4: Webhook URL no accesible

**Síntoma:** Stripe/PayPal reporta "URL not reachable"

**Causa:** Cloud Function no deployada o región incorrecta

**Solución:**
```bash
# Verificar función deployada
firebase functions:list | grep Webhook

# Si no aparece, deploy:
firebase deploy --only functions:stripeWebhook,functions:paypalWebhook

# Verificar URL correcta en Stripe/PayPal Dashboard
```

---

### Problema 5: Multiple webhook calls (duplicados)

**Síntoma:** Mismo evento procesado múltiples veces

**Causa:** Webhooks configurados en múltiples endpoints o timeouts

**Solución:**

Implementar idempotencia:

```javascript
// En handleSubscriptionUpdate
const db = admin.firestore();
const eventLogRef = db.collection('webhook_events').doc(eventId);

const eventDoc = await eventLogRef.get();
if (eventDoc.exists) {
  console.log(`Event ${eventId} already processed, skipping`);
  return;
}

// Procesar evento...

// Marcar como procesado
await eventLogRef.set({
  eventId,
  type: event.type,
  processedAt: admin.firestore.FieldValue.serverTimestamp()
});
```

### Idempotencia y protección contra reintentos

- Clave: `event.id` (Stripe y PayPal envían un identificador único por evento).
- Registro: `webhook_events/<event.id>` en Firestore.
- Flujo:
  - Primera entrega: si no existe el documento, se procesa y se guarda `{ status: 'processed', timestamp: serverTimestamp }`.
  - Entregas posteriores con el mismo `event.id`: se retorna `200` y se omite cualquier cambio de estado.
- Monitoreo:
  - Firebase Console → Firestore → colección `webhook_events`.
  - Revisar campos como `status`, `timestamp` y opcionalmente `type`, `userId`.
- Limpieza:
  - Configurar TTL sobre `timestamp` o `createdAt` en Firestore, o usar Cloud Scheduler para eliminar documentos antiguos (p. ej., >30 días).
- Pruebas:
  - Ejecutar `npm test -- functions/test/webhooks.test.js`.
  - Incluye casos de duplicados: Stripe `customer.subscription.created`, `payment_intent.succeeded`, `invoice.payment_failed`, PayPal `BILLING.SUBSCRIPTION.ACTIVATED`.

#### Despliegue y retención de `webhook_events`

- Despliegue de la función programada de limpieza:
  - `firebase deploy --only functions:cleanupWebhookEvents`
  - Verificar que aparece en `firebase functions:list` como tarea programada.
- Retención recomendada:
  - 30 días por defecto (configurable en código: const `retentionDays = 30`).
  - Alternativa: política TTL nativa de Firestore sobre `processedAt` si no se desea mantener una función programada.
- Operación de la limpieza:
  - Borra documentos en `webhook_events` con `processedAt` anterior al umbral.
  - Elimina hasta 500 documentos por ejecución usando lotes; para colecciones grandes, complementar con paginación o TTL.
- Observabilidad:
  - Logs en Functions: inicio/fin y conteo de documentos eliminados.
  - Firestore: tamaño de colección y tasa de crecimiento tras habilitar limpieza o TTL.

---

## 📚 Recursos Adicionales

### Documentación Oficial

**Stripe:**
- [Webhooks Documentation](https://stripe.com/docs/webhooks)
- [Testing Webhooks](https://stripe.com/docs/webhooks/test)
- [Subscription Events](https://stripe.com/docs/api/subscriptions)

**PayPal:**
- [Webhooks Overview](https://developer.paypal.com/docs/api-basics/notifications/webhooks/)
- [Event Types](https://developer.paypal.com/api/rest/webhooks/event-names/)
- [Subscription API](https://developer.paypal.com/docs/subscriptions/)

**Firebase:**
- [Cloud Functions](https://firebase.google.com/docs/functions)
- [Functions Config](https://firebase.google.com/docs/functions/config-env)

### Archivos Relacionados

- `functions/index.js` - Código de webhooks
- `BUSINESS_RULES.md` - Reglas de negocio
- `PAYMENT_VALIDATION_TESTS.md` - Tests de validación
- `CHANGELOG_PAYMENT_VALIDATION.md` - Changelog de pagos

---

## ✅ Checklist de Configuración

### Stripe

- [ ] Obtener API keys (publishable + secret)
- [ ] Crear webhook endpoint en Dashboard
- [ ] Copiar signing secret
- [ ] Configurar Firebase Functions config
- [ ] Deploy stripeWebhook function
- [ ] Actualizar webhook URL en Stripe
- [ ] Testear con Stripe CLI o test webhook
- [ ] Verificar logs en Firebase Console
- [ ] Verificar actualización en Firestore

### PayPal

- [ ] Crear app en Developer Dashboard
- [ ] Obtener Client ID + Secret
- [ ] Crear webhook endpoint
- [ ] Configurar Firebase Functions config
- [ ] Deploy paypalWebhook function
- [ ] Actualizar webhook URL en PayPal
- [ ] Testear con Sandbox
- [ ] Verificar logs
- [ ] Verificar actualización en Firestore

### Producción

- [ ] Cambiar a Live keys (Stripe)
- [ ] Cambiar a Production (PayPal)
- [ ] Actualizar webhooks con URLs de producción
- [ ] Configurar alertas de monitoreo
- [ ] Documentar proceso de rollback
- [ ] Notificar equipo de QA
- [ ] Monitorear logs primeras 24 horas

---

## 🔒 Seguridad

### Best Practices

1. **Verificar siempre firmas de webhook:**
   - Stripe: `stripe.webhooks.constructEvent()`
   - PayPal: Verificar headers (TODO: implementar)

2. **No exponer secrets:**
   - Usar Firebase Functions config
   - Nunca commitear .env a git
   - Rotar keys periódicamente

3. **Validar metadata:**
   - Verificar que userId existe
   - Validar format de datos
   - Sanitizar inputs

4. **Implementar rate limiting:**
   - Limitar requests por IP
   - Detectar patrones sospechosos

5. **Logging seguro:**
   - No loggear datos sensibles (tokens, PII)
   - Usar niveles apropiados (INFO/ERROR)
   - Retener logs mínimo 30 días

---

**🎉 Con esta configuración, los pagos se sincronizarán automáticamente y la validación backend será 100% confiable.**
