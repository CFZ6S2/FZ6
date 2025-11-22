# 🚀 PayPal - Pasos Finales de Despliegue

> **Fecha:** 2025-11-15
> **Estado:** ✅ Dependencias instaladas, listo para desplegar
> **Proyecto:** tuscitasseguras-2d1a6

---

## ✅ Lo que ya está hecho

| Paso | Estado | Detalles |
|------|--------|----------|
| Credenciales PayPal | ✅ | Client ID y Secret configurados (sandbox) |
| Código Cloud Functions | ✅ | 9 funciones implementadas en `functions/index.js` |
| Dependencias instaladas | ✅ | `npm install` ejecutado exitosamente |
| Archivo .env | ✅ | Creado en `functions/.env` para desarrollo local |
| Scripts de despliegue | ✅ | `deploy-paypal-complete.sh` disponible |

---

## 🔴 PASOS OBLIGATORIOS - Hacer Ahora

### Paso 1: Autenticarse en Firebase CLI

```bash
# Instalar Firebase CLI (si no está instalado)
npm install -g firebase-tools

# Login en Firebase
firebase login

# Verificar proyecto
firebase projects:list
firebase use tuscitasseguras-2d1a6
```

**Verificación:**
```bash
firebase projects:list
# Debe mostrar: tuscitasseguras-2d1a6 (activo)
```

---

### Paso 2: Configurar Credenciales en Firebase Functions

```bash
# Desde la raíz del proyecto (/home/user/t2c06)

# Configurar PayPal sandbox
firebase functions:config:set \
  paypal.client_id="AQouhwoeHU6p26B7mxYl5rYyl2Hj6xl2kfo11pQbLq6oUFDv12JQkZ5Kg-HN_kzU0wzvX6CbgNbPcNYI" \
  paypal.secret="EClAPLW1_Vedhq_u19Ok5MYcyjLLwm_Kd5W-QhOMsbSrN8F3ynUZd5wuJmvOke6mLLMyyv-QGZ1MK6qd" \
  paypal.mode="sandbox"
```

**Verificación:**
```bash
firebase functions:config:get

# Debe mostrar:
# {
#   "paypal": {
#     "client_id": "AQouhwoeHU6p26B7...",
#     "secret": "EClAPLW1_Vedhq_u...",
#     "mode": "sandbox"
#   }
# }
```

---

### Paso 3: Desplegar Cloud Functions

```bash
# Desplegar SOLO las funciones (no rules, no hosting)
firebase deploy --only functions

# O usar el script automatizado
bash deploy-paypal-complete.sh
```

**Tiempo estimado:** 3-5 minutos

**Funciones que se desplegarán:**

| Función | Tipo | Propósito |
|---------|------|-----------|
| `onUserDocCreate` | Trigger (onCreate) | Configurar custom claims al crear usuario |
| `onUserDocUpdate` | Trigger (onUpdate) | Actualizar custom claims al modificar usuario |
| `syncChatACL` | Trigger | Sincronizar ACLs de Storage para chats |
| `updateUserClaims` | Callable | Actualizar claims manualmente (admin) |
| `getUserClaims` | Callable | Obtener claims de un usuario |
| `paypalWebhook` | HTTP | Recibir webhooks de PayPal |
| `captureInsuranceAuthorization` | Callable | Cobrar €120 del seguro anti-plantón |
| `voidInsuranceAuthorization` | Callable | Liberar retención de €120 |
| `getInsuranceAuthorizationStatus` | Callable | Consultar estado de autorización |

**Verificación:**
```bash
# Ver logs en tiempo real
firebase functions:log --only paypalWebhook

# Listar funciones desplegadas
firebase functions:list
```

**URLs de las funciones:**
```
https://us-central1-tuscitasseguras-2d1a6.cloudfunctions.net/paypalWebhook
https://us-central1-tuscitasseguras-2d1a6.cloudfunctions.net/captureInsuranceAuthorization
https://us-central1-tuscitasseguras-2d1a6.cloudfunctions.net/voidInsuranceAuthorization
...
```

---

### Paso 4: Configurar Webhook en PayPal Dashboard

#### 4.1 Acceder a PayPal Developer

1. Ve a: https://developer.paypal.com/dashboard
2. Login con tu cuenta PayPal Business
3. Selecciona modo: **Sandbox** (por ahora)
4. Click en **"My Apps & Credentials"**

#### 4.2 Seleccionar/Crear App

- Si existe "TuCitaSegura" → Selecciónala
- Si no existe → Crear nueva app:
  - Nombre: `TuCitaSegura`
  - App Type: `Merchant`
  - Click **Create App**

