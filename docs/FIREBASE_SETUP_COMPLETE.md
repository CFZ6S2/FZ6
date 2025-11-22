# 🔥 Guía Completa de Configuración de Firebase

> **Proyecto:** TuCitaSegura
> **Firebase Project ID:** `tuscitasseguras-2d1a6`
> **Fecha:** 2025-11-14

---

## 📋 Checklist de Configuración

### ✅ 1. Firebase Hosting (ARREGLADO)

**Problema Original:**
- El `firebase.json` tenía un rewrite que redirigía todo a `index.html`
- Causaba error 403 y problemas de routing

**Solución Aplicada:**
```json
{
  "hosting": {
    "public": ".",
    "cleanUrls": true,
    "trailingSlash": false,
    "headers": [
      // Cache optimization configurado
    ]
  }
}
```

✅ **Estado:** ARREGLADO - Listo para desplegar

---

### ✅ 2. App Check con reCAPTCHA Enterprise (CONFIGURADO)

**Configuración Actual:**
```javascript
// webapp/js/firebase-appcheck.js
const RECAPTCHA_ENTERPRISE_SITE_KEY = '6LfdTvQrAAAAACkGjvbbFIkqHMsTHwRYYZS_CGq2';
```

**Modo Debug Activado:**
- Localhost detectado automáticamente
- Debug tokens se generan automáticamente en consola
- Auto-verificación cada 2 segundos

**⚠️ Acción Requerida (Manual):**

1. **Verificar Site Key en Firebase Console:**
   ```
   https://console.firebase.google.com/project/tuscitasseguras-2d1a6/appcheck
   ```
   - Ir a "Apps" tab
   - Registrar site key si no está registrado
   - Provider: reCAPTCHA Enterprise

2. **Verificar Dominios en reCAPTCHA Console:**
   ```
   https://console.cloud.google.com/security/recaptcha?project=tuscitasseguras-2d1a6
   ```
   - Debe incluir: `localhost`, `127.0.0.1`
   - Debe incluir: `*.web.app`, `*.firebaseapp.com`
   - Debe incluir tu dominio personalizado: `rpx2sfurzwd7y.ok.kimi.link`

3. **Desactivar Enforcement (Desarrollo):**
   - Firebase Console → App Check → Overview
   - Authentication: **Unenforced**
   - Cloud Firestore: **Unenforced**
   - Cloud Storage: **Unenforced**

4. **Agregar Debug Tokens (Desarrollo):**
   - Abrir `http://localhost:8000` en navegador
   - Abrir DevTools Console
   - Copiar el debug token que aparece
   - Firebase Console → App Check → Debug tokens → Add token

✅ **Estado:** CONFIGURADO - Requiere verificación manual

---

### ⚠️ 3. VAPID Key para Push Notifications (PENDIENTE)

**Ubicación Actual:**
```javascript
// webapp/js/firebase-config.js línea 46
export const VAPID_PUBLIC_KEY = 'BNxxxxxxx...'; // TODO
```

**⚠️ Acción Requerida (CRÍTICO para Notificaciones Push):**

#### Paso 1: Generar VAPID Key

1. **Ir a Firebase Console → Cloud Messaging:**
   ```
   https://console.firebase.google.com/project/tuscitasseguras-2d1a6/settings/cloudmessaging
   ```

2. **Generar Web Push Certificate:**
   - Scroll hasta "Web Push certificates"
   - Si no existe, click "Generate key pair"
   - Copiar el public key (empieza con "B", 88 caracteres)

#### Paso 2: Actualizar Código

1. **Editar:** `webapp/js/firebase-config.js`
2. **Reemplazar línea 46:**
   ```javascript
   export const VAPID_PUBLIC_KEY = 'TU_KEY_AQUI';
   ```

3. **Verificar longitud:** 88 caracteres empezando con "B"

#### Ejemplo:
```javascript
// ✅ CORRECTO
export const VAPID_PUBLIC_KEY = 'BNxxx...xxx'; // 88 chars

// ❌ INCORRECTO
export const VAPID_PUBLIC_KEY = 'BNxxxxxxx...'; // placeholder
```

❌ **Estado:** PENDIENTE - Requiere configuración manual

---

### ✅ 4. Firestore Security Rules (LISTO PARA DESPLEGAR)

**Archivo:** `firestore.rules` (542 líneas)

**Validaciones Implementadas:**
- ✅ Edad 18+ obligatoria en registro
- ✅ Pago de membresía para hombres (chat)
- ✅ Seguro anti-plantón para hombres (citas)
- ✅ Roles: regular, admin, concierge
- ✅ Custom claims para optimización
- ✅ Filtrado heterosexual (frontend + backend)

**Comando de Despliegue:**
```bash
firebase deploy --only firestore:rules
```

✅ **Estado:** LISTO - Pendiente de desplegar

---

### ✅ 5. Firebase Storage Rules (LISTO PARA DESPLEGAR)

**Archivo:** `firebase-storage.rules`

**Paths Configurados:**
- `/profile_photos/{gender}/{userId}/{filename}` - Fotos de perfil
- `/event_photos/{eventId}/{filename}` - Fotos de eventos VIP
- `/sos_evidence/{userId}/{filename}` - Evidencia de reportes SOS
- `/verification_docs/{userId}/{filename}` - Documentos de verificación

**Comando de Despliegue:**
```bash
firebase deploy --only storage
```

✅ **Estado:** LISTO - Pendiente de desplegar

---

### 🔄 6. Cloud Functions (LISTO PARA DESPLEGAR)

**Archivo:** `functions/index.js` (648 líneas, 7+ funciones)

