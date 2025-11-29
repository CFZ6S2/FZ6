# Habilitación de App Check Enforcement (Aplicación Forzosa)

## 📋 Resumen

Este documento explica cómo habilitar App Check enforcement en producción de manera segura, evitando romper la aplicación.

---

## ⚠️ Estado Actual

**App Check está CONFIGURADO pero NO FORZADO:**
- ✅ Frontend inicializa App Check correctamente
- ✅ Backend verifica tokens cuando están presentes
- ⚠️ Enforcement está DESACTIVADO (permite requests sin token)

**Esto significa:**
- La app funciona con y sin App Check
- No hay riesgo de bloquear usuarios legítimos
- Se recolectan métricas en Firebase Console

---

## 🎯 Objetivo del Enforcement

Cuando enforcement está activado:
- ❌ Requests sin App Check token válido son **rechazados**
- ✅ Solo clientes verificados pueden acceder a recursos protegidos
- 🛡️ Protección completa contra bots y abuso

---

## 📊 Verificar Estado Actual

### 1. Firebase Console - App Check Dashboard

Ve a: https://console.firebase.google.com/project/tuscitasseguras-2d1a6/appcheck

**Verifica:**
- **Authentication:** Enforcement = **Unenforced** ✅
- **Cloud Firestore:** Enforcement = **Unenforced** ✅
- **Cloud Storage:** Enforcement = **Unenforced** ✅
- **Cloud Functions:** No tiene opción de enforcement directo

**Métricas a revisar:**
- % de requests con token válido
- Distribución de scores de reCAPTCHA
- Errores de verificación

### 2. Verificar que el Frontend Envía Tokens

```javascript
// En la consola del navegador (F12) en tucitasegura.com
const token = await window.getAppCheckToken();
console.log('Token:', token ? '✅ Disponible' : '❌ No disponible');
```

### 3. Verificar Cloud Functions

```bash
# Ver si el enforcement está activado en apiProxy
firebase functions:config:get appcheck.enforce_proxy
# Debería retornar: undefined o "false"
```

---

## 🚀 Activación Paso a Paso

### Fase 1: Monitoreo (1-2 semanas) ✅ ACTUAL

**Estado:** App Check configurado pero no forzado

**Objetivo:** Recolectar métricas sin afectar usuarios

**Acciones:**
- ✅ Monitorear dashboard de App Check diariamente
- ✅ Verificar que >95% de requests incluyen token válido
- ✅ Identificar y corregir clientes problemáticos

**Métricas objetivo:**
- Token success rate: >95%
- reCAPTCHA scores promedio: >0.5
- Errores de verificación: <1%

---

### Fase 2: Enforcement en Cloud Functions (Suave)

**Objetivo:** Activar verificación en apiProxy con configuración

#### Paso 1: Activar Enforcement en apiProxy

```bash
# Opción A: Firebase Functions Config
firebase functions:config:set appcheck.enforce_proxy=true
firebase deploy --only functions:apiProxy

# Opción B: Variable de Entorno (recomendado)
# En .env.yaml o en Firebase Console → Functions → Environment Variables
APPCHECK_ENFORCE_PROXY=true
```

#### Paso 2: Verificar que No Rompe Nada

```bash
# Probar endpoints públicos (NO requieren App Check)
curl https://us-central1-tuscitasseguras-2d1a6.cloudfunctions.net/apiProxy/health
# Debería retornar 200

# Probar endpoint protegido SIN App Check token
curl https://us-central1-tuscitasseguras-2d1a6.cloudfunctions.net/apiProxy/api/v1/users/me
# Debería retornar 401 si enforcement está activo

# Probar desde el navegador (CON App Check)
# Debería funcionar normalmente
```

#### Paso 3: Monitorear Logs

```bash
# Ver logs en tiempo real
firebase functions:log --only apiProxy

# Buscar rechazos por App Check
firebase functions:log | grep "app_check_missing_proxy"
```

**Rollback si hay problemas:**
```bash
firebase functions:config:unset appcheck.enforce_proxy
firebase deploy --only functions:apiProxy
```

---

### Fase 3: Enforcement en Firebase Services (Fuerte)

⚠️ **SOLO después de confirmar que Fase 2 funciona perfectamente**

#### Paso 1: Firebase Authentication

1. Ve a: https://console.firebase.google.com/project/tuscitasseguras-2d1a6/appcheck
2. Click en **Authentication**
3. Cambiar de **Unenforced** a **Enforced**
4. Click **Save**

**Impacto:**
- Login/Register requerirán App Check token
- Usuarios sin token no podrán autenticarse

**Test:**
```javascript
// Probar login en modo incógnito
// Debería funcionar SI App Check se inicializa correctamente
```

#### Paso 2: Cloud Firestore

1. En App Check dashboard
2. Click en **Cloud Firestore**
3. Cambiar a **Enforced**

**Impacto:**
- Reads/writes en Firestore requerirán token
- Queries sin token serán rechazadas

