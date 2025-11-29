# 📡 TuCitaSegura API - Endpoints Disponibles

**Base URL:** `https://fz6-production.up.railway.app`
**Versión:** 1.0.0
**Documentación Interactiva:** https://fz6-production.up.railway.app/docs

---

## 🚀 Estado de los Endpoints

| Categoría | Endpoints | Estado | Auth Required |
|-----------|-----------|--------|---------------|
| Health | 3 | ✅ Funcionando | No |
| Security | 3 | ✅ Funcionando | No |
| API Info | 2 | ✅ Funcionando | No |
| Payments | 5+ | ⚠️ Requiere PayPal | Sí |
| Emergency | 5+ | ⚠️ Requiere Firebase | Sí |
| Admin | 2+ | ⚠️ Requiere Firebase | Sí (Admin) |

---

## 🏥 Health & Monitoring

### GET `/health`
**Status:** ✅ Funcionando
**Auth:** No
**Rate Limit:** 60/minute

**Respuesta:**
```json
{
  "status": "healthy",
  "version": "unknown",
  "timestamp": "2025-11-22T08:30:11.508607",
  "services": {
    "api": "running",
    "firebase": "unavailable"
  }
}
```

**Test:**
```javascript
fetch('https://fz6-production.up.railway.app/health')
  .then(r => r.json())
  .then(d => console.log(d));
```

---

### GET `/health/detailed`
**Status:** ✅ Funcionando
**Auth:** No
**Rate Limit:** 30/minute

**Descripción:** Health check detallado sin caché. Verifica estado de:
- Firestore
- Firebase Auth
- PayPal API
- reCAPTCHA

**Respuesta (cuando Firebase esté configurado):**
```json
{
  "status": "healthy",
  "checks": {
    "firestore": "connected",
    "firebase_auth": "available",
    "paypal": "configured",
    "recaptcha": "configured"
  },
  "elapsed_ms": 123.45
}
```

---

### GET `/`
**Status:** ✅ Funcionando
**Auth:** No
**Rate Limit:** 60/minute

**Descripción:** Root endpoint - igual que `/health`

---

## 🔒 Security & Info

### GET `/security-info`
**Status:** ✅ Funcionando
**Auth:** No
**Rate Limit:** 30/minute

**Respuesta:**
```json
{
  "environment": "production",
  "security_headers": {
    "hsts_enabled": true,
    "csp_report_uri": "not configured"
  },
  "cors_origins": ["[HIDDEN FOR SECURITY]"],
  "rate_limiting": "enabled",
  "firebase_auth": "disabled",
  "csrf_protection": "enabled"
}
```

**Test:**
```javascript
fetch('https://fz6-production.up.railway.app/security-info')
  .then(r => r.json())
  .then(d => console.log('Environment:', d.environment));
```

---

### GET `/api/csrf-token`
**Status:** ✅ Funcionando
**Auth:** No
**Rate Limit:** 60/minute

**Descripción:** Obtiene token CSRF para requests POST/PUT/DELETE

**Respuesta:**
```json
{
  "csrf_token": "token_value",
  "header_name": "X-CSRF-Token",
  "info": "Include this token in the X-CSRF-Token header for POST/PUT/DELETE requests"
}
```

---

### GET `/debug`
**Status:** ✅ Funcionando
**Auth:** No
**Rate Limit:** 10/minute

**Descripción:** Información de debug (environment vars, cwd, port)

**⚠️ NOTA:** Este endpoint debería deshabilitarse en producción por seguridad.

---

## 📊 API Version Info

### GET `/v1/info`
**Status:** ✅ Funcionando
**Auth:** No

**Respuesta:**
```json
{
  "version": "1.0.0",
  "status": "stable",
  "deprecated": false,
  "features": [
    "payments",
    "emergency_phones",
    "authentication",
    "sos_alerts",
    "vip_events",
    "subscriptions",
    "matching",
    "messaging"
  ],
  "base_path": "/v1",
  "documentation": "/docs"
}
```

