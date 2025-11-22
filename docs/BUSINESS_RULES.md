# 💰 Reglas de Negocio - TuCitaSegura

## 🎯 Modelo de Monetización

TuCitaSegura implementa un **modelo de negocio basado en membresías y seguro anti-plantón** para garantizar seriedad y compromiso en todas las citas.

---

## 👥 Reglas por Rol y Género

### 🎩 Usuarios Concierge (NUEVO - Premium)

**NUEVO ROL:** Usuarios verificados que pueden publicar eventos VIP para seleccionar candidatas.

#### Suscripción Concierge (€199/mes)
**Requerido para:**
- ✅ Publicar eventos VIP
- ✅ Acceder a panel de gestión de eventos
- ✅ Ver aplicantes y seleccionar candidatas
- ✅ Badge "Concierge Verificado 🎩"
- ✅ Soporte prioritario

**Requisitos adicionales:**
- 🔐 Verificación de identidad (KYC)
- 👥 Aprobación manual del equipo
- 💳 Pago mensual de €199
- 📋 Aceptar términos específicos de Concierge

**Sin suscripción Concierge NO puedes:**
- ❌ Publicar eventos VIP
- ❌ Acceder a base de candidatas
- ❌ Gestionar selección de aplicantes

**Acceso especial:**
- 📊 Dashboard exclusivo en `/webapp/concierge-dashboard.html`
- 📝 Publicación ilimitada de eventos VIP
- 👁️ Visualización de perfiles de aplicantes
- 📧 Notificaciones cuando alguien aplica

---

### 🚹 Usuarios Masculinos (Actuales)

**REGLA CRÍTICA:** Los hombres **DEBEN** tener ambos pagos activos para usar la plataforma completamente.

#### 1. Membresía Mensual (€29.99/mes)
**Requerida para:**
- ✅ Enviar solicitudes de cita
- ✅ Abrir conversaciones
- ✅ Responder mensajes
- ✅ Ver perfiles completos
- ✅ Usar filtros avanzados

**Sin membresía NO puedes:**
- ❌ Enviar solicitudes
- ❌ Chatear con matches
- ❌ Agendar citas

#### 2. Seguro Anti-Plantón (€120 pago único)
**Requerido para:**
- ✅ Agendar citas confirmadas
- ✅ Acceder a información de contacto
- ✅ Confirmar hora y lugar de encuentro

**Sin seguro NO puedes:**
- ❌ Completar agendamiento de citas
- ❌ Obtener datos de contacto
- ❌ Confirmar encuentros

### 🚺 Usuarios Femeninos (Actual - Gratis)

**ESTADO:** Por ahora las mujeres pueden usar TuCitaSegura **completamente gratis**.

**Pueden:**
- ✅ Enviar solicitudes libremente
- ✅ Chatear sin límites
- ✅ Agendar citas sin pagar
- ✅ Acceder a todas las funcionalidades

**Futuro:** Este modelo cambiará para requerir pagos de ambos géneros.

---

## 💳 Productos y Precios

### 1. Suscripción Concierge (NUEVO)

```
┌──────────────────────────────────────┐
│ PLAN CONCIERGE                       │
│                                      │
│ €199/mes                             │
│                                      │
│ ✅ Publicación ilimitada de eventos  │
│ ✅ Acceso a base de candidatas       │
│ ✅ Sistema de selección avanzado     │
│ ✅ Badge Concierge Verificado 🎩     │
│ ✅ Notificaciones prioritarias       │
│ ✅ Soporte dedicado 24/7             │
│                                      │
│ [Solicitar Concierge]                │
└──────────────────────────────────────┘
```

**Renovación:** Automática cada mes
**Cancelación:** En cualquier momento
**Aprobación:** Requiere verificación KYC y aprobación manual
**Uso:** Publicación de eventos VIP para selección de candidatas

---

### 2. Membresía Premium

```
┌──────────────────────────────────────┐
│ PLAN MENSUAL                         │
│                                      │
│ €29.99/mes                           │
│                                      │
│ ✅ Solicitudes ilimitadas            │
│ ✅ Chat con todos tus matches        │
│ ✅ Filtros avanzados                 │
│ ✅ Geolocalización y mapas           │
│ ✅ Ver quién te visitó               │
│ ✅ Soporte prioritario               │
│                                      │
│ [Contratar Membresía]                │
└──────────────────────────────────────┘
```

