# 📱 Phone Authentication (SMS Login)

Implementación completa de autenticación por SMS usando Firebase Phone Auth con reCAPTCHA v2.

## 🎯 Diferencia con App Check

**IMPORTANTE**: Phone Authentication y App Check son **sistemas independientes** que coexisten sin conflictos:

| Característica | App Check (reCAPTCHA Enterprise) | Phone Auth (reCAPTCHA v2) |
|----------------|----------------------------------|---------------------------|
| **Propósito** | Proteger recursos de Firebase contra abuso | Verificar usuarios antes de enviar SMS |
| **Site Key** | `6Lc4QBcsAAAAACFZLEgaTz3DuLGiBuXpScrBKt7w` | Gestionado automáticamente por Firebase |
| **Configuración** | Manual en Firebase Console | Automática |
| **Visible al usuario** | No (transparente) | Sí (cuando es visible) o No (cuando es invisible) |
| **Se inicializa** | Al cargar la app | Cuando se necesita SMS login |

## 📁 Archivos Creados

```
webapp/
├── js/
│   └── phone-auth.js          # Módulo principal de Phone Auth
├── phone-auth-demo.html       # Página de demostración interactiva
└── docs/
    └── phone-authentication.md # Esta documentación
```

## 🚀 Inicio Rápido

### 1. Importar el módulo

```javascript
import {
  initRecaptchaVisible,
  initRecaptchaInvisible,
  sendSmsCode,
  verifySmsCode,
  phoneLogin
} from './js/phone-auth.js';
```

### 2. Agregar contenedor HTML

```html
<!-- Contenedor donde se renderiza el reCAPTCHA -->
<div id="recaptcha-container"></div>
```

### 3. Inicializar reCAPTCHA

**Opción A: Visible (usuario resuelve "No soy un robot")**
```javascript
await initRecaptchaVisible('recaptcha-container');
```

**Opción B: Invisible (automático)**
```javascript
await initRecaptchaInvisible('recaptcha-container');
```

### 4. Enviar SMS

```javascript
const confirmation = await sendSmsCode('+34612345678');
```

### 5. Verificar código

```javascript
const userCredential = await verifySmsCode('123456');
console.log('Usuario autenticado:', userCredential.user.uid);
```

## 📖 Ejemplos Completos

### Ejemplo 1: Flujo Visible (Recomendado para producción)

```javascript
// 1. Inicializar reCAPTCHA visible
await initRecaptchaVisible('recaptcha-container', {
  onSuccess: (response) => {
    console.log('reCAPTCHA resuelto');
  },
  onExpired: () => {
    alert('reCAPTCHA expirado, resuelve nuevamente');
  }
});

// 2. Usuario ingresa su teléfono y hace clic en "Enviar SMS"
const phoneNumber = document.getElementById('phone').value;
const confirmation = await sendSmsCode('+34' + phoneNumber);

// 3. Usuario ingresa código recibido por SMS
const code = document.getElementById('code').value;
const userCredential = await verifySmsCode(code);

console.log('Login exitoso:', userCredential.user.phoneNumber);
```

### Ejemplo 2: Flujo Invisible (UX más fluida)

```javascript
// 1. Inicializar reCAPTCHA invisible
await initRecaptchaInvisible('recaptcha-container');

// 2. Usuario hace clic en "Enviar SMS" directamente
// (el reCAPTCHA se resuelve automáticamente en segundo plano)
const phoneNumber = '+34612345678';
const confirmation = await sendSmsCode(phoneNumber);

// 3. Verificar código
const code = prompt('Código SMS:');
const userCredential = await verifySmsCode(code);

console.log('Usuario:', userCredential.user.uid);
```

### Ejemplo 3: Función completa con manejo de errores

```javascript
async function loginWithPhone() {
  try {
    // Inicializar reCAPTCHA
    await initRecaptchaVisible('recaptcha-container');

    // Obtener teléfono del formulario
    const phone = document.getElementById('phone').value;
    const fullPhone = formatSpanishPhone(phone); // +34612345678

    // Validar formato
    if (!isValidPhoneNumber(fullPhone)) {
      throw new Error('Número de teléfono inválido');
    }

    // Enviar SMS
    showMessage('Enviando SMS...');
    await sendSmsCode(fullPhone);
    showMessage('SMS enviado. Revisa tu teléfono.');

    // Mostrar formulario de código
    document.getElementById('phone-form').style.display = 'none';
    document.getElementById('code-form').style.display = 'block';

    // Esperar código
    document.getElementById('verify-btn').onclick = async () => {
      const code = document.getElementById('code').value;

      try {
        const userCredential = await verifySmsCode(code);
        showMessage('¡Bienvenido! ' + userCredential.user.phoneNumber);

        // Redirigir a perfil
        window.location.href = '/webapp/perfil.html';

      } catch (error) {
        if (error.message.includes('Código incorrecto')) {
          showMessage('Código incorrecto. Inténtalo de nuevo.', 'error');
        } else {
          showMessage(error.message, 'error');
        }
      }
    };

  } catch (error) {
    console.error('Error:', error);
    showMessage(error.message, 'error');
  }
}
```