---

### GET `/v1/`
**Status:** ✅ Funcionando
**Auth:** No

**Descripción:** Root endpoint de API v1

---

## 💳 Payments (PayPal)

**⚠️ Requiere configuración:**
- `PAYPAL_CLIENT_ID`
- `PAYPAL_CLIENT_SECRET`
- `PAYPAL_MODE` (sandbox/live)

### POST `/api/payments/paypal/create-order`
**Auth:** ✅ Requerido (Firebase + Email verificado)
**Rate Limit:** 10/minute

**Request Body:**
```json
{
  "amount": 9.99,
  "currency": "EUR",
  "description": "Suscripción Premium"
}
```

**Headers:**
```
Authorization: Bearer <firebase_jwt_token>
```

---

### POST `/api/payments/paypal/capture-order`
**Auth:** ✅ Requerido
**Rate Limit:** 10/minute

**Request Body:**
```json
{
  "order_id": "PAYPAL_ORDER_ID"
}
```

---

### POST `/api/payments/webhook`
**Auth:** No (verificado por PayPal signature)
**Rate Limit:** Unlimited

**Descripción:** Webhook de PayPal para eventos de pago

---

### GET `/v1/api/payments/...`
**Status:** ✅ Mismo que `/api/payments/...` pero bajo `/v1`

---

## 🚨 Emergency Phones

**⚠️ Requiere configuración:**
- `FIREBASE_SERVICE_ACCOUNT_B64`
- `RECAPTCHA_SECRET_KEY` (opcional)

### POST `/api/emergency/phones`
**Auth:** ✅ Requerido (Firebase + Email verificado)
**Rate Limit:** 15/minute

**Request Body:**
```json
{
  "name": "Mamá",
  "phone_number": "+34600123456",
  "relationship": "family",
  "recaptcha_token": "token_from_frontend"
}
```

**Response:**
```json
{
  "id": "phone_id",
  "name": "Mamá",
  "phone_number": "+34600123456",
  "encrypted": true,
  "relationship": "family",
  "created_at": "2025-11-22T10:00:00Z"
}
```

---

### GET `/api/emergency/phones`
**Auth:** ✅ Requerido
**Rate Limit:** 30/minute

**Descripción:** Obtiene todos los teléfonos de emergencia del usuario

---

### GET `/api/emergency/phones/{phone_id}`
**Auth:** ✅ Requerido
**Rate Limit:** 30/minute

---

### PUT `/api/emergency/phones/{phone_id}`
**Auth:** ✅ Requerido
**Rate Limit:** 15/minute

---

### DELETE `/api/emergency/phones/{phone_id}`
**Auth:** ✅ Requerido
**Rate Limit:** 15/minute

---

### GET `/v1/api/emergency/...`
**Status:** ✅ Mismo que `/api/emergency/...` pero bajo `/v1`

---

## 🔧 Admin Endpoints

**⚠️ Requiere:**
- Firebase Auth configurado
- Usuario con rol `admin`

### POST `/admin/backups`
**Auth:** ✅ Admin requerido

**Descripción:** Crea backup de Firestore

---

### GET `/admin/...`
**Auth:** ✅ Admin requerido

**Descripción:** Varios endpoints de administración

---

## 📝 Documentación Interactiva

### GET `/docs`
**Status:** ✅ Funcionando
**Auth:** No

**Descripción:** Swagger UI - Documentación interactiva de la API

**URL:** https://fz6-production.up.railway.app/docs

---

### GET `/redoc`
**Status:** ✅ Funcionando
**Auth:** No

**Descripción:** ReDoc - Documentación alternativa más visual

**URL:** https://fz6-production.up.railway.app/redoc

---

### GET `/openapi.json`
**Status:** ✅ Funcionando
**Auth:** No

