# Configuración Backend de reCAPTCHA Enterprise

## 📋 Resumen

Esta guía explica cómo configurar y usar reCAPTCHA Enterprise en el backend con Cloud Functions.

## 🚀 Configuración Inicial

### 1. Instalar Dependencias

```bash
cd functions
npm install @google-cloud/recaptcha-enterprise
```

### 2. Configurar Permisos en Google Cloud

1. Ve a: https://console.cloud.google.com/iam-admin/iam?project=tuscitasseguras-2d1a6

2. Encuentra la cuenta de servicio de Firebase:
   - `tuscitasseguras-2d1a6@appspot.gserviceaccount.com`

3. Agrega el rol:
   - **reCAPTCHA Enterprise Agent** (`roles/recaptchaenterprise.agent`)

4. Esto permite que Cloud Functions verifiquen tokens de reCAPTCHA

### 3. Desplegar Cloud Functions

```bash
# Desde el directorio raíz del proyecto
npm run deploy:functions

# O solo las funciones de reCAPTCHA
firebase deploy --only functions:verifyRecaptcha,functions:verifyRecaptchaCallable
```

## 📝 Uso en el Frontend

### Opción 1: Cloud Function HTTP (verifyRecaptcha)

**Características:**
- ✅ No requiere autenticación de Firebase
- ✅ Puede usarse en login/register (antes de que el usuario esté autenticado)
- ⚠️ Requiere CORS configurado
- ⚠️ Menos seguro (cualquiera puede llamarlo)

**Ejemplo de uso:**

```javascript
// En webapp/js/auth.js o similar

import { getFunctions, httpsCallable } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-functions.js';

async function verifyRecaptchaBeforeLogin(recaptchaToken) {
  try {
    const response = await fetch(
      'https://us-central1-tuscitasseguras-2d1a6.cloudfunctions.net/verifyRecaptcha',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          token: recaptchaToken,
          action: 'login'  // Debe coincidir con el action del grecaptcha.execute()
        })
      }
    );

    const result = await response.json();

    if (result.success) {
      console.log('✅ reCAPTCHA verificado, score:', result.score);
      return true;
    } else {
      console.error('❌ reCAPTCHA falló:', result.reason);
      return false;
    }
  } catch (error) {
    console.error('Error verificando reCAPTCHA:', error);
    return false;
  }
}

// Uso en login
async function handleLogin(email, password) {
  // 1. Obtener token de reCAPTCHA
  const recaptchaToken = await grecaptcha.enterprise.execute(
    '6Lc4QBcsAAAAACFZLEgaTz3DuLGiBuXpScrBKt7w',
    { action: 'login' }
  );

  // 2. Verificar con el backend
  const isHuman = await verifyRecaptchaBeforeLogin(recaptchaToken);

  if (!isHuman) {
    alert('Verificación anti-bot fallida. Por favor intenta de nuevo.');
    return;
  }

  // 3. Continuar con el login normal
  await signInWithEmailAndPassword(auth, email, password);
}
```

### Opción 2: Cloud Function Callable (verifyRecaptchaCallable)

**Características:**
- ✅ Más seguro (automáticamente valida el ID token de Firebase)
- ✅ Incluye información del usuario autenticado
- ✅ Mejor integración con Firebase SDK
- ⚠️ Solo funciona con usuarios autenticados

**Ejemplo de uso:**

```javascript
import { getFunctions, httpsCallable } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-functions.js';

const functions = getFunctions();
const verifyRecaptcha = httpsCallable(functions, 'verifyRecaptchaCallable');

async function verifyRecaptchaSecure(recaptchaToken, action) {
  try {
    const result = await verifyRecaptcha({
      token: recaptchaToken,
      action: action
    });

    console.log('✅ reCAPTCHA verificado:', result.data);
    return result.data.success;
  } catch (error) {
    console.error('❌ reCAPTCHA falló:', error.message);
    return false;
  }
}

// Uso en formulario protegido (usuario ya autenticado)
async function submitProtectedForm(formData) {
  // 1. Obtener token de reCAPTCHA
  const recaptchaToken = await grecaptcha.enterprise.execute(
    '6Lc4QBcsAAAAACFZLEgaTz3DuLGiBuXpScrBKt7w',
    { action: 'submit_form' }
  );

  // 2. Verificar con el backend
  const isHuman = await verifyRecaptchaSecure(recaptchaToken, 'submit_form');

  if (!isHuman) {
    alert('Verificación anti-bot fallida.');
    return;
  }

  // 3. Enviar formulario
  await sendFormData(formData);
}
```

