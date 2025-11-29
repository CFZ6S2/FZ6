# Prevención de Problemas con App Check y reCAPTCHA Enterprise

## 🛡️ Cómo Evitar el Throttling de App Check

### 1. Configuración Explícita de la Site Key

La aplicación ahora soporta **3 formas** de configurar la reCAPTCHA site key (en orden de prioridad):

#### Opción A: Variable Global (Recomendado para Testing)

```html
<!-- En el HTML, ANTES de cargar firebase-appcheck.js -->
<script>
  window.RECAPTCHA_SITE_KEY = '6Lc4QBcsAAAAACFZLEgaTz3DuLGiBuXpScrBKt7w';
</script>
<script type="module" src="./js/firebase-appcheck.js"></script>
```

#### Opción B: LocalStorage (Para Persistencia)

```javascript
// En la consola del navegador o en código de inicialización
localStorage.setItem('RECAPTCHA_SITE_KEY', '6Lc4QBcsAAAAACFZLEgaTz3DuLGiBuXpScrBKt7w');
location.reload();
```

#### Opción C: Hardcoded (Default)

Si no se configura ninguna de las anteriores, se usa la clave hardcoded en `firebase-appcheck.js`:
```javascript
const RECAPTCHA_ENTERPRISE_SITE_KEY = '6Lc4QBcsAAAAACFZLEgaTz3DuLGiBuXpScrBKt7w';
```

**Ventajas:**
- ✅ Cambiar la key en producción sin redeployar
- ✅ Testing con diferentes keys
- ✅ Troubleshooting más fácil

---

### 2. Verificar Dominios Permitidos en reCAPTCHA Enterprise

**CRÍTICO:** Los siguientes dominios DEBEN estar configurados en Google Cloud Console:

1. Ve a: https://console.cloud.google.com/security/recaptcha?project=tuscitasseguras-2d1a6

2. Edita la key: `6Lc4QBcsAAAAACFZLEgaTz3DuLGiBuXpScrBKt7w`

3. En la sección **"Dominios"**, agrega:

```
localhost
127.0.0.1
tucitasegura.com
www.tucitasegura.com
tuscitasseguras-2d1a6.web.app
tuscitasseguras-2d1a6.firebaseapp.com
```

**⚠️ IMPORTANTE:**
- NO incluyas `http://` o `https://`
- Un dominio por línea
- Incluye tanto `tucitasegura.com` como `www.tucitasegura.com`

---

### 3. Manejo del Throttling (Bloqueo de 24h)

#### En Desarrollo (localhost)

Si ves `AppCheck: Requests throttled`:

```javascript
// En la consola del navegador (F12)
await window.clearAppCheckThrottle({ reload: true });
```

Esto limpia:
- ✅ localStorage
- ✅ sessionStorage
- ✅ IndexedDB
- ✅ Recarga la página automáticamente

#### En Producción (tucitasegura.com)

**NO uses `clearAppCheckThrottle()` en producción.** En su lugar:

**Paso 1: Corrige la Configuración**
1. Verifica que la site key sea correcta en el código
2. Verifica que los dominios estén configurados en Google Cloud Console
3. Despliega los cambios

**Paso 2: Espera o Limpia Cache**

**Opción A: Esperar (Más Seguro)**
- El throttle expira automáticamente en ~24 horas
- No requiere acción del usuario

**Opción B: Limpiar Cache del Usuario**
- Pide a los usuarios que limpien su cache del navegador
- `Ctrl+Shift+Delete` → Todo → Desde siempre

**Opción C: Forzar Limpieza (Solo en Emergencias)**
```javascript
// SOLO si es absolutamente necesario
await window.clearAppCheckThrottle({ force: true, reload: true });
```

---

### 4. Orden de Importación Correcto

**CRÍTICO:** `firebase-appcheck.js` DEBE importarse ANTES de inicializar servicios de Firebase.

#### ✅ CORRECTO:

```html
<script type="module">
  // 1. Primero App Check
  import './js/firebase-appcheck.js';

  // 2. Luego Firebase config y servicios
  import { auth, db } from './js/firebase-config.js';
  import { signInWithEmailAndPassword } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';

  // ... resto del código
</script>
```