#### Paso 3: Cloud Storage

1. En App Check dashboard
2. Click en **Cloud Storage**
3. Cambiar a **Enforced**

**Impacto:**
- Uploads/downloads requerirán token
- Acceso a archivos protegido

---

## 🛡️ Configuración de Rutas Públicas

Algunas rutas NO deben requerir App Check:

### En Cloud Functions (apiProxy)

Las siguientes rutas están exentas automáticamente:
```javascript
const PUBLIC_PATHS = ['/health', '/public'];
```

Para agregar más rutas públicas, edita `functions/index.js`:
```javascript
const PUBLIC_PATHS = [
  '/health',
  '/public',
  '/api/v1/status',      // Agregar
  '/api/v1/public-info'  // Agregar
];
```

### En Firestore Rules

Para permitir lectura pública de ciertos documentos:
```javascript
// firestore.rules
service cloud.firestore {
  match /databases/{database}/documents {
    // Rutas públicas (sin App Check)
    match /public/{document=**} {
      allow read: if true;  // Lectura pública
    }

    // Rutas protegidas (requiere App Check cuando enforcement está activo)
    match /users/{userId} {
      allow read, write: if request.auth != null;
      // App Check se verifica automáticamente si enforcement está activo
    }
  }
}
```

---

## 🔍 Diagnóstico y Troubleshooting

### Problema: "401 Unauthorized" después de activar enforcement

**Causa:** Cliente no está enviando App Check token

**Diagnóstico:**
```javascript
// En la consola del navegador
console.log('App Check Instance:', window._appCheckInstance);
const token = await window.getAppCheckToken();
console.log('Token:', token);
```

**Soluciones:**
1. Verifica que `firebase-appcheck.js` se carga ANTES de hacer requests
2. Verifica que el dominio está en la allowlist de reCAPTCHA
3. Limpia cache y throttling: `await window.clearAppCheckThrottle()`

### Problema: "Requests throttled" en producción

**Causa:** Too many 403 errores causaron throttling de 24h

**Solución en desarrollo:**
```javascript
await window.clearAppCheckThrottle({ force: true });
```

**Solución en producción:**
1. Desactiva enforcement temporalmente
2. Corrige la configuración de reCAPTCHA
3. Espera 24h para que expire el throttle
4. Reactiva enforcement

### Problema: "reCAPTCHA error" en navegador

**Causa:** Dominio no configurado en Google Cloud Console

**Solución:**
1. Ve a: https://console.cloud.google.com/security/recaptcha?project=tuscitasseguras-2d1a6
2. Edita key: `6Lc4QBcsAAAAACFZLEgaTz3DuLGiBuXpScrBKt7w`
3. Agrega dominio: `tucitasegura.com` y `www.tucitasegura.com`

---

## 📊 Métricas de Éxito

Antes de activar enforcement completo, verifica:

- [ ] >98% de requests tienen token válido
- [ ] reCAPTCHA score promedio >0.6
- [ ] Errores de verificación <0.5%
- [ ] Todos los dominios configurados correctamente
- [ ] No hay throttling activo en ningún cliente
- [ ] Tests manuales pasan en todos los navegadores
- [ ] Monitoring y alertas configuradas

---

## 🔄 Rollback Plan

Si algo sale mal después de activar enforcement:

### Rollback Inmediato (Firebase Console)

1. App Check dashboard → Service → Change to **Unenforced**
2. Efecto inmediato (1-2 minutos de propagación)

### Rollback de Cloud Functions

```bash
firebase functions:config:unset appcheck.enforce_proxy
firebase deploy --only functions:apiProxy
```

### Comunicación a Usuarios

Si usuarios están bloqueados:
1. Desactiva enforcement inmediatamente
2. Pide a usuarios limpiar cache del navegador
3. Investiga la causa root
4. Corrige antes de reactivar

---

## 📚 Referencias

- **Firebase App Check Docs:** https://firebase.google.com/docs/app-check
- **reCAPTCHA Enterprise:** https://cloud.google.com/recaptcha-enterprise/docs
- **Guía de Prevención:** `docs/guides/APP_CHECK_PREVENTION.md`
- **Configuración Backend:** `docs/guides/RECAPTCHA_BACKEND_SETUP.md`

---

## 🎯 Checklist Final

Antes de activar enforcement en producción:

- [ ] Fase 1 completada (2+ semanas de monitoreo)
- [ ] >98% de requests con token válido
- [ ] apiProxy enforcement probado y funcionando
- [ ] Todos los dominios en allowlist de reCAPTCHA
- [ ] Debug tokens configurados para desarrollo
- [ ] Rutas públicas correctamente excluidas
- [ ] Plan de rollback documentado y probado
- [ ] Equipo notificado del cambio
- [ ] Monitoring activo durante activación
- [ ] Horario de baja demanda para deployment

**Solo activa enforcement cuando TODOS los checkboxes estén marcados.** ✅