#### 4.3 Agregar Webhook

1. En la página de la app, scroll hasta **"Webhooks"**
2. Click **"Add Webhook"**
3. **Webhook URL:**
   ```
   https://us-central1-tuscitasseguras-2d1a6.cloudfunctions.net/paypalWebhook
   ```

4. **Event types** (seleccionar estos 5):
   - ✅ `BILLING.SUBSCRIPTION.ACTIVATED`
   - ✅ `BILLING.SUBSCRIPTION.CANCELLED`
   - ✅ `BILLING.SUBSCRIPTION.EXPIRED`
   - ✅ `PAYMENT.SALE.COMPLETED`
   - ✅ `PAYMENT.AUTHORIZATION.VOIDED`

5. Click **"Save"**

#### 4.4 Copiar Webhook ID

Después de guardar, PayPal mostrará:
```
Webhook ID: WH-XXXXXXXXXXXXX-XXXXXXXXXXXXX
```

**🔴 MUY IMPORTANTE:** Copia este ID, lo necesitarás en el siguiente paso.

---

### Paso 5: Configurar Webhook ID en Firebase

```bash
# Reemplaza WH-XXXXX con tu Webhook ID real
firebase functions:config:set paypal.webhook_id="WH-XXXXXXXXXXXXX-XXXXXXXXXXXXX"

# Re-desplegar funciones para aplicar el cambio
firebase deploy --only functions
```

**Verificación:**
```bash
firebase functions:config:get

# Debe mostrar:
# {
#   "paypal": {
#     "client_id": "AQouhwoeHU6p26B7...",
#     "secret": "EClAPLW1_Vedhq_u...",
#     "mode": "sandbox",
#     "webhook_id": "WH-XXXXXXXXXXXXX-XXXXXXXXXXXXX"
#   }
# }
```

---

## 🧪 Paso 6: Testing

### 6.1 Crear Cuentas de Prueba en PayPal Sandbox

1. Ve a: https://developer.paypal.com/dashboard/accounts
2. Click **"Create Account"**
3. Crear 2 cuentas:
   - **Personal Account** (comprador)
     - Country: Spain
     - Balance: €1000
   - **Business Account** (vendedor - ya debería existir)

4. **Guardar credenciales:**
   - Email: `sb-xxxxx@personal.example.com`
   - Password: (auto-generado)

### 6.2 Probar Suscripción (€29.99/mes)

1. Abrir: `http://localhost:8000/webapp/suscripcion.html`
2. Login con un usuario masculino de Firebase Auth
3. Click en botón PayPal
4. Login con cuenta **Personal** de sandbox
5. Completar pago
6. Verificar en Firebase Console:
   ```
   Firestore > users > {userId}
   hasActiveSubscription: true
   subscriptionId: "I-XXXXXXXXX"
   ```

### 6.3 Probar Seguro Anti-Plantón (€120)

1. Abrir: `http://localhost:8000/webapp/seguro.html`
2. Login con usuario masculino
3. Click en botón PayPal
4. Completar autorización (NO se cobra todavía)
5. Verificar en Firestore:
   ```
   hasAntiGhostingInsurance: true
   insuranceAuthorizationId: "2AB..."
   insuranceStatus: "authorized"
   ```

### 6.4 Verificar Webhooks

1. Ve a: https://developer.paypal.com/dashboard
2. Selecciona tu app
3. Scroll a **"Webhooks"**
4. Click en tu webhook
5. Ver **"Webhook Events"** (debe mostrar eventos recibidos)

### 6.5 Ver Logs en Firebase

```bash
# Logs de webhook
firebase functions:log --only paypalWebhook

# Logs de todas las funciones
firebase functions:log
```

---

## 🚀 Paso 7: Cambiar a Producción (cuando estés listo)

### 7.1 Obtener Credenciales de Producción

1. Ve a: https://developer.paypal.com/dashboard
2. Switch a **"Live"** (arriba a la derecha)
3. Crear/Seleccionar app
4. Copiar:
   - **Client ID** (live)
   - **Secret Key** (live, click "Show")

### 7.2 Actualizar Firebase Functions

```bash
firebase functions:config:set \
  paypal.client_id="PRODUCTION_CLIENT_ID" \
  paypal.secret="PRODUCTION_SECRET" \
  paypal.mode="live"

firebase deploy --only functions
```

### 7.3 Crear Webhook en Producción

Repetir **Paso 4**, pero en modo **"Live"**:
- Webhook URL: (misma)
- Eventos: (mismos 5)
- Copiar nuevo Webhook ID

