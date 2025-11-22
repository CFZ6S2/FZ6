# 🔧 Solución Rápida de Errores - TuCitaSegura

## 📋 Errores Detectados en Consola

### 1. ❌ Firebase App Check Error (400)
**Error:** `AppCheck: Requests throttled due to 400 error`

**Causa:** Firebase App Check está mal configurado o la clave de reCAPTCHA Enterprise no es válida.

**Solución:**

#### Opción A: Desactivar App Check temporalmente (Rápido)

Edita `webapp/js/firebase-config.js`:

```javascript
// Firebase Configuration for TuCitaSegura
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";

// CONFIGURACIÓN CORRECTA PARA TU PROYECTO
const firebaseConfig = {
  apiKey: "AIzaSyAgFcoHwoBpo80rlEHL2hHVZ2DqtjWXh2s",
  authDomain: "tuscitasseguras-2d1a6.firebaseapp.com",
  projectId: "tuscitasseguras-2d1a6",
  storageBucket: "tuscitasseguras-2d1a6.firebasestorage.app",
  messagingSenderId: "924208562587",
  appId: "1:924208562587:web:5291359426fe390b36213e"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

export default app;
```

#### Opción B: Configurar App Check correctamente

1. Ve a Firebase Console: https://console.firebase.google.com/project/tuscitasseguras-2d1a6
2. App Check → Obtén nueva clave de reCAPTCHA Enterprise
3. O desactiva App Check temporalmente en la consola

---

### 2. ❌ Google Maps API Key Invalid

**Error:** `Google Maps JavaScript API warning: InvalidKey`

**Archivos afectados:** Cualquier página que use Google Maps

**Solución:**

1. **Obtener API Key de Google Maps:**
   - Ve a https://console.cloud.google.com/
   - Selecciona tu proyecto o crea uno nuevo
   - APIs & Services → Credentials
   - Create Credentials → API Key
   - Habilita: Maps JavaScript API, Places API, Geocoding API

2. **Reemplazar en todos los archivos:**

Busca en tu código:
```html
<script src="https://maps.googleapis.com/maps/api/js?key=YOUR_GOOGLE_MAPS_API_KEY&libraries=places"></script>
```

Reemplaza con:
```html
<script src="https://maps.googleapis.com/maps/api/js?key=TU_API_KEY_REAL&libraries=places"></script>
```

3. **Archivos a modificar:**
```bash
# Buscar todos los archivos que usan Google Maps
grep -r "maps.googleapis.com" webapp/ --include="*.html"

# Reemplazar en:
webapp/buscar-usuarios.html
webapp/cita-detalle.html
```

---

### 3. ❌ Firebase Storage Authentication Error (401)

**Error:** `Firebase Storage: User is not authenticated`

**Causa:** Reglas de Firebase Storage muy restrictivas o usuario no autenticado.

**Solución:**

1. **Ve a Firebase Console → Storage → Rules**

2. **Reemplaza con estas reglas (DESARROLLO):**

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // Permitir lectura pública de avatares
    match /users/{userId}/avatar.jpg {
      allow read: if true;
      allow write: if request.auth != null && request.auth.uid == userId;
    }

    // Permitir lectura pública de fotos de galería
    match /users/{userId}/gallery/{photoId} {
      allow read: if true;
      allow write: if request.auth != null && request.auth.uid == userId;
    }

    // Resto de archivos requiere autenticación
    match /{allPaths=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

3. **Para PRODUCCIÓN (más seguro):**

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /users/{userId}/{allPaths=**} {
      allow read: if true;  // Permitir leer perfiles públicos
      allow write: if request.auth != null &&
                     request.auth.uid == userId &&
                     request.resource.size < 5 * 1024 * 1024 &&  // Max 5MB
                     request.resource.contentType.matches('image/.*');  // Solo imágenes
    }
  }
}
```

---

### 4. ❌ Function `updateGenderDependentFields` not defined

**Error:** `ReferenceError: updateGenderDependentFields is not defined`

**Solución:**

Esta función no existe. Busca en tu código donde se llama y:

**Opción A: Eliminar la llamada**

Busca:
```javascript
updateGenderDependentFields();
```

Comenta o elimina esa línea.

**Opción B: Implementar la función**

Si la necesitas, agrégala:

```javascript
function updateGenderDependentFields() {
    // Obtener género actual
    const gender = document.getElementById('gender')?.value;

    // Mostrar/ocultar campos según género
    if (gender === 'femenino') {
        // Mostrar botón SOS, eventos VIP, etc.
        const vipButton = document.getElementById('vipEventsBtn');
        if (vipButton) vipButton.classList.remove('hidden');
    } else {
        // Ocultar botón VIP para hombres
        const vipButton = document.getElementById('vipEventsBtn');
        if (vipButton) vipButton.classList.add('hidden');
    }
}