#### ❌ INCORRECTO:

```html
<script type="module">
  // MAL: Firebase config primero
  import { auth, db } from './js/firebase-config.js';

  // App Check después (muy tarde)
  import './js/firebase-appcheck.js';
</script>
```

---

### 5. Manejo de Errores `net::ERR_ABORTED`

**Estos errores suelen ser benignos** durante el desarrollo. Son causados por:
- Abortos de canales de red del Firebase SDK
- Requests cancelados por el navegador
- Cambios de página mientras se carga

**No requieren acción** si:
- ✅ La aplicación funciona correctamente
- ✅ Los errores están logueados en la consola
- ✅ No afectan la funcionalidad

**Requieren investigación** si:
- ❌ La aplicación no funciona
- ❌ Los errores persisten después de recargar
- ❌ Bloquean el login o funcionalidad crítica

---

## 📋 Checklist de Prevención

Antes de desplegar a producción:

- [ ] Site key configurada correctamente
- [ ] Dominios configurados en Google Cloud Console (incluye `www.`)
- [ ] `firebase-appcheck.js` se importa PRIMERO
- [ ] No hay referencias a archivos inexistentes (ej: `firebase-appcheck-disabled.js`)
- [ ] Cache del navegador limpiado después del deploy
- [ ] Probado en modo incógnito

---

## 🔍 Diagnóstico Rápido

### Ver qué site key se está usando:

```javascript
// En la consola del navegador
console.log('Site Key Source:',
  window.RECAPTCHA_SITE_KEY ? 'window.RECAPTCHA_SITE_KEY' :
  localStorage.getItem('RECAPTCHA_SITE_KEY') ? 'localStorage' :
  'hardcoded'
);
```

### Detectar si hay throttling activo:

```javascript
// En la consola del navegador
const throttled = window.detectAppCheckThrottled();
console.log('Throttled:', throttled);

if (throttled) {
  console.log('⚠️ App Check está throttled (bloqueado 24h)');
  console.log('💡 Solución: clearAppCheckThrottle() o limpiar cache');
}
```

### Ver estado completo de App Check:

```javascript
// En la consola del navegador
console.log('App Check Instance:', window._appCheckInstance);
console.log('Is Development:', location.hostname === 'localhost');

// Intentar obtener un token
if (window.getAppCheckToken) {
  const token = await window.getAppCheckToken();
  console.log('Token:', token ? '✅ OK' : '❌ Failed');
}
```

---

## 🆘 Troubleshooting

### Problema: "Site key incorrecta en producción"

**Solución:**
```javascript
// Configurar temporalmente desde la consola
localStorage.setItem('RECAPTCHA_SITE_KEY', '6Lc4QBcsAAAAACFZLEgaTz3DuLGiBuXpScrBKt7w');
location.reload();
```

### Problema: "Throttled en todos los navegadores"

**Causa:** El problema está en la configuración del servidor, no en el cliente.

**Solución:**
1. Verifica dominios en Google Cloud Console
2. Verifica que la site key sea correcta en el código desplegado
3. Espera 24h o redespliega con configuración correcta

### Problema: "Funciona en localhost pero no en producción"

**Causas comunes:**
1. Dominio de producción no configurado en reCAPTCHA Enterprise
2. Site key incorrecta en producción
3. Cache del navegador sirviendo versión vieja
4. Enforcement activado sin configuración completa

**Solución:**
1. Verifica con curl/Invoke-WebRequest qué código está realmente en producción
2. Limpia cache y prueba en modo incógnito
3. Revisa logs de Firebase Functions

---

## 📚 Referencias

- **Configuración reCAPTCHA:** https://console.cloud.google.com/security/recaptcha?project=tuscitasseguras-2d1a6
- **Firebase App Check:** https://console.firebase.google.com/project/tuscitasseguras-2d1a6/appcheck
- **Guía completa:** `docs/guides/APP_CHECK_CONFIGURATION.md`
- **Setup backend:** `docs/guides/RECAPTCHA_BACKEND_SETUP.md`