## 🔧 Configuración Avanzada

### Score Threshold (Umbral de Puntuación)

El threshold por defecto es **0.5**. Puedes ajustarlo según tus necesidades:

```javascript
// En functions/recaptcha-enterprise.js, línea ~170

const SCORE_THRESHOLD = 0.5; // Valores: 0.0 (bot) a 1.0 (humano)

// Thresholds recomendados:
// - 0.3: Muy permisivo (acepta casi todo)
// - 0.5: Estándar (recomendado por Google)
// - 0.7: Estricto (puede rechazar humanos legítimos)
// - 0.9: Muy estricto (solo usuarios muy "humanos")
```

### Acciones Personalizadas

Define acciones específicas para diferentes partes de tu aplicación:

```javascript
// Acciones comunes
const ACTIONS = {
  LOGIN: 'login',
  REGISTER: 'register',
  SUBMIT_FORM: 'submit_form',
  PASSWORD_RESET: 'password_reset',
  PAYMENT: 'payment',
  CONTACT_FORM: 'contact_form'
};

// En el frontend
await grecaptcha.enterprise.execute(SITE_KEY, { action: ACTIONS.PAYMENT });

// En el backend
await verifyRecaptchaToken(token, 'payment');
```

### Logging y Monitoreo

Los logs se guardan automáticamente en Google Cloud Logging:

```bash
# Ver logs en tiempo real
firebase functions:log

# Ver logs específicos de reCAPTCHA
firebase functions:log --only verifyRecaptcha

# Ver logs en Google Cloud Console
https://console.cloud.google.com/logs/query?project=tuscitasseguras-2d1a6
```

**Filtros útiles:**

```
# Ver todas las verificaciones exitosas
resource.type="cloud_function"
resource.labels.function_name="verifyRecaptcha"
jsonPayload.message="reCAPTCHA verification successful"

# Ver verificaciones fallidas
resource.type="cloud_function"
resource.labels.function_name="verifyRecaptcha"
jsonPayload.message="reCAPTCHA verification failed"

# Ver scores bajos (posibles bots)
resource.type="cloud_function"
resource.labels.function_name="verifyRecaptcha"
jsonPayload.score<0.3
```

## 🧪 Testing

### Probar con cURL

```bash
# Prueba básica (fallará porque el token es inválido)
curl -X POST \
  https://us-central1-tuscitasseguras-2d1a6.cloudfunctions.net/verifyRecaptcha \
  -H "Content-Type: application/json" \
  -d '{
    "token": "test-token-123",
    "action": "login"
  }'

# Respuesta esperada:
# {"success":false,"score":0,"reason":"INVALID_TOKEN","message":"Verification failed: INVALID_TOKEN"}
```

### Probar con Token Real

1. Abre la consola del navegador en tu sitio
2. Ejecuta:

```javascript
// Obtener token real
const token = await grecaptcha.enterprise.execute(
  '6Lc4QBcsAAAAACFZLEgaTz3DuLGiBuXpScrBKt7w',
  { action: 'test' }
);

console.log('Token:', token);

// Verificar con el backend
const response = await fetch(
  'https://us-central1-tuscitasseguras-2d1a6.cloudfunctions.net/verifyRecaptcha',
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, action: 'test' })
  }
);

const result = await response.json();
console.log('Resultado:', result);
```

## 🔒 Seguridad

### Rate Limiting

Protege las Cloud Functions contra abuso:

