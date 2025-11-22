# Configuración de Firebase App Check para TuCitaSegura

App Check protege tu backend de Firebase contra abuso, previniendo requests no autorizadas desde apps no verificadas.

## 🚨 Error 401 con App Check

Si ves errores 401 en Auth/Firestore/Storage, es porque:
- App Check **Enforcement está activado** en Firebase Console
- Pero tu app **NO está enviando tokens** de App Check

---

## 📋 Pasos para Configurar App Check

### **Paso 1: Obtener reCAPTCHA v3 Site Key**

1. Ve a [Google Cloud Console - reCAPTCHA](https://console.cloud.google.com/security/recaptcha)
2. Selecciona el proyecto: **tuscitasseguras-2d1a6**
3. Haz clic en **+ CREATE KEY**

**Configuración:**
```
Display name: TuCitaSegura Web
Key type: Challenge (v3)
Domains:
  - localhost
  - 127.0.0.1
  - tuscitasseguras-2d1a6.web.app
  - tuscitasseguras-2d1a6.firebaseapp.com
  - tu-dominio-personalizado.com (si tienes)
```

4. Copia el **Site Key** (6Lxxx...)

---

### **Paso 2: Registrar Site Key en Firebase Console**

1. Ve a [Firebase Console](https://console.firebase.google.com/) → **tuscitasseguras-2d1a6**
2. Ve a **App Check** en menú lateral
3. Haz clic en **Apps** tab
4. Haz clic en tu web app (1:924208562587:web:5291359426fe390b36213e)
5. En **reCAPTCHA v3**, haz clic en **Register**
6. Pega tu **Site Key**
7. Guarda

---

### **Paso 3: Actualizar Código**

Edita `webapp/js/firebase-appcheck.js`:

```javascript
// Reemplaza esta línea:
const RECAPTCHA_SITE_KEY = 'YOUR_RECAPTCHA_V3_SITE_KEY';

// Con tu site key real:
const RECAPTCHA_SITE_KEY = '6Lxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx';
```

---

### **Paso 4: Incluir en todas las páginas HTML**

**ANTES de** `firebase-config.js`, agrega:

```html
<!-- App Check (PRIMERO) -->
<script type="module" src="/webapp/js/firebase-appcheck.js"></script>

<!-- Firebase Config (DESPUÉS) -->
<script type="module" src="/webapp/js/firebase-config.js"></script>
```

**Orden correcto:**
```html
<script type="module">
  // 1. firebase-appcheck.js (inicializa App Check)
  import './js/firebase-appcheck.js';

  // 2. firebase-config.js (usa App Check ya inicializado)
  import { auth, db } from './js/firebase-config.js';

  // 3. Tu código...
</script>
```

---

### **Paso 5: Configurar Debug Tokens (Desarrollo)**

Cuando desarrollas en `localhost`, App Check usa **debug tokens**.

1. Abre tu app en `http://127.0.0.1:5500`
2. Abre DevTools (F12) → **Console**
3. Verás un mensaje:
   ```
   Firebase App Check debug token: XXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX
   Pass this token to the Firebase Console to allow this app to work with App Check.
   ```

4. **Copia ese token**
5. Ve a Firebase Console → **App Check** → **Apps** → **Debug tokens**
6. Haz clic en **Add debug token**
7. Pega el token y añade un nombre: "Localhost Development"
8. Guarda

**¡Importante!** Cada desarrollador/navegador necesita su propio debug token.

---

### **Paso 6: Activar Enforcement**

Solo después de que todo funcione:

1. Firebase Console → **App Check**
2. Para cada servicio (Auth, Firestore, Storage):
   - Haz clic en **Enforce**
   - Confirma

**Recomendación:** Activa en este orden:
1. ✅ Storage (menos crítico)
2. ✅ Firestore (después de probar reads/writes)
3. ✅ Auth (último - más crítico)

---

## 🧪 Testing

### Verificar que App Check funciona:

```javascript
// En consola del navegador después de cargar la página
import { getToken } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app-check.js";
import { appCheck } from './js/firebase-appcheck.js';

const token = await getToken(appCheck);
console.log('App Check Token:', token.token);
```

Si ves un token → ✅ Funciona
Si ves error → ❌ Revisar configuración

---

## 🐛 Troubleshooting

### Error: "reCAPTCHA placeholder element must be an element or id"

**Causa:** reCAPTCHA no puede renderizarse

**Solución:** Agrega un div invisible:
```html
<div id="recaptcha-container" style="display:none;"></div>
```

---

### Error 401 persiste después de configurar App Check

**Causa:** Debug token no añadido o token expirado

**Solución:**
1. Limpia caché: `Ctrl + Shift + Delete`
2. Obtén nuevo debug token (console log)
3. Añádelo en Firebase Console
4. Recarga página: `Ctrl + Shift + R`

---

### Error: "App Check: Requests throttled due to 400 error"

**Causa:** Site key inválida o dominio no permitido

**Solución:**
1. Verifica site key en Google Cloud Console
2. Confirma que dominio está en lista permitida
3. Espera 5-10 minutos (propagación)

---

## 💰 Costos

reCAPTCHA v3 de Google:
- **Primeras 10,000 evaluaciones/mes:** Gratis
- **10,001 - 1,000,000:** $1 por 1000 evaluaciones
- **1,000,001+:** Contactar ventas

Para una app pequeña/mediana → **GRATIS**

---

## 🔒 Seguridad Best Practices

1. **NO expongas site key** - Está bien que esté en código frontend (pública por diseño)
2. **NUNCA expongas secret key** - Solo en backend
3. **Rota debug tokens** cada 90 días
4. **Revoca debug tokens** de desarrolladores que dejan el equipo
5. **Monitorea métricas** en Firebase Console → App Check → Metrics

---

## 📊 Verificar Estado Actual

Ejecuta esto para ver estado de Enforcement:

1. Firebase Console → App Check
2. Verás 3 servicios:
   - **Authentication**: Enforcement ON/OFF
   - **Cloud Firestore**: Enforcement ON/OFF
   - **Cloud Storage**: Enforcement ON/OFF

**Si alguno está ON** y tu código no tiene App Check → Error 401

---

## 🚀 Quick Start (TL;DR)

```bash
# 1. Obtener site key de Google Cloud Console
# 2. Registrarla en Firebase Console → App Check
# 3. Actualizar firebase-appcheck.js con site key
# 4. Incluir en HTML ANTES de firebase-config.js
# 5. Obtener debug token en localhost
# 6. Añadir debug token en Firebase Console
# 7. Probar que funciona
# 8. Activar Enforcement gradualmente
```

---

## 📞 Soporte

Si sigues teniendo problemas:
1. Comparte screenshot de Firebase Console → App Check
2. Comparte screenshot de DevTools Console
3. Indica en qué paso específico falla
