# Firebase Console - Pasos Exactos para Registrar Debug Token

## 🎯 Tu Debug Token
```
cb4a5b8b-3dbf-40af-b973-0115297ecb84
```

---

## 📋 Paso a Paso (con URLs directas)

### PASO 1: Abrir Firebase Console - App Check

**URL directa:**
```
https://console.firebase.google.com/project/tuscitasseguras-2d1a6/appcheck
```

O navega manualmente:
1. Ve a https://console.firebase.google.com/
2. Selecciona proyecto: **tuscitasseguras-2d1a6**
3. En menú lateral izquierdo, haz clic en **"App Check"**

---

### PASO 2: Verificar Estado de Enforcement

En la página de App Check, verás una tabla con 3 servicios:

| Service | Status |
|---------|--------|
| Authentication | Enforced/Unenforced |
| Cloud Firestore | Enforced/Unenforced |
| Cloud Storage | Enforced/Unenforced |

**IMPORTANTE:** Si alguno muestra "Enforced", **cámbialo temporalmente a "Unenforced"**:
- Haz clic en el servicio
- Haz clic en botón "Unenforce"
- Confirma

**Por qué:** Enforcement bloquea requests sin App Check token válido. Necesitas desactivarlo mientras registras el debug token y pruebas.

---

### PASO 3: Ir a Apps Tab

En la misma página de App Check:
1. Haz clic en tab **"Apps"** (al lado de "Overview")
2. Verás tu web app listada

**Información de tu app:**
```
Display name: (Probablemente "TuCitaSegura" o nombre similar)
App ID: 1:924208562587:web:5291359426fe390b36213e
```

---

### PASO 4: Registrar Debug Token

Hay 2 formas de hacerlo:

#### Opción A: Desde la app específica
1. En la lista de Apps, encuentra tu web app
2. Haz clic en los **tres puntos** (⋮) al lado derecho
3. Selecciona **"Manage debug tokens"**
4. Haz clic en **"+ Add debug token"**
5. Pega el token:
   ```
   cb4a5b8b-3dbf-40af-b973-0115297ecb84
   ```
6. Display name (opcional): `Localhost Development`
7. Haz clic en **"Add"** o **"Save"**

#### Opción B: Desde Overview
1. En tab "Overview" de App Check
2. Scroll hacia abajo hasta sección **"Debug tokens"**
3. Haz clic en **"Add debug token"**
4. Pega el token:
   ```
   cb4a5b8b-3dbf-40af-b973-0115297ecb84
   ```
5. Display name: `Localhost Development`
6. Haz clic en **"Add"**

---

### PASO 5: Verificar que el Token fue Registrado

Deberías ver:
```
Debug tokens (1)
- cb4a5b8b-3dbf-40af-b973-0115297ecb84
  Display name: Localhost Development
  Status: Active
  Created: [fecha/hora actual]
```

---

### PASO 6: Verificar Configuración de reCAPTCHA (Opcional)

1. Scroll en la página de App Check
2. Busca tu web app en la lista
3. Verifica que muestra:
   ```
   Provider: reCAPTCHA v3
   Site key: 6LfdTvQrAAAAACkGjvbbFIkqHMsTHwRYYZS_CGq2
   Status: Registered
   ```

Si no está registrada:
1. Haz clic en la app
2. Haz clic en **"Register"** bajo reCAPTCHA v3
3. Pega la site key:
   ```
   6LfdTvQrAAAAACkGjvbbFIkqHMsTHwRYYZS_CGq2
   ```
4. Guarda

---

## ✅ Después de Registrar el Token

### 1. Volver a tu App
```
http://127.0.0.1:5500/webapp/verify-appcheck.html
```

O la página que estabas usando.

### 2. Hard Reload
```
Ctrl + Shift + R
```

O:
```
Cmd + Shift + R  (Mac)
```

### 3. Abrir DevTools Console
```
F12  o  Ctrl + Shift + I
```

### 4. Verificar Console Output

