# 🎨 Guía de Integración Frontend - TuCitaSegura

Esta guía te ayudará a configurar y usar todas las integraciones del frontend.

---

## 📋 Estado Actual

### **✅ Ya Configurado:**
- ✅ Firebase SDK (Auth, Firestore, Storage, Functions)
- ✅ 56 páginas HTML funcionalesStripe publishable key actualizada
- ✅ VAPID key para push notifications
- ✅ Estructura de pagos lista

### **⏳ Pendiente de Configurar:**
- Push notifications (FCM tokens)
- Crear productos en Stripe Dashboard
- Cloud Functions adicionales para pagos

---

## 🔐 1. Stripe Integration

### **Configuración Completa:**

La clave pública de Stripe ya está configurada en `/webapp/js/stripe-integration.js`:

```javascript
const STRIPE_PUBLISHABLE_KEY = 'pk_test_51R31JLHdpQPdr46sNZC55TNFxpuiexwtSMHVYzukiU3936dBBsnG8kYzfx9tqUNItjhpXGgJ6ulALdSeJ6d4ji1T00OtMh8MXV';
```

### **Crear Productos en Stripe:**

1. **Ve a Stripe Dashboard:**
   ```
   https://dashboard.stripe.com/test/products
   ```

2. **Crea el producto de Membresía Premium:**
   - Click "Add product"
   - Nombre: "Membresía Premium TuCitaSegura"
   - Descripción: "Acceso completo a chat ilimitado, citas y eventos VIP"
   - Pricing: €30.00 EUR / mes (recurring)
   - Click "Save product"

3. **Copia el Price ID:**
   - Después de crear, verás un ID como: `price_...`
   - Actualiza en `/webapp/js/stripe-integration.js` línea 209:
   ```javascript
   priceId: 'price_TU_PRICE_ID_AQUI'
   ```

4. **Crea el producto de Seguro Anti-Plantón:**
   - Nombre: "Seguro Anti-Plantón"
   - Descripción: "Protección de €120 contra plantones"
   - Pricing: €120.00 EUR (one-time payment)

---

## 💰 2. PayPal Integration

Tu frontend ya tiene soporte para PayPal. Las credenciales están configuradas en Cloud Functions.

### **Configuración en Frontend:**

Crea un archivo `/webapp/js/paypal-config.js`:

```javascript
/**
 * PayPal Configuration for TuCitaSegura
 */

// PayPal Client ID (public, safe to expose)
export const PAYPAL_CLIENT_ID = 'AUYz2zdljYOCUhGYqKYDHiV7SxJyuGiCda7Q7JH7VqKK10U7DP5C83374uL6VyXG2ja4x69mpVVQKTrO';

// PayPal mode
export const PAYPAL_MODE = 'sandbox'; // Change to 'live' for production

/**
 * Load PayPal SDK
 * @returns {Promise<void>}
 */
export async function loadPayPalSDK() {
  return new Promise((resolve, reject) => {
    if (window.paypal) {
      resolve();
      return;
    }

    const script = document.createElement('script');
    script.src = `https://www.paypal.com/sdk/js?client-id=${PAYPAL_CLIENT_ID}&currency=EUR&intent=capture&vault=true`;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load PayPal SDK'));
    document.body.appendChild(script);
  });
}

/**
 * Create subscription with PayPal
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Result
 */