**Funciones Implementadas:**

1. **`onUserDocCreate`** - Trigger al crear usuario
   - Establece custom claims (role, gender)
   - Sincroniza datos de autenticación

2. **`onUserDocUpdate`** - Trigger al actualizar usuario
   - Actualiza custom claims cuando cambian role/gender
   - Sincroniza payment status

3. **`syncChatACL`** - Manejo de ACLs de Storage
   - Permisos de archivos en chats
   - Seguridad de attachments

4. **`updateUserClaims`** (Callable) - Admin only
   - Actualización manual de claims
   - Para correcciones o migraciones

5. **`getUserClaims`** (Callable)
   - Ver custom claims de usuario
   - Debugging de permisos

**Comandos de Despliegue:**
```bash
# Instalar dependencias
cd functions
npm install

# Deploy todas las funciones
firebase deploy --only functions

# Deploy función específica
firebase deploy --only functions:onUserDocCreate
```

✅ **Estado:** LISTO - Pendiente de desplegar

---

## 🚀 Comandos de Despliegue Completo

### Preparación (Una sola vez)

```bash
# 1. Instalar Firebase CLI (si no está instalado)
npm install -g firebase-tools

# 2. Login a Firebase
firebase login

# 3. Verificar proyecto
firebase projects:list
```

### Despliegue Completo

```bash
# Desde la raíz del proyecto t2c06/

# 1. Desplegar Firestore Rules
firebase deploy --only firestore:rules

# 2. Desplegar Storage Rules
firebase deploy --only storage

# 3. Desplegar Cloud Functions
cd functions && npm install && cd ..
firebase deploy --only functions

# 4. Desplegar Hosting
firebase deploy --only hosting

# 5. Ver URLs
firebase hosting:sites:list
```

### Despliegue Todo en Uno

```bash
# ⚠️ CUIDADO: Despliega TODO (rules, functions, hosting)
firebase deploy
```

---

## 🔍 Verificación Post-Despliegue

### 1. Verificar Hosting

```bash
# Ver URLs de hosting
firebase hosting:sites:list

# Ver logs
firebase hosting:channel:list
```

**URL Esperada:**
```
https://tuscitasseguras-2d1a6.web.app
https://tuscitasseguras-2d1a6.firebaseapp.com
```

### 2. Verificar Firestore Rules

```bash
# Ver reglas activas
firebase firestore:rules get

# Testing en Firebase Console
# https://console.firebase.google.com/project/tuscitasseguras-2d1a6/firestore/rules
# → Click "Rules Playground"
```

### 3. Verificar Cloud Functions

```bash
# Listar funciones desplegadas
firebase functions:list

# Ver logs en tiempo real
firebase functions:log --only onUserDocCreate

# Ver logs generales
firebase functions:log
```

### 4. Verificar App Check

**En navegador:**
```javascript
// DevTools Console
await window.getAppCheckToken();
```

**Esperado:**
```
✅ App Check funcionando correctamente
✅ Todas las requests incluirán App Check tokens
```

---

## ⚠️ Troubleshooting

### Error 403 en Hosting

**Causa:** App Check o CORS

**Solución:**
1. Verificar App Check Enforcement está en "Unenforced"
2. Agregar dominio a reCAPTCHA Enterprise
3. Agregar debug token en Firebase Console

### Error 401 en Firestore

**Causa:** Firestore Rules no desplegadas

**Solución:**
```bash
firebase deploy --only firestore:rules
```

### Error "Cannot read property 'role' of undefined"

**Causa:** Custom claims no establecidos

**Solución:**
1. Verificar Cloud Functions desplegadas
2. Crear nuevo usuario (triggers se ejecutan automáticamente)
3. O migrar usuarios existentes con script:
```bash
node functions/scripts/update-existing-users.js
```

### Notificaciones Push no funcionan

**Causa:** VAPID key no configurada

**Solución:**
1. Generar VAPID key en Firebase Console
2. Actualizar `webapp/js/firebase-config.js`
3. Redesplegar hosting

---

## 📊 Estado General del Proyecto

| Componente | Estado | Acción Requerida |
|------------|--------|------------------|
| **Firebase Hosting** | ✅ Configurado | Desplegar |
| **App Check** | ✅ Configurado | Verificar manualmente |
| **VAPID Key** | ❌ Pendiente | Generar y configurar |
| **Firestore Rules** | ✅ Listo | Desplegar |
| **Storage Rules** | ✅ Listo | Desplegar |
| **Cloud Functions** | ✅ Listo | Desplegar |

---

## 🎯 Próximos Pasos

1. ✅ **Completar configuración de VAPID Key**
2. 🚀 **Desplegar todo a Firebase**
3. 🧪 **Probar en producción**
4. 📊 **Monitorear errores**
5. 🔧 **Ajustar según feedback**

---

## 📞 Soporte

**Documentación:**
- Ver `APPCHECK_400_ERROR_FIX.md` para errores de App Check
- Ver `CLAUDE.md` para guía completa del proyecto
- Ver `FIRESTORE_SECURITY_RULES.md` para detalles de rules

**Firebase Console:**
- Proyecto: https://console.firebase.google.com/project/tuscitasseguras-2d1a6
- App Check: https://console.firebase.google.com/project/tuscitasseguras-2d1a6/appcheck
- Functions: https://console.firebase.google.com/project/tuscitasseguras-2d1a6/functions
- Hosting: https://console.firebase.google.com/project/tuscitasseguras-2d1a6/hosting

---

**Última actualización:** 2025-11-14
**Estado:** Listo para desplegar (pendiente VAPID key)