**Descripción:** Especificación OpenAPI en JSON

---

## 🔑 Autenticación

Todos los endpoints que requieren autenticación usan **Firebase JWT tokens**.

### Cómo obtener el token

1. **Desde Frontend (Firebase SDK):**
```javascript
const user = firebase.auth().currentUser;
const token = await user.getIdToken();
```

2. **Hacer request con el token:**
```javascript
fetch('https://fz6-production.up.railway.app/api/emergency/phones', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
})
```

### Niveles de autenticación

| Nivel | Descripción | Endpoints |
|-------|-------------|-----------|
| **No Auth** | Sin autenticación | `/health`, `/security-info`, `/docs` |
| **Authenticated** | Token Firebase válido | Mayoría de endpoints |
| **Verified** | Token + Email verificado | Payments, Emergency |
| **Admin** | Token + Rol admin | `/admin/*` |

---

## 🧪 Testing de Endpoints

### Test Suite Básico

```javascript
const baseURL = 'https://fz6-production.up.railway.app';

// 1. Health Check
fetch(`${baseURL}/health`)
  .then(r => r.json())
  .then(d => console.log('✅ Health:', d.status));

// 2. Security Info
fetch(`${baseURL}/security-info`)
  .then(r => r.json())
  .then(d => console.log('✅ Environment:', d.environment));

// 3. API Info
fetch(`${baseURL}/v1/info`)
  .then(r => r.json())
  .then(d => console.log('✅ Features:', d.features));

// 4. CSRF Token
fetch(`${baseURL}/api/csrf-token`)
  .then(r => r.json())
  .then(d => console.log('✅ CSRF:', d.csrf_token));
```

### Test con Autenticación

```javascript
// Requiere Firebase configurado
const token = '<tu_firebase_jwt_token>';

fetch(`${baseURL}/api/emergency/phones`, {
  headers: {
    'Authorization': `Bearer ${token}`
  }
})
  .then(r => r.json())
  .then(d => console.log('✅ Emergency Phones:', d));
```

---

## ⚠️ Limitaciones Actuales

### Sin Firebase Auth

Los siguientes endpoints **NO funcionarán** sin configurar Firebase:
- ❌ `/api/emergency/*` (todos)
- ❌ `/api/payments/*` (todos)
- ❌ `/admin/*` (todos)

**Solución:** Ver `FIREBASE_QUICK_SETUP.md`

---

### Sin PayPal

Los endpoints de pagos funcionarán pero fallarán al intentar crear órdenes:
- ⚠️ `/api/payments/paypal/*`

**Solución:** Agregar `PAYPAL_CLIENT_ID` y `PAYPAL_CLIENT_SECRET` en Railway

---

### Sin Database

Si agregas PostgreSQL, podrás usar:
- Almacenamiento persistente de suscripciones
- Logs de transacciones
- Analytics de usuarios

**Solución:** Agregar PostgreSQL service en Railway

---

## 📊 Métricas de Rate Limiting

| Endpoint | Límite | Ventana |
|----------|--------|---------|
| `/health` | 60 | 1 minuto |
| `/health/detailed` | 30 | 1 minuto |
| `/security-info` | 30 | 1 minuto |
| `/debug` | 10 | 1 minuto |
| `/api/payments/*` | 10 | 1 minuto |
| `/api/emergency/phones` (POST) | 15 | 1 minuto |
| `/api/emergency/phones` (GET) | 30 | 1 minuto |
| `/api/csrf-token` | 60 | 1 minuto |

---

## 🔗 Enlaces Útiles

- **API Docs:** https://fz6-production.up.railway.app/docs
- **ReDoc:** https://fz6-production.up.railway.app/redoc
- **Health:** https://fz6-production.up.railway.app/health
- **Railway Dashboard:** https://railway.app/project/7ee71fb2-9561-4ad5-a752-89bc0c048f96

---

**Última actualización:** 2025-11-22