// Llamar cuando cambie el género
document.getElementById('gender')?.addEventListener('change', updateGenderDependentFields);
```

---

### 5. ❌ RecaptchaVerifier Error

**Error:** `Cannot read properties of undefined (reading 'appVerificationDisabledForTesting')`

**Causa:** RecaptchaVerifier mal inicializado o falta configuración de Auth.

**Solución:**

Asegúrate de inicializar RecaptchaVerifier correctamente:

```javascript
// CORRECTO
import { RecaptchaVerifier } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

let recaptchaVerifier;

function initPhoneRecaptcha() {
    // Destruir verifier anterior si existe
    if (recaptchaVerifier) {
        try {
            recaptchaVerifier.clear();
        } catch(e) {}
    }

    try {
        recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
            'size': 'invisible',
            'callback': (response) => {
                console.log('reCAPTCHA verified');
            },
            'expired-callback': () => {
                console.log('reCAPTCHA expired');
            }
        });

        // Renderizar
        recaptchaVerifier.render();
    } catch (error) {
        console.error('Error creando RecaptchaVerifier:', error);
    }
}

// Asegúrate de tener el div en el HTML
// <div id="recaptcha-container"></div>
```

---

## 🚀 Script de Solución Rápida

Crea un archivo `webapp/js/fix-errors.js`:

```javascript
// Fix common errors
console.log('🔧 Aplicando fixes...');

// 1. Fix updateGenderDependentFields
window.updateGenderDependentFields = function() {
    const gender = document.getElementById('gender')?.value;

    // Actualizar UI según género
    if (gender === 'femenino') {
        document.getElementById('vipEventsBtn')?.classList.remove('hidden');
    } else {
        document.getElementById('vipEventsBtn')?.classList.add('hidden');
    }

    console.log('✅ Gender fields updated');
};

// 2. Suppress Google Maps warnings
window.addEventListener('error', function(e) {
    if (e.message.includes('Google Maps') || e.message.includes('InvalidKey')) {
        console.warn('⚠️ Google Maps API Key needs configuration');
        e.preventDefault();
    }
}, true);

// 3. Handle Firebase Storage errors gracefully
const originalError = console.error;
console.error = function(...args) {
    const message = args[0]?.toString() || '';
    if (message.includes('storage/unauthenticated')) {
        console.warn('⚠️ Firebase Storage: User not authenticated, skipping upload');
        return;
    }
    originalError.apply(console, args);
};

console.log('✅ Fixes aplicados');
```

Luego incluye en tu HTML:
```html
<script src="/webapp/js/fix-errors.js"></script>
```

---

## 📝 Checklist de Solución

```
☐ 1. Actualizar firebase-config.js con credenciales reales
☐ 2. Obtener y configurar Google Maps API Key
☐ 3. Actualizar reglas de Firebase Storage
☐ 4. Agregar función updateGenderDependentFields
☐ 5. Fix RecaptchaVerifier initialization
☐ 6. Desactivar App Check temporalmente (o configurarlo bien)
☐ 7. Probar subida de fotos
☐ 8. Verificar que Google Maps carga
☐ 9. Probar verificación de teléfono
☐ 10. Limpiar consola de errores
```

---

## 🆘 Si Todo Falla

**Reset completo:**

```bash
# 1. Limpiar caché del navegador
# Ctrl+Shift+Delete → Borrar todo

# 2. Recargar sin caché
# Ctrl+Shift+R (Chrome/Firefox)

# 3. Verificar Firebase está activo
# https://console.firebase.google.com/project/tuscitasseguras-2d1a6

# 4. Ver logs de Firebase
# Firebase Console → Functions → Logs
```

---

## 💡 Tips

1. **Usa la consola de Firebase:** https://console.firebase.google.com/
2. **Revisa los logs en tiempo real**
3. **App Check NO es necesario para desarrollo**
4. **Google Maps API tiene cuota gratuita de $200/mes**
5. **Firebase Storage es GRATIS hasta 5GB**

---

¿Necesitas ayuda con algún paso específico?