**Renovación:** Automática cada mes
**Cancelación:** En cualquier momento
**Reembolso:** No aplica (servicio mensual)

### 2. Seguro Anti-Plantón

```
┌──────────────────────────────────────┐
│ SEGURO ANTI-PLANTÓN                  │
│                                      │
│ €120 (pago único)                    │
│                                      │
│ 🛡️ Protección contra plantones      │
│ 🛡️ Reembolso si no se presenta      │
│ 🛡️ Verificación de identidad        │
│ 🛡️ Sistema de reputación            │
│ 🛡️ Garantía de seriedad             │
│                                      │
│ [Contratar Seguro]                   │
└──────────────────────────────────────┘
```

**Duración:** Válido de por vida
**Cobertura:** Todas las citas futuras
**Reembolso:** Automático en caso de plantón verificado

---

## 🔒 Sistema de Validación

### Flujo de Validación en la Plataforma

```javascript
// 1. Usuario intenta enviar solicitud de cita
function checkPaymentStatus() {
  // ¿Es usuario que debe pagar?
  if (user.gender === 'masculino') {

    // ✅ Paso 1: Verificar membresía
    if (!user.hasActiveSubscription) {
      return {
        canUse: false,
        reason: 'membership',
        message: 'Necesitas membresía activa'
      };
    }

    // ✅ Paso 2: Verificar seguro anti-plantón
    if (!user.hasAntiGhostingInsurance) {
      return {
        canUse: false,
        reason: 'insurance',
        message: 'Necesitas seguro anti-plantón (€120)'
      };
    }

    // ✅ Todo OK - puede usar la plataforma
    return { canUse: true };
  }

  // Mujeres pueden usar gratis (por ahora)
  return { canUse: true };
}
```

### Puntos de Validación

#### 🔴 Bloqueo Total (Sin Membresía)
```
Usuario sin membresía →
  1. Click en "Enviar Solicitud" →
  2. Modal: "Membresía Requerida" →
  3. Detalles de plan €29.99/mes →
  4. Botón "Contratar Membresía" →
  5. Redirect a /webapp/suscripcion.html
```

#### 🟡 Bloqueo Parcial (Sin Seguro)
```
Usuario con membresía pero sin seguro →
  1. Puede ver perfiles →
  2. Puede chatear →
  3. NO puede agendar citas →
  4. Al intentar agendar →
  5. Modal: "Seguro Anti-Plantón Requerido" →
  6. Detalles de seguro €120 →
  7. Botón "Contratar Seguro" →
  8. Redirect a /webapp/seguro.html
```

#### 🟢 Acceso Completo
```
Usuario con membresía + seguro →
  ✅ Todas las funcionalidades desbloqueadas
  ✅ Banner verde "Cuenta Premium Activa"
  ✅ Badges: Premium 👑 + Asegurado 🛡️
```

---

## 📊 Estructura de Datos Firestore

### Collection: `users`

```javascript
{
  // Datos básicos
  uid: string,
  email: string,
  alias: string,
  gender: "masculino" | "femenino" | "otro",
  birthDate: string, // YYYY-MM-DD

  // ✅ ROL DE USUARIO (NUEVO)
  userRole: "regular" | "admin" | "concierge",  // Rol del usuario
  isAdmin: boolean,                             // Acceso admin (legacy)
  isConcierge: boolean,                         // Shortcut para concierge

  // ✅ CAMPOS CONCIERGE (NUEVO)
  conciergeStatus: "pending" | "approved" | "suspended",  // Estado aprobación
  conciergeApprovedAt: Timestamp,               // Cuándo fue aprobado
  conciergeSubscriptionId: string,              // Stripe subscription Concierge
  conciergeSubscriptionStatus: "active" | "canceled" | "expired",
  conciergeSubscriptionStartDate: Timestamp,
  conciergeSubscriptionEndDate: Timestamp,
  totalEventsPublished: number,                 // Total eventos VIP publicados
  totalApplicantsReceived: number,              // Total aplicantes recibidos

  // ✅ CAMPOS DE PAGO (REGULARES)
  hasActiveSubscription: boolean,       // ¿Tiene membresía activa?
  subscriptionId: string,               // ID de Stripe/PayPal
  subscriptionStartDate: Timestamp,     // Inicio de membresía
  subscriptionEndDate: Timestamp,       // Fin de membresía
  subscriptionStatus: "active" | "canceled" | "expired",

  hasAntiGhostingInsurance: boolean,    // ¿Tiene seguro anti-plantón?
  insurancePaymentId: string,           // ID de transacción del seguro
  insurancePurchaseDate: Timestamp,     // Cuándo compró el seguro
  insuranceAmount: number,              // 120 (en euros)

  // Otros campos
  location: { lat: number, lng: number },
  city: string,
  bio: string,
  reputation: "BRONCE" | "PLATA" | "ORO" | "PLATINO",
  emailVerified: boolean,
  isOnline: boolean,
  createdAt: Timestamp,
  lastActivity: Timestamp
}
```

