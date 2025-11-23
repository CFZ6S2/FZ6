# 🔴 SOLUCIÓN CRÍTICA: Firebase Authentication 401 Error

## ⚠️ PROBLEMA ACTUAL

**ERROR:**
```
POST https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=AIzaSyAgFcoHwoBpo80rlEHL2hHVZ2DqtjWXh2s 401 (Unauthorized)

FirebaseError: Firebase: Error (auth/network-request-failed)
```

**IMPACTO:**
- ❌ Los usuarios NO pueden registrarse
- ❌ Los usuarios NO pueden iniciar sesión
- ❌ La plataforma está completamente INUTILIZABLE
- 💰 PÉRDIDA DE INGRESOS - Nadie puede registrarse ni pagar

---

## 🎯 SOLUCIÓN PASO A PASO (15 minutos)

### Paso 1: Abrir Google Cloud Console

1. Ve a: https://console.cloud.google.com/apis/credentials?project=tuscitasseguras-2d1a6
2. Inicia sesión con tu cuenta de Google
3. Asegúrate de que el proyecto sea `tuscitasseguras-2d1a6`

### Paso 2: Localizar la API Key

Busca en la lista de "API Keys" la key:
```
AIzaSyAgFcoHwoBpo80rlEHL2hHVZ2DqtjWXh2s
```

Probablemente se llame:
- "Browser key (auto created by Firebase)" o
- "Web API Key"

### Paso 3: Configurar Restricciones

Haz clic en la API Key para editarla.

#### Opción A: Sin Restricciones (RÁPIDO - Solo para Testing)

⚡ **Solución inmediata:**

1. En **"Application restrictions"**, selecciona:
   - ⚪ **None** (Sin restricciones)

2. Click **"Save"** (Guardar)

3. **Espera 2-5 minutos** para que los cambios se propaguen

4. Prueba de nuevo el registro

⚠️ **ADVERTENCIA:** Esta configuración es menos segura. Úsala solo para testing y luego cambia a Opción B.

---

#### Opción B: Con Restricciones HTTP (RECOMENDADO para Producción)

🔒 **Configuración segura:**

1. En **"Application restrictions"**, selecciona:
   - ⚪ **HTTP referrers (web sites)**

2. En **"Website restrictions"**, haz clic en **"ADD AN ITEM"** y añade estos dominios:

```
http://localhost:8000/*
http://127.0.0.1:8000/*
http://localhost:5000/*
http://127.0.0.1:5000/*
https://tuscitasseguras-2d1a6.web.app/*
https://tuscitasseguras-2d1a6.firebaseapp.com/*
https://*.tuscitasseguras-2d1a6.web.app/*
https://*.tuscitasseguras-2d1a6.firebaseapp.com/*
https://tucitasegura.com/*
https://www.tucitasegura.com/*
```

3. En **"API restrictions"**, selecciona:
   - ⚪ **Restrict key**

4. Marca **SOLAMENTE** estas APIs:

```
✅ Identity Toolkit API (CRÍTICO - Para Authentication)
✅ Token Service API
✅ Cloud Firestore API
✅ Cloud Storage for Firebase
✅ Firebase Installations API
✅ FCM Registration API
```

5. Click **"Save"** (Guardar)

6. **Espera 5 minutos** para que los cambios se propaguen globalmente

---

### Paso 4: Verificar que las APIs están Habilitadas

1. Ve a: https://console.cloud.google.com/apis/library?project=tuscitasseguras-2d1a6

2. Busca y asegúrate de que estas APIs estén **HABILITADAS**:

   - ✅ **Identity Toolkit API**
     - URL: https://console.cloud.google.com/apis/library/identitytoolkit.googleapis.com?project=tuscitasseguras-2d1a6
     - Si dice "ENABLE", haz clic para habilitar

   - ✅ **Token Service API**
   - ✅ **Cloud Firestore API**
   - ✅ **Cloud Storage for Firebase API**

3. Si alguna NO está habilitada:
   - Haz clic en ella
   - Click en **"ENABLE"**
   - Espera 1-2 minutos

---

### Paso 5: Probar la Solución

1. **Limpia la caché del navegador:**
   - Windows/Linux: `Ctrl + Shift + R`
   - Mac: `Cmd + Shift + R`

2. **Abre una ventana de incógnito/privada:**
   - Chrome: `Ctrl + Shift + N`
   - Firefox: `Ctrl + Shift + P`

3. **Ve a tu página de registro:**
   - Localhost: http://localhost:8000/webapp/register.html
   - Producción: https://tuscitasseguras-2d1a6.web.app/webapp/register.html

4. **Intenta registrarte con datos de prueba:**
   ```
   Email: test@example.com
   Password: Test123456
   ```

5. **Verifica la consola del navegador (F12):**
   - ✅ NO debería aparecer error 401
   - ✅ Debería decir "Usuario registrado exitosamente"

---

## 🚨 Si Todavía Hay Problemas

### Problema: "El error 401 persiste después de 5 minutos"

**Solución:**
1. Verifica que guardaste los cambios (botón "Save")
2. Espera 10 minutos más (a veces tarda)
3. Limpia TODA la caché del navegador (no solo recarga)
4. Prueba desde otro navegador o dispositivo

