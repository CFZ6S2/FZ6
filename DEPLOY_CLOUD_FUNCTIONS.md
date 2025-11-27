# 🚀 Guía de Despliegue - Cloud Functions

Esta guía te ayudará a desplegar las 22 Cloud Functions de TuCitaSegura.

---

## 📋 Funciones Incluidas

### **Custom Claims (3)**
- `onUserDocCreate` - Establece custom claims al crear usuario
- `onUserDocUpdate` - Sincroniza cambios de role/gender
- `updateUserClaims` - Actualización manual de claims (admin only)

### **Payment Webhooks (2)**
- `stripeWebhook` - Maneja eventos de Stripe (subscriptions, pagos)
- `paypalWebhook` - Maneja eventos de PayPal (opcional)

### **Push Notifications (8)**
- `onMatchCreated` - Notifica nueva solicitud de match
- `onMatchAccepted` - Notifica match aceptado
- `onMessageCreated` - Notifica nuevo mensaje
- `onAppointmentConfirmed` - Notifica cita confirmada
- `sendAppointmentReminders` - Recordatorio 1 hora antes (scheduled)
- `onVIPEventPublished` - Notifica nuevo evento VIP a mujeres
- `onSOSAlert` - Maneja alertas SOS
- `sendTestNotification` - Testing de notificaciones

### **Insurance Management (3)**
- `captureInsuranceAuthorization` - Cobra seguro por plantón
- `voidInsuranceAuthorization` - Libera seguro después de cita
- `getInsuranceAuthorizationStatus` - Verifica estado de autorización

### **Utilities (6)**
- `apiProxy` - Proxy a backend de Railway
- `syncChatACL` - Sincroniza permisos de archivos en Storage
- `getUserClaims` - Obtiene custom claims de usuario
- Helper functions (payment management, notifications)

---

## 🔐 PASO 1: Configurar Variables Secretas

### **Método A: Firebase Functions Config (Recomendado para producción)**

En tu terminal de Windows:

```bash
# Stripe (REQUERIDO)
firebase functions:config:set stripe.secret_key="sk_test_YOUR_STRIPE_SECRET_KEY_HERE"

# ⚠️ IMPORTANTE: Necesitas obtener el webhook secret desde Stripe Dashboard
# Ve a: https://dashboard.stripe.com/test/webhooks
# Crea un webhook endpoint apuntando a: https://us-central1-tuscitasseguras-2d1a6.cloudfunctions.net/stripeWebhook
# Copia el "Signing secret" (empieza con whsec_...)
firebase functions:config:set stripe.webhook_secret="whsec_YOUR_WEBHOOK_SECRET_HERE"

# Backend API URL
firebase functions:config:set api.base_url="https://t2c06-production.up.railway.app"

# PayPal (OPCIONAL - solo si usarás PayPal)
firebase functions:config:set paypal.mode="sandbox"
firebase functions:config:set paypal.client_id="YOUR_PAYPAL_CLIENT_ID"
firebase functions:config:set paypal.secret="YOUR_PAYPAL_SECRET"
firebase functions:config:set paypal.webhook_id="YOUR_PAYPAL_WEBHOOK_ID"
```

### **Método B: Archivo .env (Solo para testing local)**

```bash
cd functions
cp .env.example .env
```

Edita `functions/.env` con tus valores reales:

```bash
STRIPE_SECRET_KEY=sk_test_YOUR_STRIPE_SECRET_KEY_HERE
STRIPE_WEBHOOK_SECRET=whsec_YOUR_WEBHOOK_SECRET_HERE
API_BASE_URL=https://t2c06-production.up.railway.app
```

⚠️ **NUNCA** commitees el archivo `.env` a Git.

---

## 📦 PASO 2: Instalar Dependencias

```bash
cd functions
npm install
cd ..
```

Esto instalará:
- `firebase-functions` - SDK de Cloud Functions
- `firebase-admin` - Admin SDK para Firestore/Auth
- `axios` - HTTP client
- `stripe` - Stripe SDK

---

## 🚀 PASO 3: Desplegar Funciones

```bash
firebase deploy --only functions
```

Este comando:
- Despliega las 22 funciones a Firebase Cloud Functions
- Configura los triggers automáticamente (Firestore, webhooks, scheduled)
- Tarda ~5-10 minutos

### **Desplegar solo algunas funciones (opcional):**

```bash
# Solo funciones de custom claims
firebase deploy --only functions:onUserDocCreate,functions:onUserDocUpdate

# Solo webhooks de pagos
firebase deploy --only functions:stripeWebhook,functions:paypalWebhook

# Solo notificaciones
firebase deploy --only functions:onMatchCreated,functions:onMessageCreated
```

---

## 🔗 PASO 4: Configurar Stripe Webhooks

1. **Ve a Stripe Dashboard:**
   ```
   https://dashboard.stripe.com/test/webhooks
   ```

2. **Crea un nuevo webhook endpoint:**
   - Click "Add endpoint"
   - URL: `https://us-central1-tuscitasseguras-2d1a6.cloudfunctions.net/stripeWebhook`

3. **Selecciona estos eventos:**
   ```
   customer.subscription.created
   customer.subscription.updated
   customer.subscription.deleted
   payment_intent.succeeded
   payment_intent.payment_failed
   invoice.payment_failed
   invoice.payment_succeeded
   ```

