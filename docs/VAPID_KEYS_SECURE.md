# 🔐 VAPID Keys - Configuración Segura

> **Fecha:** 2025-11-14
> **CONFIDENCIAL:** Este archivo contiene claves sensibles

---

## ✅ Claves VAPID Configuradas

### Clave Pública (Frontend)
```
BJW5I1B7KSEvM1q8FuwNokyu4sgoUy0u93C2XSQ8kpDVUdw6jv1UgYo9k_lIRjs-Rpte-YUkFqM7bbOYAD32T-w
```

**Ubicación:**
- `/webapp/js/firebase-config.js` línea 46

**Uso:**
- Registrar el navegador del usuario para recibir notificaciones push
- Se usa en el cliente (navegador)
- Es seguro que sea pública

---

### Clave Privada (Backend) 🔒

```
I6yDoIiqZjlRCfNpnCOYk3nQCbmSseZgNye01CuTQGc
```

**⚠️ IMPORTANTE: NO PUBLICAR ESTA CLAVE**

**Uso:**
- Solo para enviar notificaciones desde el servidor
- Se usa en Cloud Functions o backend Python
- NUNCA debe estar en código frontend
- NUNCA debe subirse a git (excepto en variables de entorno cifradas)

---

## 📦 Configuración en Cloud Functions

Si necesitas enviar notificaciones desde Cloud Functions, añade esta clave como variable de entorno:

### Método 1: Firebase Functions Config (Recomendado)

```bash
# Configurar la clave privada
firebase functions:config:set vapid.private_key="I6yDoIiqZjlRCfNpnCOYk3nQCbmSseZgNye01CuTQGc"

# Ver configuración actual
firebase functions:config:get

# Después de configurar, re-deployar functions
firebase deploy --only functions
```

### Método 2: Usar en el código (Cloud Functions)

```javascript
// functions/notifications.js

const admin = require('firebase-admin');
const functions = require('firebase-functions');

// Obtener la clave privada de la configuración
const VAPID_PRIVATE_KEY = functions.config().vapid?.private_key || process.env.VAPID_PRIVATE_KEY;

// Ejemplo: Enviar notificación con admin SDK
async function sendNotification(fcmToken, payload) {
  const message = {
    notification: {
      title: payload.title,
      body: payload.body
    },
    data: payload.data || {},
    token: fcmToken,
    webpush: {
      fcmOptions: {
        link: payload.link || '/webapp/index.html'
      },
      headers: {
        Urgency: 'high'
      }
    }
  };

  try {
    const response = await admin.messaging().send(message);
    console.log('Notification sent successfully:', response);
    return response;
  } catch (error) {
    console.error('Error sending notification:', error);
    throw error;
  }
}

module.exports = { sendNotification };
```

---

## 🐍 Configuración en Backend Python (Opcional)

Si implementas el backend Python en `/backend`, usa variables de entorno:

### Crear archivo `.env` (NO subir a git)

```bash
cd backend
cat > .env << 'EOF'
# Firebase Cloud Messaging - VAPID Keys
VAPID_PUBLIC_KEY=BJW5I1B7KSEvM1q8FuwNokyu4sgoUy0u93C2XSQ8kpDVUdw6jv1UgYo9k_lIRjs-Rpte-YUkFqM7bbOYAD32T-w
VAPID_PRIVATE_KEY=I6yDoIiqZjlRCfNpnCOYk3nQCbmSseZgNye01CuTQGc
EOF
```

### Uso en Python (FastAPI)

```python
# backend/app/services/notifications.py

import os
from firebase_admin import messaging
from dotenv import load_dotenv

load_dotenv()

VAPID_PRIVATE_KEY = os.getenv('VAPID_PRIVATE_KEY')

async def send_push_notification(fcm_token: str, title: str, body: str, data: dict = None):
    """
    Enviar notificación push usando Firebase Admin SDK
    """
    message = messaging.Message(
        notification=messaging.Notification(
            title=title,
            body=body
        ),
        data=data or {},
        token=fcm_token,
        webpush=messaging.WebpushConfig(
            fcm_options=messaging.WebpushFCMOptions(
                link='/webapp/index.html'
            )
        )
    )

    response = messaging.send(message)
    return response
```

---

## 🚀 Verificación de Configuración

### 1. Verificar clave pública en frontend

```javascript
// En la consola del navegador (cualquier página de la app)
import { VAPID_PUBLIC_KEY } from './js/firebase-config.js';
console.log('VAPID Public Key:', VAPID_PUBLIC_KEY);
// Debería mostrar: BJW5I1B7KSEvM1q8FuwNokyu4sgoUy0u93C2XSQ8kpDVUdw6jv1UgYo9k_lIRjs-Rpte-YUkFqM7bbOYAD32T-w
```

### 2. Verificar que las notificaciones funcionen

1. Abre cualquier página de la app (ej: `/webapp/perfil.html`)
2. Acepta el permiso de notificaciones cuando lo solicite
3. Verifica en la consola:
   ```
   [notifications.js] FCM Token obtained: BJW5I1B7...
   [notifications.js] Notifications initialized successfully
   ```

### 3. Enviar notificación de prueba desde Firebase Console

1. Ve a: https://console.firebase.google.com/project/tuscitasseguras-2d1a6/messaging
2. Click en **"Send your first message"**
3. Título: "Test de notificación"
4. Texto: "¡Funciona correctamente!"
5. Click en **"Test on device"**
6. Pega el FCM token de la consola
7. Click en **"Test"**

Si recibes la notificación, ¡todo está configurado correctamente! ✅

---

## 🔒 Seguridad

### ✅ Buenas Prácticas

1. **Clave pública:** Puede estar en el código frontend (ya está configurada)
2. **Clave privada:** Solo en variables de entorno del servidor
3. **FCM Tokens:** Almacenar en Firestore con reglas de seguridad
4. **Rate limiting:** Limitar envío de notificaciones por usuario/día

### ❌ Nunca hacer

1. NO subir `.env` a git
2. NO poner la clave privada en código frontend
3. NO hardcodear credenciales en el código
4. NO compartir claves en mensajes/emails sin cifrar

---

## 📚 Recursos

**Firebase Documentation:**
- [Web Push Certificates](https://firebase.google.com/docs/cloud-messaging/js/client#access_the_registration_token)
- [Send messages with Admin SDK](https://firebase.google.com/docs/cloud-messaging/send-message)

**TuCitaSegura Documentation:**
- `NOTIFICATIONS_GUIDE.md` - Guía completa de notificaciones
- `VAPID_KEY_SETUP.md` - Instrucciones de setup
- `functions/notifications.js` - Implementación actual

---

**Última actualización:** 2025-11-14
**Configurado por:** Claude Assistant
**Estado:** ✅ VAPID keys configuradas correctamente