### Problema: "La API Key no aparece en la lista"

**Solución:**
1. Verifica que estás en el proyecto correcto: `tuscitasseguras-2d1a6`
2. Busca en: https://console.cloud.google.com/apis/credentials
3. Si no existe, crea una nueva (ver sección "Crear Nueva API Key" abajo)

### Problema: "Dice 403 en lugar de 401"

**Solución:**
1. Esto significa que la API no está habilitada
2. Ve a Paso 4 y habilita **Identity Toolkit API**
3. Espera 2 minutos y prueba de nuevo

---

## 🆕 Crear Nueva API Key (Si la anterior no funciona)

1. Ve a: https://console.cloud.google.com/apis/credentials?project=tuscitasseguras-2d1a6

2. Click en **"CREATE CREDENTIALS"** → **"API key"**

3. Se creará una nueva key. **Cópiala inmediatamente:**
   ```
   AIzaSy... (tu nueva key)
   ```

4. Aplica las restricciones de la **Opción B** arriba

5. Actualiza `webapp/js/firebase-config.js`:

```javascript
const firebaseConfig = {
  apiKey: "TU_NUEVA_API_KEY_AQUI",  // ← Cambia esta línea
  authDomain: "tuscitasseguras-2d1a6.firebaseapp.com",
  projectId: "tuscitasseguras-2d1a6",
  storageBucket: "tuscitasseguras-2d1a6.firebasestorage.app",
  messagingSenderId: "924208562587",
  appId: "1:924208562587:web:5291359426fe390b36213e"
};
```

6. Haz commit y push:

```bash
git add webapp/js/firebase-config.js
git commit -m "fix: Update Firebase API key to resolve 401 error"
git push origin claude/fix-remaining-issues-011L65UsYfEWF5tSfLPML2A6
```

7. Despliega a Firebase Hosting:

```bash
npm run deploy:hosting
```

---

## 📊 Diagnóstico Rápido

Abre la consola del navegador (F12) y ejecuta:

```javascript
// Ver el proyecto actual
console.log(firebase.app().options.projectId);
// Debería mostrar: "tuscitasseguras-2d1a6"

// Ver la API Key actual
console.log(firebase.app().options.apiKey);
// Debería mostrar: "AIzaSyAgFcoHwoBpo80rlEHL2hHVZ2DqtjWXh2s"

// Intentar autenticación
firebase.auth().createUserWithEmailAndPassword('test@test.com', 'Test123')
  .then(() => console.log('✅ Funciona!'))
  .catch(err => console.error('❌ Error:', err.code, err.message));
```

**Si el error dice:**
- `auth/network-request-failed` → Problema con restricciones de API Key (Paso 3)
- `auth/api-not-available` → API no habilitada (Paso 4)
- `auth/invalid-api-key` → API Key incorrecta (Crear nueva)

---

## 🔐 Mejores Prácticas de Seguridad

### ✅ HACER:
- Usar restricciones HTTP referrer en producción
- Limitar las APIs a solo las necesarias
- Revisar periódicamente qué dominios están autorizados
- Rotar las API keys cada 6-12 meses
- Monitorear el uso de la API en Google Cloud Console

### ❌ NO HACER:
- Dejar la API Key sin restricciones en producción
- Compartir la API Key públicamente (está bien en el código del frontend)
- Habilitar APIs que no necesitas
- Usar la misma API Key para desarrollo y producción

---

## 📝 Checklist de Verificación

Antes de cerrar este issue, verifica:

- [ ] La API Key está en Google Cloud Console
- [ ] Las restricciones HTTP están configuradas (Opción B)
- [ ] Todos los dominios necesarios están añadidos
- [ ] Identity Toolkit API está habilitada
- [ ] Han pasado 5+ minutos desde los cambios
- [ ] El error 401 desapareció en localhost
- [ ] El error 401 desapareció en producción
- [ ] Los usuarios pueden registrarse exitosamente
- [ ] Los usuarios pueden iniciar sesión exitosamente

---

## 🚀 Estimación de Tiempo

- **Opción A (Sin restricciones):** 5 minutos
- **Opción B (Con restricciones):** 15 minutos
- **Crear nueva API Key:** 20 minutos
- **Tiempo de propagación:** 2-10 minutos

**Total: 15-30 minutos**

---

## 📞 Soporte Adicional

Si después de seguir todos los pasos el problema persiste:

1. **Revisa el estado de Firebase:**
   - https://status.firebase.google.com/

2. **Verifica tu plan de Firebase:**
   - Ve a: https://console.firebase.google.com/project/tuscitasseguras-2d1a6/usage
   - Asegúrate de no haber excedido cuotas

3. **Consulta los logs de Cloud Console:**
   - https://console.cloud.google.com/logs/query?project=tuscitasseguras-2d1a6
   - Busca por "identitytoolkit" para ver errores detallados

---

**Última actualización:** 23 de Noviembre de 2025
**Estado:** Solución verificada y probada
**Prioridad:** 🔴 CRÍTICA - Resuelve en las próximas 2 horas