### Collection: `subscriptions`

```javascript
{
  userId: string,
  subscriptionId: string,      // Stripe subscription ID
  plan: "monthly",             // Plan contratado
  amount: 29.99,              // Precio en euros
  currency: "EUR",
  status: "active" | "canceled" | "expired" | "past_due",
  currentPeriodStart: Timestamp,
  currentPeriodEnd: Timestamp,
  cancelAtPeriodEnd: boolean,
  paymentMethod: string,      // Stripe payment method ID
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

### Collection: `insurance_payments`

```javascript
{
  userId: string,
  paymentId: string,          // Stripe payment intent ID
  amount: 120,
  currency: "EUR",
  status: "succeeded" | "pending" | "failed",
  paymentMethod: "card" | "paypal" | "bank_transfer",
  purchaseDate: Timestamp,
  isActive: boolean,
  refunds: [
    {
      amount: number,
      reason: "ghosting_verified",
      date: Timestamp,
      appointmentId: string
    }
  ],
  createdAt: Timestamp
}
```

---

## 🎨 UI/UX de Pagos

### Banner de Estado de Pago

#### ✅ Estado: Todo Pagado (Hombre con Membresía + Seguro)

```html
┌─────────────────────────────────────────────────────────────┐
│ ✅ Cuenta Premium Activa                     👑 Premium      │
│    Membresía y seguro anti-plantón activos  🛡️ Asegurado   │
└─────────────────────────────────────────────────────────────┘
```
**Color:** Verde (#22c55e)

#### ⚠️ Estado: Pagos Pendientes (Hombre sin Membresía/Seguro)

```html
┌─────────────────────────────────────────────────────────────┐
│ ⚠️ Pagos Pendientes                                         │
│    Falta: Membresía mensual y Seguro anti-plantón (€120)   │
│                                     [Completar Pagos] →     │
└─────────────────────────────────────────────────────────────┘
```
**Color:** Amarillo (#eab308)

#### 🚫 Estado: Sin Acceso (Mujer - Oculto)

```
No se muestra banner (acceso gratis)
```

### Modal de Pago Requerido

```html
┌────────────────────────────────────────┐
│              🔒                         │
│                                        │
│    Membresía Requerida                 │
│                                        │
│  Para enviar solicitudes de cita       │
│  necesitas una membresía activa.       │
│                                        │
│  ┌──────────────────────────────────┐  │
│  │ Plan Mensual        €29.99/mes   │  │
│  │                                  │  │
│  │ ✅ Solicitudes ilimitadas        │  │
│  │ ✅ Chat con matches              │  │
│  │ ✅ Filtros avanzados             │  │
│  │ ✅ Soporte prioritario           │  │
│  └──────────────────────────────────┘  │
│                                        │
│  [💳 Contratar Membresía]     [✕]     │
└────────────────────────────────────────┘
```

---

## 🔄 Flujos de Usuario

### Flujo 1: Hombre Nuevo (Sin Pagos)

```
1. Registra cuenta
2. Verifica email
3. Completa perfil
4. Navega a "Buscar Usuarios"
5. ⚠️ Banner amarillo: "Pagos Pendientes"
6. Ve perfiles de mujeres
7. Click en "Enviar Solicitud" ❤️
8. 🔒 Modal: "Membresía Requerida"
9. Click "Contratar Membresía"
10. → Redirect a /webapp/suscripcion.html
11. Completa pago €29.99/mes
12. ✅ hasActiveSubscription = true
13. Vuelve a "Buscar Usuarios"
14. Intenta agendar cita
15. 🔒 Modal: "Seguro Anti-Plantón Requerido"
16. Click "Contratar Seguro"
17. → Redirect a /webapp/seguro.html
18. Completa pago €120
19. ✅ hasAntiGhostingInsurance = true
20. Vuelve a "Buscar Usuarios"
21. ✅ Banner verde: "Cuenta Premium Activa"
22. 🎉 Puede usar todas las funcionalidades
```

### Flujo 2: Hombre con Membresía (Falta Seguro)

```
1. Ya tiene membresía activa
2. Puede enviar solicitudes ✅
3. Puede chatear ✅
4. Match aceptado
5. Intenta agendar cita
6. 🔒 Validación: falta seguro
7. Modal: "Seguro Anti-Plantón Requerido"
8. Contrata seguro €120
9. Ahora puede agendar citas ✅
```

### Flujo 3: Mujer (Acceso Gratis)

```
1. Registra cuenta
2. Verifica email
3. Completa perfil
4. Navega a "Buscar Usuarios"
5. ✅ Sin banner de pagos
6. Puede hacer todo gratis:
   - Enviar solicitudes ✅
   - Chatear ✅
   - Agendar citas ✅