```bash
firebase functions:config:set paypal.webhook_id="WH-LIVE-WEBHOOK-ID"
firebase deploy --only functions
```

### 7.4 Actualizar Frontend

**Actualizar en `webapp/suscripcion.html` (línea 15):**
```html
<!-- ANTES (Sandbox) -->
<script src="https://www.paypal.com/sdk/js?client-id=AQouhwoeHU6p26B7...&vault=true&intent=subscription"></script>

<!-- DESPUÉS (Production) -->
<script src="https://www.paypal.com/sdk/js?client-id=PRODUCTION_CLIENT_ID&vault=true&intent=subscription"></script>
```

**Actualizar en `webapp/seguro.html` (línea 15):**
```html
<!-- ANTES (Sandbox) -->
<script src="https://www.paypal.com/sdk/js?client-id=AQouhwoeHU6p26B7...&currency=EUR&intent=authorize"></script>

<!-- DESPUÉS (Production) -->
<script src="https://www.paypal.com/sdk/js?client-id=PRODUCTION_CLIENT_ID&currency=EUR&intent=authorize"></script>
```

**Desplegar frontend:**
```bash
firebase deploy --only hosting
```

### 7.5 Testing Final en Producción

⚠️ **IMPORTANTE:** Hacer pruebas con cantidades pequeñas primero:
- Cambiar temporalmente €29.99 a €0.01
- Probar flujo completo
- Verificar webhooks
- Revertir a precios reales

---

## 📊 Checklist Final

### Pre-Despliegue
- [x] Dependencias instaladas (`npm install`)
- [x] Archivo `.env` creado
- [ ] Firebase CLI instalado y autenticado
- [ ] Credenciales configuradas en Firebase Functions
- [ ] Cloud Functions desplegadas

### Configuración PayPal
- [ ] App creada en PayPal Developer (Sandbox)
- [ ] Webhook configurado en PayPal
- [ ] Webhook ID obtenido
- [ ] Webhook ID configurado en Firebase
- [ ] Funciones re-desplegadas con Webhook ID

### Testing
- [ ] Cuenta Personal de prueba creada (Sandbox)
- [ ] Suscripción probada y funcionando
- [ ] Seguro anti-plantón probado
- [ ] Webhooks llegando correctamente
- [ ] Firestore actualizándose correctamente
- [ ] Logs sin errores

### Producción (cuando aplique)
- [ ] Credenciales de producción obtenidas
- [ ] Firebase Functions actualizadas (mode=live)
- [ ] Webhook configurado en modo Live
- [ ] Frontend actualizado con Client ID de producción
- [ ] Testing en producción con montos pequeños
- [ ] Monitoreo activo (logs, alertas)

---

## 🆘 Troubleshooting

### Error: "Firebase CLI not found"
```bash
npm install -g firebase-tools
firebase login
```

### Error: "Insufficient permissions"
```bash
# Verificar que estás autenticado
firebase login --reauth

# Verificar proyecto
firebase use tuscitasseguras-2d1a6
```

### Error: "Webhook signature verification failed"
- Verificar que `PAYPAL_WEBHOOK_ID` está configurado
- Verificar que el Webhook ID es correcto
- Re-desplegar funciones después de configurarlo

### PayPal Button no aparece
- Verificar Client ID en HTML
- Abrir consola del navegador (errores)
- Verificar que PayPal SDK cargó correctamente

### Firestore no se actualiza después del pago
- Ver logs: `firebase functions:log`
- Verificar Firestore Rules permiten writes
- Verificar que el usuario está autenticado

---

## 📚 Documentación Relacionada

- **PAYPAL_INTEGRATION.md** - Guía completa de integración
- **PAYPAL_AUTHORIZATION_FUNCTIONS.md** - Funciones de retención €120
- **PAYPAL_WEBHOOK_SECURITY.md** - Seguridad de webhooks
- **functions/README.md** - Documentación de Cloud Functions

---

## 🎯 Próximos Pasos

Una vez completados todos los pasos de este documento:

1. **Monitoreo:**
   - Configurar alertas en Firebase Console
   - Revisar logs diariamente
   - Monitorear webhooks en PayPal Dashboard

2. **Mejoras Futuras:**
   - Sistema de re-autorización automática (29 días)
   - Dashboard de admin para ver pagos
   - Analytics de conversión de pagos
   - Emails de confirmación personalizados

3. **Documentación:**
   - Documentar procedimientos para soporte
   - Crear FAQ de pagos
   - Guía de reembolsos

---

**Última actualización:** 2025-11-15
**Estado:** Listo para desplegar
**Siguiente acción:** Ejecutar Paso 1 (Firebase login)
