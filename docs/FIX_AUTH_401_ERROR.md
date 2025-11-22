# 🔧 Solución: Error 401 en Firebase Authentication

## Error Actual

```
POST https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=AIzaSyAgFcoHwoBpo80rlEHL2hHVZ2DqtjWXh2s 401 (Unauthorized)

FirebaseError: Firebase: Error (auth/network-request-failed)
```

## Causa

Tu **API Key de Firebase tiene restricciones HTTP** que están bloqueando las solicitudes de autenticación desde tu dominio actual.

## Solución Paso a Paso

### 1. Ve a Google Cloud Console

Abre: https://console.cloud.google.com/apis/credentials?project=tuscitasseguras-2d1a6

### 2. Encuentra tu API Key

Busca la API Key: `AIzaSyAgFcoHwoBpo80rlEHL2hHVZ2DqtjWXh2s`

- Debería aparecer en la lista de "API Keys"
- Probablemente se llama algo como "Browser key (auto created by Firebase)"

### 3. Edita las Restricciones

Haz clic en la API Key para editarla, luego:

#### Opción A: Sin Restricciones (Más Rápido - Para Testing)

1. En **"Application restrictions"**, selecciona:
   - ⚪ **None** (Sin restricciones)

2. Guarda los cambios

⚠️ **NOTA:** Esto es menos seguro pero funciona inmediatamente. Úsalo solo para testing.

#### Opción B: Con Restricciones HTTP Referrer (Recomendado para Producción)

1. En **"Application restrictions"**, selecciona:
   - ⚪ **HTTP referrers (web sites)**

2. En **"Website restrictions"**, añade los siguientes dominios:
   ```
   http://localhost:8000/*
   http://127.0.0.1:8000/*
   https://tuscitasseguras-2d1a6.web.app/*
   https://tuscitasseguras-2d1a6.firebaseapp.com/*
   https://*.tuscitasseguras-2d1a6.web.app/*
   ```

3. En **"API restrictions"**, selecciona:
   - ⚪ **Restrict key**
   - Marca SOLO estas APIs:
     - ✅ Identity Toolkit API
     - ✅ Token Service API
     - ✅ Cloud Firestore API
     - ✅ Firebase Storage API
     - ✅ Firebase Installations API
     - ✅ FCM Registration API

4. Guarda los cambios

### 4. Espera 2-5 Minutos

Los cambios de API Key pueden tardar unos minutos en propagarse.

### 5. Recarga y Prueba

1. Limpia caché: `Ctrl + Shift + R` (o `Cmd + Shift + R` en Mac)
2. Intenta registrarte de nuevo
3. El error 401 debería desaparecer

---

## Verificación Adicional

Si el problema persiste, verifica que las APIs estén habilitadas:

### 1. Ve a APIs Habilitadas

https://console.cloud.google.com/apis/library?project=tuscitasseguras-2d1a6

### 2. Busca y Habilita (si no lo están):

- ✅ **Identity Toolkit API** (para Firebase Authentication)
- ✅ **Token Service API**
- ✅ **Cloud Firestore API**
- ✅ **Cloud Storage for Firebase API**

---

## Solución Alternativa: Crear Nueva API Key

Si lo anterior no funciona, crea una nueva API Key:

### 1. En Google Cloud Console

https://console.cloud.google.com/apis/credentials?project=tuscitasseguras-2d1a6

### 2. Click en "CREATE CREDENTIALS"

- Selecciona: **API key**

### 3. Configura la Nueva Key

- Copia la nueva API key
- Aplica las restricciones del **Opción B** arriba

### 4. Actualiza firebase-config.js

Edita `/home/user/t2c06/webapp/js/firebase-config.js`:

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

### 5. Commit y Despliega

```bash
git add webapp/js/firebase-config.js
git commit -m "fix: Update Firebase API key"
git push
npm run deploy:hosting
```

---

## Diagnóstico Rápido

Para verificar si el problema es la API Key:

1. Abre la consola del navegador (F12)
2. Ve a la pestaña **Network**
3. Intenta registrarte
4. Busca la solicitud a `identitytoolkit.googleapis.com`
5. Verifica el código de estado:
   - **401:** API Key con restricciones incorrectas
   - **403:** API no habilitada o dominio bloqueado
   - **400:** Problema con los datos enviados

---

## Resumen

✅ **Paso 1:** Ir a Google Cloud Console → API Credentials
✅ **Paso 2:** Editar API Key `AIzaSyAgFcoHwoBpo80rlEHL2hHVZ2DqtjWXh2s`
✅ **Paso 3:** Quitar restricciones HTTP (temporalmente) o añadir dominios
✅ **Paso 4:** Esperar 2-5 minutos
✅ **Paso 5:** Recargar y probar

**Tiempo estimado:** 5-10 minutos

---

**Última actualización:** 2025-11-14