4. **Copia el "Signing secret":**
   - Empieza con `whsec_...`
   - Configúralo con:
   ```bash
   firebase functions:config:set stripe.webhook_secret="whsec_..."
   ```

5. **Re-despliega:**
   ```bash
   firebase deploy --only functions:stripeWebhook
   ```

---

## ✅ PASO 5: Verificar Despliegue

### **Ver funciones desplegadas:**

```bash
firebase functions:list
```

### **Ver logs en tiempo real:**

```bash
firebase functions:log --only onUserDocCreate
```

### **Ver logs de todas las funciones:**

```bash
firebase functions:log
```

### **Testear función manualmente:**

Desde la consola de Firebase:
```
https://console.firebase.google.com/project/tuscitasseguras-2d1a6/functions
```

---

## 🧪 PASO 6: Testing

### **Test 1: Custom Claims**

Crea un usuario nuevo y verifica que se establezcan los custom claims:

```javascript
// En tu app frontend
const user = await firebase.auth().currentUser;
const idTokenResult = await user.getIdTokenResult();
console.log('Custom claims:', idTokenResult.claims);
// Debería mostrar: { role: 'regular', gender: 'masculino' o 'femenino' }
```

### **Test 2: Push Notifications**

```javascript
// Llamar función de test desde tu app
const testNotification = firebase.functions().httpsCallable('sendTestNotification');
const result = await testNotification();
console.log(result.data); // { success: true, message: 'Test notification sent' }
```

### **Test 3: Stripe Webhook**

En Stripe Dashboard → Webhooks → Click en tu webhook → "Send test webhook"

Verifica los logs:
```bash
firebase functions:log --only stripeWebhook
```

---

## 🔧 Troubleshooting

### **Error: "Missing required environment variables"**

Solución:
```bash
firebase functions:config:get
# Verifica que todas las variables estén configuradas
```

### **Error: "Function deployment failed"**

Solución:
```bash
# Ver detalles del error
firebase deploy --only functions --debug

# Verificar que node_modules esté instalado
cd functions
npm install
cd ..
```

### **Error: "Stripe webhook signature verification failed"**

Solución:
- Verifica que el `STRIPE_WEBHOOK_SECRET` esté correctamente configurado
- Usa el "Signing secret" del webhook en Stripe Dashboard (no la API key)

### **Error: "Permission denied" en custom claims**

Solución:
- Las funciones usan Firebase Admin SDK que tiene permisos completos
- Verifica que `firebase-admin` esté inicializado correctamente en `functions/index.js`

---

## 📊 Monitoreo

### **Ver métricas de funciones:**

```
https://console.firebase.google.com/project/tuscitasseguras-2d1a6/functions/metrics
```

Métricas disponibles:
- Invocaciones por día
- Tiempo de ejecución
- Errores
- Costo estimado

### **Alertas recomendadas:**

1. **Tasa de errores > 5%** → Investigar
2. **Tiempo de ejecución > 30s** → Optimizar
3. **Invocaciones > 10,000/día** → Revisar costos

---

## 💰 Costos Estimados

Firebase Cloud Functions pricing:
- **Primeros 2 millones de invocaciones/mes**: GRATIS
- **GB-segundos**: GRATIS hasta 400,000
- **GHz-segundos**: GRATIS hasta 200,000

Para tu app (estimado con 1,000 usuarios activos):
- Custom claims: ~3,000 invocaciones/mes → **GRATIS**
- Push notifications: ~30,000 invocaciones/mes → **GRATIS**
- Stripe webhooks: ~500 invocaciones/mes → **GRATIS**

**Costo mensual estimado: $0 - $5 USD**

---

## 🔐 Seguridad

### **Claves nunca deben estar en:**
❌ Git (ni siquiera en commits antiguos)
❌ Frontend code
❌ Archivos públicos
❌ Logs o consola

### **Claves deben estar en:**
✅ Firebase Functions Config (`firebase functions:config:set`)
✅ Variables de entorno del servidor
✅ Archivo `.env` (solo local, nunca en git)

### **Verificar que .gitignore incluye:**
```
functions/.env
functions/.env.local
backend/.env
**/firebase-credentials.json
```

---

## 📝 Siguiente Paso

Una vez desplegadas las funciones, configura el frontend para usarlas:

1. **Agregar Firebase SDK al frontend**
2. **Llamar funciones callable desde la app**
3. **Configurar FCM tokens para push notifications**
4. **Integrar Stripe Elements para pagos**

Ver: `FRONTEND_INTEGRATION.md` (próximo documento)

---

## ✅ Checklist Final

- [ ] Variables secretas configuradas en Firebase
- [ ] Dependencias instaladas (`npm install`)
- [ ] Funciones desplegadas (`firebase deploy --only functions`)
- [ ] Stripe webhook configurado y verificado
- [ ] Logs funcionando correctamente
- [ ] Test de notificación push exitoso
- [ ] Custom claims funcionando en usuarios nuevos
- [ ] .env agregado a .gitignore

---

**¿Problemas?** Revisa los logs:
```bash
firebase functions:log --limit 50
```
