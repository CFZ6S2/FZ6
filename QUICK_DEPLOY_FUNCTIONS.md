# ⚡ Despliegue Rápido - Cloud Functions

Ejecuta estos comandos **EN TU TERMINAL LOCAL** (Windows):

---

## 🔐 Paso 1: Configurar Stripe (1 vez)

```bash
# Configurar Stripe Secret Key
# ⚠️ REEMPLAZA sk_test_... con tu clave real de Stripe Dashboard
firebase functions:config:set stripe.secret_key="sk_test_YOUR_STRIPE_SECRET_KEY_HERE"

# ⚠️ IMPORTANTE: Configurar Webhook Secret
# 1. Ve a: https://dashboard.stripe.com/test/webhooks
# 2. Click "Add endpoint"
# 3. URL: https://us-central1-tuscitasseguras-2d1a6.cloudfunctions.net/stripeWebhook
# 4. Eventos: customer.subscription.*, payment_intent.*, invoice.*
# 5. Copia el "Signing secret" (empieza con whsec_...)
# 6. Ejecuta:
firebase functions:config:set stripe.webhook_secret="whsec_TU_WEBHOOK_SECRET_AQUI"

# Configurar URL del backend
firebase functions:config:set api.base_url="https://t2c06-production.up.railway.app"
```

---

## 📦 Paso 2: Instalar Dependencias

```bash
cd functions
npm install
cd ..
```

---

## 🚀 Paso 3: Desplegar

```bash
firebase deploy --only functions
```

**Tiempo estimado:** 5-10 minutos

---

## ✅ Paso 4: Verificar

```bash
# Ver funciones desplegadas
firebase functions:list

# Ver logs
firebase functions:log --limit 20
```

---

## 🧪 Paso 5: Testing

### **Test A: Custom Claims**

Crea un usuario en tu app y verifica:

```javascript
// En tu frontend
const idToken = await firebase.auth().currentUser.getIdTokenResult();
console.log(idToken.claims);
// Debería mostrar: { role: 'regular', gender: 'masculino' o 'femenino' }
```

### **Test B: Push Notification**

```javascript
// Llamar función de test
const sendTest = firebase.functions().httpsCallable('sendTestNotification');
const result = await sendTest();
console.log(result.data); // { success: true }
```

### **Test C: Stripe Webhook**

1. Ve a: https://dashboard.stripe.com/test/webhooks
2. Click en tu webhook
3. Click "Send test webhook"
4. Selecciona `customer.subscription.created`
5. Click "Send test event"

Verifica logs:
```bash
firebase functions:log --only stripeWebhook --limit 5
```

---

## 🔍 Ver Estado

### **Ver configuración actual:**

```bash
firebase functions:config:get
```

Debería mostrar:
```json
{
  "stripe": {
    "secret_key": "sk_test_51R31JLHdpQPdr46s...",
    "webhook_secret": "whsec_..."
  },
  "api": {
    "base_url": "https://t2c06-production.up.railway.app"
  }
}
```

### **Ver funciones en consola:**

```
https://console.firebase.google.com/project/tuscitasseguras-2d1a6/functions
```

---

## ⚠️ Seguridad

### **NUNCA commitees:**
- ❌ Las claves que te compartí (`sk_test_...`)
- ❌ El webhook secret (`whsec_...`)
- ❌ Archivos `.env` con secrets

### **Las claves están seguras en:**
- ✅ Firebase Functions Config (cloud)
- ✅ No están en Git
- ✅ No están accesibles desde el frontend

---

## 🐛 Troubleshooting

### **Error: "Missing required environment variables"**

```bash
firebase functions:config:get
# Si está vacío, vuelve a ejecutar el Paso 1
```

### **Error: "Deployment failed"**

```bash
# Ver detalles
firebase deploy --only functions --debug

# Reinstalar dependencias
cd functions
rm -rf node_modules package-lock.json
npm install
cd ..
firebase deploy --only functions
```

### **Error: "Permission denied"**

```bash
firebase login --reauth
```

---

## 📊 Funciones Desplegadas (22 total)

| Categoría | Funciones | Trigger |
|-----------|-----------|---------|
| **Custom Claims** | onUserDocCreate<br>onUserDocUpdate<br>updateUserClaims | Firestore<br>Firestore<br>Callable |
| **Webhooks** | stripeWebhook<br>paypalWebhook | HTTP<br>HTTP |
| **Notificaciones** | onMatchCreated<br>onMatchAccepted<br>onMessageCreated<br>onAppointmentConfirmed<br>sendAppointmentReminders<br>onVIPEventPublished<br>onSOSAlert<br>sendTestNotification | Firestore<br>Firestore<br>Firestore<br>Firestore<br>Scheduled (hourly)<br>Firestore<br>Firestore<br>Callable |
| **Insurance** | captureInsuranceAuthorization<br>voidInsuranceAuthorization<br>getInsuranceAuthorizationStatus | Callable<br>Callable<br>Callable |
| **Utilidades** | apiProxy<br>syncChatACL<br>getUserClaims | HTTP<br>Firestore<br>Callable |

---

## 💰 Costo Estimado

Con el plan Spark (gratis):
- ✅ **Primeros 2M invocaciones/mes**: GRATIS
- ✅ **400K GB-segundos/mes**: GRATIS

**Costo esperado:** $0/mes (dentro del free tier)

---

## 📝 Próximos Pasos

Una vez desplegadas las funciones:

1. ✅ Configurar Stripe webhook (ver Paso 1)
2. ✅ Testear custom claims (crear usuario)
3. ✅ Testear notificaciones push
4. ⏳ Integrar Stripe en frontend
5. ⏳ Configurar FCM tokens para push

Ver guía completa: `DEPLOY_CLOUD_FUNCTIONS.md`

---

**¿Listo para desplegar?** Ejecuta:

```bash
firebase deploy --only functions
```

🎉 ¡En 10 minutos tendrás 22 Cloud Functions activas!