### Ejemplo 4: Flujo completo simplificado

```javascript
// Usar la función phoneLogin que hace todo el proceso
const userCredential = await phoneLogin(
  '+34612345678',
  async () => {
    // Esta función obtiene el código del usuario
    // Puedes usar prompt() para pruebas o un modal en producción
    return document.getElementById('sms-code').value;
  }
);

console.log('Login completado:', userCredential.user.uid);
```

## 🎨 Página de Demostración

Abre `phone-auth-demo.html` en tu navegador para ver:

- ✅ Modo Visible e Invisible
- ✅ Formulario de teléfono
- ✅ Verificación de código SMS
- ✅ Logs en tiempo real
- ✅ Manejo de errores
- ✅ Estados de UI

```bash
# Abrir demo (requiere servidor local)
firebase serve
# Luego ve a: http://localhost:5000/webapp/phone-auth-demo.html
```

## 🔧 API Completa

### Funciones de Inicialización

#### `initRecaptchaVisible(containerId, options)`

Inicializa reCAPTCHA en modo visible (usuario debe resolver "No soy un robot").

**Parámetros:**
- `containerId` (string): ID del div contenedor (default: `'recaptcha-container'`)
- `options` (object): Callbacks opcionales
  - `onSuccess(response)`: Se ejecuta cuando se resuelve
  - `onExpired()`: Se ejecuta cuando expira
  - `onError(error)`: Se ejecuta si hay error

**Retorna:** `Promise<RecaptchaVerifier>`

```javascript
const verifier = await initRecaptchaVisible('my-container', {
  onSuccess: () => console.log('Resuelto'),
  onExpired: () => console.log('Expirado')
});
```

#### `initRecaptchaInvisible(containerId, options)`

Inicializa reCAPTCHA en modo invisible (automático).

**Parámetros:** Iguales a `initRecaptchaVisible`

**Retorna:** `Promise<RecaptchaVerifier>`

```javascript
const verifier = await initRecaptchaInvisible('my-container');
```

### Funciones de Autenticación

#### `sendSmsCode(phoneNumber, verifier)`

Envía código de verificación por SMS.

**Parámetros:**
- `phoneNumber` (string): Teléfono en formato internacional (`+34612345678`)
- `verifier` (RecaptchaVerifier): Opcional si ya hay uno global

**Retorna:** `Promise<ConfirmationResult>`

**Errores comunes:**
- `auth/invalid-phone-number`: Formato de teléfono inválido
- `auth/too-many-requests`: Demasiados intentos
- `auth/quota-exceeded`: Límite de SMS alcanzado

```javascript
const confirmation = await sendSmsCode('+34612345678');
```

#### `verifySmsCode(code, confirmation)`

Verifica el código SMS recibido.

**Parámetros:**
- `code` (string): Código de 6 dígitos
- `confirmation` (ConfirmationResult): Opcional si ya hay uno global

**Retorna:** `Promise<UserCredential>`

**Errores comunes:**
- `auth/invalid-verification-code`: Código incorrecto
- `auth/code-expired`: Código expirado (60 segundos)

```javascript
const userCredential = await verifySmsCode('123456');
```

#### `phoneLogin(phoneNumber, getCodeFromUser)`

Flujo completo: envía SMS y espera código.

**Parámetros:**
- `phoneNumber` (string): Teléfono en formato internacional
- `getCodeFromUser` (Function): Función async que retorna el código

**Retorna:** `Promise<UserCredential>`

```javascript
const user = await phoneLogin('+34612345678', async () => {
  return await getUserCodeInput(); // Tu función para obtener código
});
```

### Funciones Utilitarias

#### `cleanupRecaptcha()`

Limpia la instancia de reCAPTCHA. Útil antes de crear una nueva.

```javascript
await cleanupRecaptcha();
```

#### `formatSpanishPhone(phone)`

Convierte número español a formato internacional.

```javascript
formatSpanishPhone('612345678')  // → '+34612345678'
formatSpanishPhone('34612345678') // → '+34612345678'
formatSpanishPhone('+34612345678') // → '+34612345678'
```

#### `isValidPhoneNumber(phone)`

Valida formato de teléfono internacional.