export async function createPayPalSubscription(userId) {
  try {
    await loadPayPalSDK();

    return new Promise((resolve, reject) => {
      window.paypal.Buttons({
        createSubscription: async function(data, actions) {
          // Call Cloud Function to create subscription plan
          const createPlanFunction = firebase.functions().httpsCallable('createPayPalSubscriptionPlan');
          const result = await createPlanFunction({ userId });

          if (!result.data.success) {
            reject(new Error(result.data.error));
            return;
          }

          return actions.subscription.create({
            plan_id: result.data.planId,
            custom_id: userId // Important: Track user ID
          });
        },
        onApprove: async function(data) {
          console.log('Subscription approved:', data.subscriptionID);
          resolve({
            success: true,
            subscriptionId: data.subscriptionID
          });
        },
        onError: function(err) {
          console.error('PayPal error:', err);
          reject(err);
        }
      }).render('#paypal-button-container');
    });

  } catch (error) {
    console.error('Error creating PayPal subscription:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Create one-time payment (Insurance)
 * @param {string} userId - User ID
 * @param {number} amount - Amount in EUR
 * @param {string} description - Payment description
 * @returns {Promise<Object>} Result
 */
export async function createPayPalPayment(userId, amount, description) {
  try {
    await loadPayPalSDK();

    return new Promise((resolve, reject) => {
      window.paypal.Buttons({
        createOrder: function(data, actions) {
          return actions.order.create({
            purchase_units: [{
              amount: {
                currency_code: 'EUR',
                value: amount.toFixed(2)
              },
              description: description,
              custom_id: userId
            }]
          });
        },
        onApprove: async function(data, actions) {
          const order = await actions.order.capture();
          console.log('Payment captured:', order);

          resolve({
            success: true,
            orderId: order.id,
            paymentId: order.purchase_units[0].payments.captures[0].id
          });
        },
        onError: function(err) {
          console.error('PayPal error:', err);
          reject(err);
        }
      }).render('#paypal-button-container');
    });

  } catch (error) {
    console.error('Error creating PayPal payment:', error);
    return {
      success: false,
      error: error.message
    };
  }
}
```

---

## 🔔 3. Push Notifications (FCM)

### **Configuración en Frontend:**

Crea un archivo `/webapp/js/push-notifications.js`:

```javascript
/**
 * Push Notifications with Firebase Cloud Messaging
 */

import { getMessaging, getToken, onMessage } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging.js";
import { app } from "./firebase-config.js";

// VAPID public key (already in firebase-config.js)
const VAPID_KEY = 'BJW5I1B7KSEvM1q8FuwNokyu4sgoUy0u93C2XSQ8kpDVUdw6jv1UgYo9k_lIRjs-Rpte-YUkFqM7bbOYAD32T-w';

const messaging = getMessaging(app);

/**
 * Request notification permission and get FCM token
 * @param {string} userId - User ID
 * @returns {Promise<string|null>} FCM token
 */
export async function requestNotificationPermission(userId) {
  try {
    const permission = await Notification.requestPermission();

    if (permission === 'granted') {
      console.log('Notification permission granted');

      // Get FCM token
      const token = await getToken(messaging, {
        vapidKey: VAPID_KEY
      });

      if (token) {
        console.log('FCM Token:', token);

        // Save token to Firestore
        await saveTokenToFirestore(userId, token);

        return token;
      } else {
        console.log('No registration token available');
        return null;
      }
    } else {
      console.log('Notification permission denied');
      return null;
    }

  } catch (error) {
    console.error('Error getting notification permission:', error);
    return null;
  }
}

/**
 * Save FCM token to Firestore
 * @param {string} userId - User ID
 * @param {string} token - FCM token
 */
async function saveTokenToFirestore(userId, token) {
  try {
    const db = firebase.firestore();
    const userRef = db.collection('users').doc(userId);

    // Get current tokens
    const userDoc = await userRef.get();
    const currentTokens = userDoc.data()?.fcmTokens || [];

    // Add token if not already in array
    if (!currentTokens.includes(token)) {
      await userRef.update({
        fcmTokens: firebase.firestore.FieldValue.arrayUnion(token),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      });

      console.log('FCM token saved to Firestore');
    }

  } catch (error) {
    console.error('Error saving token to Firestore:', error);
  }
}

/**
 * Setup foreground message listener
 * @param {Function} callback - Callback function for received messages
 */
export function setupMessageListener(callback) {
  onMessage(messaging, (payload) => {
    console.log('Message received in foreground:', payload);

    const { title, body, icon } = payload.notification;

    // Show browser notification
    if (Notification.permission === 'granted') {
      new Notification(title, {
        body: body,
        icon: icon || '/webapp/assets/icon-192x192.png',
        badge: '/webapp/assets/badge-72x72.png',
        data: payload.data
      });
    }

    // Call custom callback
    if (callback) {
      callback(payload);
    }
  });
}

/**
 * Test push notification
 * @returns {Promise<Object>} Result
 */
export async function sendTestNotification() {
  try {
    const sendTest = firebase.functions().httpsCallable('sendTestNotification');
    const result = await sendTest();

    return result.data;

  } catch (error) {
    console.error('Error sending test notification:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Remove FCM token when user logs out
 * @param {string} userId - User ID
 * @param {string} token - FCM token
 */
export async function removeTokenFromFirestore(userId, token) {
  try {
    const db = firebase.firestore();
    const userRef = db.collection('users').doc(userId);

    await userRef.update({
      fcmTokens: firebase.firestore.FieldValue.arrayRemove(token)
    });

    console.log('FCM token removed from Firestore');

  } catch (error) {
    console.error('Error removing token:', error);
  }
}
```

### **Archivo de Service Worker:**

Crea `/webapp/firebase-messaging-sw.js`:

```javascript
// Firebase Messaging Service Worker

importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');

// Firebase config
firebase.initializeApp({
  apiKey: "AIzaSyAgFcoHwoBpo80rlEHL2hHVZ2DqtjWXh2s",
  authDomain: "tuscitasseguras-2d1a6.firebaseapp.com",
  projectId: "tuscitasseguras-2d1a6",
  storageBucket: "tuscitasseguras-2d1a6.firebasestorage.app",
  messagingSenderId: "924208562587",
  appId: "1:924208562587:web:5291359426fe390b36213e"
});

const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log('Received background message:', payload);

  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: payload.notification.icon || '/webapp/assets/icon-192x192.png',
    badge: '/webapp/assets/badge-72x72.png',
    data: payload.data
  };

  return self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked:', event);

  event.notification.close();

  const data = event.notification.data;
  let url = '/webapp/';

  // Route based on notification type
  if (data.type === 'match') {
    url = '/webapp/matches.html';
  } else if (data.type === 'message') {
    url = `/webapp/chat.html?conversation=${data.conversationId}`;
  } else if (data.type === 'appointment') {
    url = `/webapp/cita-detalle.html?id=${data.appointmentId}`;
  }

  event.waitUntil(
    clients.openWindow(url)
  );
});
```

### **Registrar Service Worker:**

Añade a tu página principal (después de cargar Firebase):

```javascript
// Register service worker for push notifications
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/webapp/firebase-messaging-sw.js')
    .then((registration) => {
      console.log('Service Worker registered:', registration);
    })
    .catch((error) => {
      console.error('Service Worker registration failed:', error);
    });
}
```

---

## 🔧 4. Usar Cloud Functions desde Frontend

### **Custom Claims:**

```javascript
// Get current user's custom claims
import { auth } from './firebase-config.js';

async function getUserClaims() {
  const user = auth.currentUser;
  const idTokenResult = await user.getIdTokenResult();

  console.log('Custom claims:', idTokenResult.claims);
  // { role: 'regular', gender: 'masculino', hasActiveSubscription: false, ... }

  return idTokenResult.claims;
}

// Check if user has active subscription
async function hasActiveSubscription() {
  const claims = await getUserClaims();
  return claims.hasActiveSubscription === true;
}
```

### **Llamar Cloud Functions:**

```javascript
import { functions } from './firebase-config.js';
import { httpsCallable } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-functions.js";

// Example: Get user claims
const getUserClaimsFunction = httpsCallable(functions, 'getUserClaims');
const result = await getUserClaimsFunction({ userId: 'some-user-id' });
console.log(result.data);

// Example: Send test notification
const sendTestFunction = httpsCallable(functions, 'sendTestNotification');
const testResult = await sendTestFunction();
console.log(testResult.data);

// Example: Update user claims (admin only)
const updateClaimsFunction = httpsCallable(functions, 'updateUserClaims');
const updateResult = await updateClaimsFunction({
  userId: 'some-user-id',
  role: 'admin',
  gender: 'masculino'
});
```

---

## 📱 5. Ejemplo Completo de Uso

### **Página de Registro con Push Notifications:**

```html
<!DOCTYPE html>
<html>
<head>
  <title>Registro - TuCitaSegura</title>
  <script type="module">
    import { auth, db } from './js/firebase-config.js';
    import { createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
    import { doc, setDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
    import { requestNotificationPermission } from './js/push-notifications.js';

    async function register(email, password, birthDate, gender) {
      try {
        // 1. Create Firebase Auth user
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const userId = userCredential.user.uid;

        // 2. Create Firestore user document
        await setDoc(doc(db, 'users', userId), {
          email: email,
          birthDate: birthDate,
          gender: gender,
          userRole: 'regular',
          createdAt: new Date()
        });

        // 3. Request push notification permission
        await requestNotificationPermission(userId);

        // 4. Redirect to complete profile
        window.location.href = '/webapp/complete-profile.html';

      } catch (error) {
        console.error('Registration error:', error);
        alert('Error en el registro: ' + error.message);
      }
    }
  </script>
</head>
<body>
  <!-- Tu formulario de registro aquí -->
</body>
</html>
```

---

## ✅ Checklist de Integración

### **Stripe:**
- [x] Clave pública configurada
- [ ] Crear productos en Stripe Dashboard
- [ ] Actualizar Price IDs en código
- [ ] Probar flujo de pago

### **PayPal:**
- [ ] Crear archivo paypal-config.js
- [ ] Agregar botones PayPal a páginas de pago
- [ ] Probar flujo de pago

### **Push Notifications:**
- [ ] Crear push-notifications.js
- [ ] Crear firebase-messaging-sw.js
- [ ] Registrar service worker
- [ ] Solicitar permisos en login/registro
- [ ] Probar con sendTestNotification

### **Cloud Functions:**
- [ ] Verificar que todas las funciones estén desplegadas
- [ ] Probar llamadas desde frontend
- [ ] Verificar custom claims

---

## 🐛 Troubleshooting

### **Push Notifications no funcionan:**

1. Verifica que el service worker esté registrado:
   ```javascript
   navigator.serviceWorker.getRegistrations().then(console.log);
   ```

2. Verifica permisos:
   ```javascript
   console.log('Notification permission:', Notification.permission);
   ```

3. Verifica que el token se guardó:
   ```javascript
   const userDoc = await firebase.firestore().collection('users').doc(userId).get();
   console.log('FCM tokens:', userDoc.data().fcmTokens);
   ```

### **Stripe no carga:**

1. Verifica que incluiste el script de Stripe en tu HTML:
   ```html
   <script src="https://js.stripe.com/v3/"></script>
   ```

2. Verifica la consola del navegador para errores

---

## 📚 Próximos Pasos

1. **Crear productos en Stripe Dashboard**
2. **Implementar archivos de PayPal y Push Notifications**
3. **Testear flujos completos:**
   - Registro → Push notification permission
   - Pago → Webhook → Custom claims actualizados
   - Recibir notificación push de match/mensaje

4. **Deploy a Firebase Hosting:**
   ```bash
   firebase deploy --only hosting
   ```

---

¿Necesitas ayuda con alguno de estos pasos específicos?