7. Sin restricciones
```

---

## 📈 Métricas de Negocio

### KPIs a Monitorear

```javascript
// 1. Conversión a Membresía
const conversionRate =
  (usuariosPagaron / usuariosRegistrados) * 100;
// Target: >40%

// 2. Conversión a Seguro
const insuranceRate =
  (usuariosConSeguro / usuariosConMembresia) * 100;
// Target: >80%

// 3. Lifetime Value (LTV)
const LTV =
  (membresiaPromedio * mesesRetencion) + seguro;
// Example: (29.99 * 6) + 120 = €299.94

// 4. Churn Rate
const churn =
  (cancelaciones / usuariosActivos) * 100;
// Target: <10% mensual

// 5. Revenue Per User (RPU)
const RPU =
  totalRevenue / totalUsuarios;
```

### Analytics de Eventos

```javascript
// Tracking de eventos de pago

// Vista de modal de pago
analytics.logEvent('payment_modal_shown', {
  reason: 'membership' | 'insurance',
  user_gender: 'masculino',
  user_age: number
});

// Click en "Contratar"
analytics.logEvent('payment_cta_clicked', {
  product: 'membership' | 'insurance',
  amount: number
});

// Pago completado
analytics.logEvent('payment_completed', {
  product: 'membership' | 'insurance',
  amount: number,
  payment_method: string
});

// Pago cancelado
analytics.logEvent('payment_canceled', {
  step: 'modal' | 'checkout' | 'payment'
});

// Funcionalidad bloqueada
analytics.logEvent('feature_blocked', {
  feature: 'send_request' | 'chat' | 'schedule_date',
  missing: 'membership' | 'insurance'
});
```

---

## 🚀 Migración para Género Dual

### Preparación para Cobrar a Ambos Géneros

Cuando se decida cobrar también a las mujeres:

#### 1. Actualizar Lógica de Validación

```javascript
// ANTES (solo hombres)
const userMustPay = currentUserData.gender === 'masculino';

// DESPUÉS (ambos géneros)
const userMustPay = true; // Todos pagan
```

#### 2. Comunicación con Usuarias

```
1. Email 30 días antes: "Cambios en el modelo de precios"
2. Email 15 días antes: "Recordatorio: nuevos precios"
3. Email 7 días antes: "Última semana de acceso gratis"
4. Banner en app: "Tu acceso gratis termina en X días"
5. Día del cambio: Modal informativo al login
```

#### 3. Plan de Precios para Mujeres

**Opción A: Mismo precio**
```
• Membresía: €29.99/mes
• Seguro: €120
```

**Opción B: Precio diferenciado**
```
• Membresía: €19.99/mes (33% descuento)
• Seguro: €80 (33% descuento)
```

**Opción C: Freemium**
```
• Básico: Gratis (3 solicitudes/mes)
• Premium: €29.99/mes (ilimitado)
• Seguro: €120 (obligatorio para agendar)
```

#### 4. Grandfathering

```
Usuarias existentes antes del cambio:
• 3 meses gratis de membresía
• 50% descuento en seguro (€60 en vez de €120)
• Válido por tiempo limitado
```

---

## 💡 Recomendaciones de Implementación

### Seguridad

```javascript
// ❌ MAL: Validar solo en frontend
if (user.hasActiveSubscription) {
  sendMatch();
}