```javascript
isValidPhoneNumber('+34612345678') // → true
isValidPhoneNumber('612345678')    // → false
```

#### `getPhoneAuthState()`

Obtiene estado actual del módulo.

```javascript
const state = getPhoneAuthState();
// {
//   hasRecaptcha: true,
//   hasPendingConfirmation: false,
//   currentPhone: '+34612345678',
//   isReady: true
// }
```

## ⚙️ Configuración en Firebase

### 1. Habilitar Phone Authentication

1. Ve a [Firebase Console → Authentication → Sign-in method](https://console.firebase.google.com/project/tuscitasseguras-2d1a6/authentication/providers)
2. Habilita **"Phone"**
3. Guarda

### 2. Configurar números de prueba (desarrollo)

Para evitar consumir cuota de SMS en desarrollo:

1. Firebase Console → Authentication → Sign-in method → Phone
2. Scroll hasta **"Phone numbers for testing"**
3. Agrega números de prueba:
   ```
   +34000000001 → código: 123456
   +34000000002 → código: 654321
   ```

### 3. Configurar dominios autorizados

1. Firebase Console → Authentication → Settings → Authorized domains
2. Asegúrate de tener:
   - `localhost`
   - `tuscitasseguras-2d1a6.web.app`
   - `tucitasegura.com`

## 🚨 Límites y Cuotas

### Plan Spark (Gratuito)
- **10 SMS/día** gratis
- Después: bloqueado hasta el día siguiente

### Plan Blaze (Pago por uso)
- **Sin límite** de SMS
- Costo: ~0.01€ por SMS (varía por país)
- Configurar billing en Firebase Console

### Recomendaciones
1. Usa números de prueba en desarrollo
2. Implementa rate limiting en el frontend
3. Considera alternativas para usuarios frecuentes (email, Google Sign-In)

## 🔒 Seguridad

### CSP (Content Security Policy)

El CSP en `firebase.json` ya incluye los dominios necesarios:

```json
{
  "headers": [{
    "source": "**",
    "headers": [{
      "key": "Content-Security-Policy",
      "value": "... https://www.google.com/recaptcha/ https://www.gstatic.com/recaptcha/ ..."
    }]
  }]
}
```

### Protección contra abuso

```javascript
// Implementar rate limiting
const MAX_SMS_PER_HOUR = 3;
let smsCount = parseInt(localStorage.getItem('smsCount') || '0');
let lastReset = parseInt(localStorage.getItem('lastReset') || '0');

// Resetear cada hora
if (Date.now() - lastReset > 3600000) {
  smsCount = 0;
  lastReset = Date.now();
  localStorage.setItem('smsCount', '0');
  localStorage.setItem('lastReset', lastReset.toString());
}

if (smsCount >= MAX_SMS_PER_HOUR) {
  throw new Error('Límite de SMS alcanzado. Intenta en una hora.');
}

// Incrementar contador
smsCount++;
localStorage.setItem('smsCount', smsCount.toString());
```

## 🐛 Solución de Problemas

### Error: "reCAPTCHA no inicializado"

**Causa**: Intentas enviar SMS antes de inicializar reCAPTCHA

**Solución**:
```javascript
// Primero inicializar
await initRecaptchaVisible('recaptcha-container');

// Luego enviar SMS
await sendSmsCode('+34612345678');
```

### Error: "Contenedor no encontrado"

**Causa**: El div `#recaptcha-container` no existe en el HTML

**Solución**:
```html
<div id="recaptcha-container"></div>
```

### Error: "auth/too-many-requests"

**Causa**: Demasiados intentos de envío de SMS

**Solución**:
- Espera 1-2 horas
- Usa números de prueba en desarrollo
- Implementa rate limiting

### Error: "auth/quota-exceeded"

**Causa**: Límite de SMS gratuitos alcanzado

**Solución**:
- Espera hasta el día siguiente (plan Spark)
- Upgrade a plan Blaze
- Usa números de prueba

### reCAPTCHA no se muestra

**Causa**: CSP bloqueando Google Recaptcha

**Solución**: Verifica `firebase.json`:
```json
"https://www.google.com/recaptcha/"
"https://www.gstatic.com/recaptcha/"
```

## 📚 Referencias

- [Firebase Phone Auth Docs](https://firebase.google.com/docs/auth/web/phone-auth)
- [reCAPTCHA v2 Docs](https://developers.google.com/recaptcha/docs/display)
- [Firebase Auth API Reference](https://firebase.google.com/docs/reference/js/auth)

## 🆘 Soporte

Si tienes problemas:

1. Revisa los logs en la consola del navegador
2. Verifica la configuración en Firebase Console
3. Prueba con números de prueba primero
4. Revisa la demo en `phone-auth-demo.html`