```javascript
// En functions/recaptcha-enterprise.js, agregar después de la línea 113

// Simple rate limiting usando Cloud Firestore
async function checkRateLimit(ip) {
  const admin = require('firebase-admin');
  const db = admin.firestore();
  const rateLimitRef = db.collection('rate_limits').doc(ip);

  const doc = await rateLimitRef.get();
  const now = Date.now();
  const WINDOW = 60000; // 1 minuto
  const MAX_REQUESTS = 10; // 10 requests por minuto

  if (!doc.exists) {
    await rateLimitRef.set({
      count: 1,
      windowStart: now
    });
    return true;
  }

  const data = doc.data();
  if (now - data.windowStart > WINDOW) {
    // Nueva ventana
    await rateLimitRef.set({
      count: 1,
      windowStart: now
    });
    return true;
  }

  if (data.count >= MAX_REQUESTS) {
    return false; // Rate limit excedido
  }

  await rateLimitRef.update({
    count: admin.firestore.FieldValue.increment(1)
  });
  return true;
}

// Usar en la función HTTP
exports.verifyRecaptcha = functions.https.onRequest(async (req, res) => {
  // Rate limiting
  const allowed = await checkRateLimit(req.ip);
  if (!allowed) {
    return res.status(429).json({
      error: 'rate_limit_exceeded',
      message: 'Too many requests. Try again later.'
    });
  }

  // ... resto del código
});
```

### Validar Origen

Asegúrate de que las peticiones vengan de tu dominio:

```javascript
// En functions/recaptcha-enterprise.js, línea 113

const ALLOWED_ORIGINS = [
  'https://tucitasegura.com',
  'https://www.tucitasegura.com',
  'https://tuscitasseguras-2d1a6.web.app',
  'https://tuscitasseguras-2d1a6.firebaseapp.com',
  'http://localhost:8000' // Solo para desarrollo
];

exports.verifyRecaptcha = functions.https.onRequest(async (req, res) => {
  const origin = req.get('origin');

  if (!ALLOWED_ORIGINS.includes(origin)) {
    logger.warn('Request from unauthorized origin', { origin, ip: req.ip });
    return res.status(403).json({
      error: 'forbidden',
      message: 'Unauthorized origin'
    });
  }

  // ... resto del código
});
```

## 📊 Métricas y Análisis

### Ver Estadísticas en Google Cloud Console

1. Ve a: https://console.cloud.google.com/security/recaptcha?project=tuscitasseguras-2d1a6

2. Selecciona tu key: `6Lc4QBcsAAAAACFZLEgaTz3DuLGiBuXpScrBKt7w`

3. Revisa:
   - **Score distribution**: Distribución de scores (0.0-1.0)
   - **Assessment count**: Número de evaluaciones
   - **Action metrics**: Métricas por acción (login, register, etc.)

### Crear Alertas

1. Ve a Cloud Monitoring: https://console.cloud.google.com/monitoring?project=tuscitasseguras-2d1a6

2. Crea alerta para scores bajos:
   - Métrica: `recaptchaenterprise.googleapis.com/assessment/score`
   - Condición: `score < 0.3`
   - Notificación: Email o Slack

## 🚨 Troubleshooting

### Error: "Missing dependency @google-cloud/recaptcha-enterprise"

```bash
cd functions
npm install @google-cloud/recaptcha-enterprise
firebase deploy --only functions
```

### Error: "Permission denied" al verificar tokens

1. Ve a IAM: https://console.cloud.google.com/iam-admin/iam?project=tuscitasseguras-2d1a6

2. Encuentra: `tuscitasseguras-2d1a6@appspot.gserviceaccount.com`

3. Agrega rol: **reCAPTCHA Enterprise Agent**

### Score siempre 0.0 o muy bajo

1. Verifica que el dominio esté configurado en la key
2. Revisa que la acción coincida entre frontend y backend
3. Asegúrate de que reCAPTCHA se ejecute en respuesta a interacción del usuario, no automáticamente

### Tokens expirados

Los tokens de reCAPTCHA Enterprise expiran en **2 minutos**. Genera un nuevo token justo antes de enviarlo al backend.

## 📚 Referencias

- [reCAPTCHA Enterprise Docs](https://cloud.google.com/recaptcha-enterprise/docs)
- [Cloud Functions Docs](https://firebase.google.com/docs/functions)
- [Best Practices](https://cloud.google.com/recaptcha-enterprise/docs/best-practices)