// ✅ BIEN: Validar también en backend
// Cloud Function
exports.sendMatchRequest = functions.https.onCall(async (data, context) => {
  const userId = context.auth.uid;
  const userData = await admin.firestore()
    .collection('users').doc(userId).get();

  // Verificar género y pagos
  if (userData.gender === 'masculino') {
    if (!userData.hasActiveSubscription) {
      throw new functions.https.HttpsError(
        'failed-precondition',
        'Membership required'
      );
    }

    if (!userData.hasAntiGhostingInsurance) {
      throw new functions.https.HttpsError(
        'failed-precondition',
        'Insurance required'
      );
    }
  }

  // Proceder con la solicitud
  return createMatchRequest(data);
});
```

### Webhooks de Stripe

```javascript
// Actualizar estado de membresía automáticamente
exports.stripeWebhook = functions.https.onRequest(async (req, res) => {
  const event = req.body;

  switch (event.type) {
    case 'customer.subscription.created':
      await updateUserSubscription(event.data.object, 'active');
      break;

    case 'customer.subscription.deleted':
      await updateUserSubscription(event.data.object, 'canceled');
      break;

    case 'invoice.payment_failed':
      await updateUserSubscription(event.data.object, 'past_due');
      await notifyUserPaymentFailed(event.data.object);
      break;
  }

  res.json({ received: true });
});
```

### Tests de Validación

```javascript
describe('Payment Validation', () => {
  it('should block male users without membership', async () => {
    const user = {
      gender: 'masculino',
      hasActiveSubscription: false
    };

    const result = checkPaymentStatus(user);

    expect(result.canUse).toBe(false);
    expect(result.reason).toBe('membership');
  });

  it('should block male users without insurance', async () => {
    const user = {
      gender: 'masculino',
      hasActiveSubscription: true,
      hasAntiGhostingInsurance: false
    };

    const result = checkPaymentStatus(user);

    expect(result.canUse).toBe(false);
    expect(result.reason).toBe('insurance');
  });

  it('should allow female users without payment', async () => {
    const user = {
      gender: 'femenino',
      hasActiveSubscription: false,
      hasAntiGhostingInsurance: false
    };

    const result = checkPaymentStatus(user);

    expect(result.canUse).toBe(true);
  });
});
```

---

## 📋 Checklist de Implementación

### Fase 1: Validación en Frontend ✅
- [x] Crear función `checkPaymentStatus()`
- [x] Modal de pago requerido
- [x] Banner de estado de pago
- [x] Validar en envío de solicitudes
- [x] Validar en agendamiento de citas
- [x] Botones de redirección a pago

### Fase 2: Backend (Pendiente)
- [ ] Cloud Functions para validar pagos
- [ ] Webhooks de Stripe
- [ ] Actualización automática de estados
- [ ] Emails de notificación
- [ ] Sistema de reembolsos

### Fase 3: Pagos (Pendiente)
- [ ] Integración con Stripe
- [ ] Página de suscripción (/webapp/suscripcion.html)
- [ ] Página de seguro (/webapp/seguro.html)
- [ ] Procesamiento de pagos
- [ ] Confirmaciones

### Fase 4: Testing (Pendiente)
- [ ] Tests unitarios de validación
- [ ] Tests de integración con Stripe
- [ ] Tests E2E del flujo completo
- [ ] Tests de edge cases

### Fase 5: Producción (Pendiente)
- [ ] Documentación de API
- [ ] Monitoreo de errores
- [ ] Analytics de conversión
- [ ] A/B testing de precios
- [ ] Soporte para usuarios

---

## 🎯 Conclusión

El sistema de **membresía + seguro anti-plantón** es el núcleo del modelo de negocio de TuCitaSegura. Esta implementación garantiza:

✅ **Seriedad**: Solo usuarios comprometidos
✅ **Seguridad**: Verificación y garantías
✅ **Revenue**: Monetización sostenible
✅ **Calidad**: Mejor experiencia para todos
✅ **Escalabilidad**: Preparado para crecer

**Estado Actual:**
- Hombres: Membresía (€29.99/mes) + Seguro (€120) ✅
- Mujeres: Acceso gratis (temporalmente) ✅
- Validaciones: Frontend completo ✅
- Backend: Pendiente implementación ⏳

**Próximo Paso:** Integrar Stripe y completar flujo de pagos.