**Deberías ver:**
```javascript
🔧 App Check Debug Mode ACTIVADO
✅ App Check inicializado correctamente
📍 Modo: DESARROLLO (debug tokens)
🧪 Verificando App Check...
✅ App Check Token obtenido: eyJhbGc...
✅ App Check funcionando correctamente
```

**NO deberías ver:**
```javascript
❌ POST ...exchangeDebugToken 403 (Forbidden)
❌ Could not reach Cloud Firestore backend
❌ Failed to get document because the client is offline
```

---

## 🐛 Si Sigue Error 403

### Solución 1: Esperar Propagación
A veces toma 1-2 minutos para que Firebase procese el token nuevo.
- Espera 2 minutos
- Recarga: `Ctrl + Shift + R`

### Solución 2: Limpiar Cache Completo
```javascript
// En DevTools Console
localStorage.clear();
sessionStorage.clear();
```
Luego recarga: `Ctrl + Shift + R`

### Solución 3: Cerrar y Reabrir Navegador
Completamente cierra el navegador y ábrelo de nuevo.

### Solución 4: Generar Nuevo Token
1. Limpia localStorage:
   ```javascript
   localStorage.clear();
   ```
2. Recarga la página
3. **Copia el NUEVO token** que aparece en console
4. **Registra el nuevo token** en Firebase Console
5. **Revoca el token viejo** (opcional)

### Solución 5: Verificar Enforcement
Firebase Console → App Check:
- ✅ **Authentication** → Debe estar "Unenforced"
- ✅ **Cloud Firestore** → Debe estar "Unenforced"
- ✅ **Cloud Storage** → Debe estar "Unenforced"

Si alguno está "Enforced", cámbialo a "Unenforced".

---

## 📊 Resumen Visual del Estado Esperado

### Firebase Console → App Check → Overview

```
┌─────────────────────────────────────────────────┐
│ Enforcement                                     │
├─────────────────────────────────────────────────┤
│ ○ Authentication        | Unenforced           │
│ ○ Cloud Firestore       | Unenforced           │
│ ○ Cloud Storage         | Unenforced           │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│ Debug tokens                           (1)      │
├─────────────────────────────────────────────────┤
│ • cb4a5b8b-3dbf-40af-b973-0115297ecb84         │
│   Localhost Development                         │
│   Active • Created today                        │
└─────────────────────────────────────────────────┘
```

### Firebase Console → App Check → Apps

```
┌─────────────────────────────────────────────────┐
│ Apps                                            │
├─────────────────────────────────────────────────┤
│ Web App                                         │
│ 1:924208562587:web:5291359426fe390b36213e      │
│                                                 │
│ Provider: reCAPTCHA v3                          │
│ Site key: 6LfdTvQrAAAAA...                      │
│ Status: ✅ Registered                           │
└─────────────────────────────────────────────────┘
```

---

## 🎯 Quick Checklist

Marca cuando completes cada paso:

- [ ] Abrí Firebase Console → App Check
- [ ] Verifiqué que Enforcement está "Unenforced" para Auth/Firestore/Storage
- [ ] Fui a Apps tab
- [ ] Hice clic en "Manage debug tokens"
- [ ] Agregué token: `cb4a5b8b-3dbf-40af-b973-0115297ecb84`
- [ ] Guardé el token
- [ ] Veo el token en la lista (status: Active)
- [ ] Recargué mi app con `Ctrl + Shift + R`
- [ ] Abrí DevTools Console (F12)
- [ ] Veo "✅ App Check funcionando correctamente"
- [ ] NO veo error 403 Forbidden
- [ ] NO veo "Could not reach Cloud Firestore backend"

---

## 📞 Screenshots de Referencia

Si no encuentras dónde hacer algo, busca:

### En Overview:
- Botón **"+ Add debug token"** (arriba a la derecha en sección Debug tokens)

### En Apps:
- **Tres puntos** (⋮) al lado de cada app
- Opción **"Manage debug tokens"** en el menú desplegable

### En cada servicio (Auth/Firestore/Storage):
- Botón **"Enforce"** o **"Unenforce"** dependiendo del estado actual

---

**Última actualización:** 2025-11-10
**Debug Token:** `cb4a5b8b-3dbf-40af-b973-0115297ecb84`
