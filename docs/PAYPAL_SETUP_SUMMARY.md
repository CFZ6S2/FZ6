# ✅ PayPal Configuration - Setup Summary

> **Fecha:** 2025-11-15
> **Estado:** ⚙️ Configuración Automática Completada
> **Pendiente:** Despliegue manual a Firebase

---

## 🎉 ¿Qué se ha completado?

### ✅ Configuración Automática (Hecho)

| Tarea | Estado | Archivo |
|-------|--------|---------|
| Dependencias instaladas | ✅ | `functions/node_modules/` |
| Archivo .env creado | ✅ | `functions/.env` |
| Script de despliegue | ✅ | `deploy-paypal-complete.sh` |
| Guía de despliegue | ✅ | `PAYPAL_DEPLOYMENT_STEPS.md` |
| Guía de testing | ✅ | `PAYPAL_TESTING_GUIDE.md` |
| Documentación webhook | ✅ | `PAYPAL_WEBHOOK_SECURITY.md` |

---

## 📋 Archivos Importantes Creados

### 1. `/functions/.env`
Credenciales de PayPal para desarrollo local:
```env
PAYPAL_CLIENT_ID=AQouhwoeHU6p26B7... (Sandbox)
PAYPAL_SECRET=EClAPLW1_Vedhq_u... (Sandbox)
PAYPAL_MODE=sandbox
```

### 2. `/deploy-paypal-complete.sh`
Script interactivo que:
- ✅ Verifica Firebase CLI
- ✅ Configura credenciales en Firebase Functions
- ✅ Instala dependencias
- ✅ Despliega Cloud Functions
- ✅ Muestra instrucciones para webhook

**Uso:**
```bash
bash deploy-paypal-complete.sh
```

### 3. `/PAYPAL_DEPLOYMENT_STEPS.md`
Guía paso a paso para:
- ✅ Login en Firebase
- ✅ Configurar credenciales
- ✅ Desplegar funciones
- ✅ Configurar webhook en PayPal
- ✅ Testing completo
- ✅ Cambio a producción

### 4. `/PAYPAL_TESTING_GUIDE.md`
Testing exhaustivo:
- ✅ 12 casos de prueba
- ✅ Testing de webhooks
- ✅ Testing de Cloud Functions
- ✅ Testing en sandbox y producción
- ✅ Troubleshooting

---

## 🚀 Próximos Pasos (Manual)

### PASO 1: Autenticarse en Firebase

```bash
# Instalar Firebase CLI (si no está)
npm install -g firebase-tools

# Login
firebase login

# Seleccionar proyecto
firebase use tuscitasseguras-2d1a6
```

---

### PASO 2: Opción A - Script Automatizado (Recomendado)

```bash
bash deploy-paypal-complete.sh
```

El script hará:
1. ✅ Verificar Firebase CLI
2. ✅ Configurar credenciales PayPal
3. ✅ Desplegar funciones
4. ✅ Mostrar instrucciones para webhook

---

### PASO 2: Opción B - Manual

```bash
# 1. Configurar credenciales
firebase functions:config:set \
  paypal.client_id="AQouhwoeHU6p26B7mxYl5rYyl2Hj6xl2kfo11pQbLq6oUFDv12JQkZ5Kg-HN_kzU0wzvX6CbgNbPcNYI" \
  paypal.secret="EClAPLW1_Vedhq_u19Ok5MYcyjLLwm_Kd5W-QhOMsbSrN8F3ynUZd5wuJmvOke6mLLMyyv-QGZ1MK6qd" \
  paypal.mode="sandbox"

# 2. Verificar configuración
firebase functions:config:get

# 3. Desplegar funciones
firebase deploy --only functions
```

---

### PASO 3: Configurar Webhook en PayPal

#### 3.1 Crear Webhook

1. Ve a: https://developer.paypal.com/dashboard
2. Switch a **Sandbox**
3. My Apps & Credentials → Selecciona "TuCitaSegura"
4. Scroll a **Webhooks** → Click "Add Webhook"

#### 3.2 Configurar URL

```
URL: https://us-central1-tuscitasseguras-2d1a6.cloudfunctions.net/paypalWebhook
```

#### 3.3 Seleccionar Eventos

- ✅ `BILLING.SUBSCRIPTION.ACTIVATED`
- ✅ `BILLING.SUBSCRIPTION.CANCELLED`
- ✅ `BILLING.SUBSCRIPTION.EXPIRED`
- ✅ `PAYMENT.SALE.COMPLETED`
- ✅ `PAYMENT.AUTHORIZATION.VOIDED`

#### 3.4 Guardar y Copiar Webhook ID

Después de guardar, copiar:
```
Webhook ID: WH-XXXXXXXXXXXXX-XXXXXXXXXXXXX
```

#### 3.5 Configurar Webhook ID en Firebase

```bash
firebase functions:config:set paypal.webhook_id="WH-XXXXXXXXXXXXX-XXXXXXXXXXXXX"

# Re-desplegar
firebase deploy --only functions
```

---

### PASO 4: Testing

Ver guía completa en: **PAYPAL_TESTING_GUIDE.md**

**Tests básicos:**

```bash
# 1. Probar suscripción
http://localhost:8000/webapp/suscripcion.html

# 2. Probar seguro
http://localhost:8000/webapp/seguro.html

# 3. Ver logs
firebase functions:log --tail
```

---

## 📊 Estado de Cloud Functions

### Funciones Implementadas (9 total)

| Función | Tipo | Estado | Propósito |
|---------|------|--------|-----------|
| `onUserDocCreate` | Trigger | ✅ Código listo | Custom claims al crear usuario |
| `onUserDocUpdate` | Trigger | ✅ Código listo | Actualizar custom claims |
| `syncChatACL` | Trigger | ✅ Código listo | Sincronizar Storage ACLs |
| `updateUserClaims` | Callable | ✅ Código listo | Actualizar claims (admin) |
| `getUserClaims` | Callable | ✅ Código listo | Obtener claims |
| `paypalWebhook` | HTTP | ✅ Código listo | Recibir webhooks PayPal |
| `captureInsuranceAuthorization` | Callable | ✅ Código listo | Cobrar €120 (plantón) |
| `voidInsuranceAuthorization` | Callable | ✅ Código listo | Liberar €120 |
| `getInsuranceAuthorizationStatus` | Callable | ✅ Código listo | Consultar estado |

**⚠️ Todas requieren despliegue:**
```bash
firebase deploy --only functions
```

---

## 🔑 Credenciales Configuradas

### Sandbox (Actual)

```yaml
Client ID: AQouhwoeHU6p26B7mxYl5rYyl2Hj6xl2kfo11pQbLq6oUFDv12JQkZ5Kg-HN_kzU0wzvX6CbgNbPcNYI
Secret: EClAPLW1_Vedhq_u19Ok5MYcyjLLwm_Kd5W-QhOMsbSrN8F3ynUZd5wuJmvOke6mLLMyyv-QGZ1MK6qd
Mode: sandbox
Plan ID: P-43X73253LN792734JNEMEYLA
```

**Frontend ya configurado:**
- ✅ `webapp/suscripcion.html` (línea 15)
- ✅ `webapp/seguro.html` (línea 15)

---

## 📚 Documentación Disponible

| Documento | Propósito |
|-----------|-----------|
| `PAYPAL_INTEGRATION.md` | Guía completa de integración |
| `PAYPAL_AUTHORIZATION_FUNCTIONS.md` | Sistema de retención €120 |
| `PAYPAL_WEBHOOK_SECURITY.md` | Seguridad de webhooks |
| `PAYPAL_DEPLOYMENT_STEPS.md` | ⭐ Pasos de despliegue |
| `PAYPAL_TESTING_GUIDE.md` | ⭐ Guía de testing |
| `PAYPAL_SETUP_SUMMARY.md` | Este documento |

---

## ⚠️ Checklist Pre-Producción

Antes de cambiar a producción:

### Testing en Sandbox
- [ ] Completar TODOS los tests en PAYPAL_TESTING_GUIDE.md
- [ ] Verificar que webhooks llegan correctamente
- [ ] Confirmar que Firestore se actualiza
- [ ] Revisar logs sin errores críticos
- [ ] Probar captura de €120 (simulada)
- [ ] Probar liberación de autorización

### Configuración
- [ ] Webhook ID configurado en Firebase
- [ ] Funciones desplegadas exitosamente
- [ ] Firestore Rules desplegadas
- [ ] Storage Rules desplegadas

### Monitoreo
- [ ] Alertas configuradas en Firebase Console
- [ ] Logs monitoreados regularmente
- [ ] Performance Monitoring activado

---

## 🚀 Cambio a Producción (Futuro)

Cuando estés listo para producción:

### 1. Obtener Credenciales Live

1. PayPal Dashboard → Switch a **Live**
2. Copiar Client ID y Secret de producción

### 2. Actualizar Firebase

```bash
firebase functions:config:set \
  paypal.client_id="PRODUCTION_CLIENT_ID" \
  paypal.secret="PRODUCTION_SECRET" \
  paypal.mode="live"

firebase deploy --only functions
```

### 3. Crear Webhook Live

Repetir PASO 3 pero en modo **Live**

### 4. Actualizar Frontend

**webapp/suscripcion.html (línea 15):**
```html
<script src="https://www.paypal.com/sdk/js?client-id=PRODUCTION_CLIENT_ID&vault=true&intent=subscription"></script>
```

**webapp/seguro.html (línea 15):**
```html
<script src="https://www.paypal.com/sdk/js?client-id=PRODUCTION_CLIENT_ID&currency=EUR&intent=authorize"></script>
```

### 5. Testing Seguro

- Cambiar temporalmente a €0.01
- Probar flujo completo
- Revertir a precios reales

---

## 🆘 Soporte

### Si algo falla:

1. **Ver logs:**
   ```bash
   firebase functions:log --tail
   ```

2. **Verificar configuración:**
   ```bash
   firebase functions:config:get
   ```

3. **Consultar documentación:**
   - PAYPAL_DEPLOYMENT_STEPS.md (paso a paso)
   - PAYPAL_TESTING_GUIDE.md (troubleshooting)

4. **PayPal Developer Support:**
   - https://developer.paypal.com/support
   - https://www.paypal-community.com

---

## 📊 Resumen Visual

```
┌─────────────────────────────────────────────────────────┐
│           ESTADO ACTUAL DE CONFIGURACIÓN                │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ✅ Código implementado (9 Cloud Functions)            │
│  ✅ Dependencias instaladas (738 packages)             │
│  ✅ Archivo .env creado                                 │
│  ✅ Scripts de despliegue creados                       │
│  ✅ Documentación completa                              │
│                                                         │
│  ⏳ PENDIENTE: Autenticación Firebase                   │
│  ⏳ PENDIENTE: Desplegar funciones                      │
│  ⏳ PENDIENTE: Configurar webhook                       │
│  ⏳ PENDIENTE: Testing                                  │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## 🎯 Siguiente Acción

**Ejecutar uno de estos comandos:**

### Opción 1: Script Automatizado
```bash
bash deploy-paypal-complete.sh
```

### Opción 2: Manual
```bash
firebase login
firebase use tuscitasseguras-2d1a6
firebase functions:config:set paypal.client_id="AQouhwoeHU6p26B7..." # (ver arriba)
firebase deploy --only functions
```

Luego seguir instrucciones en **PAYPAL_DEPLOYMENT_STEPS.md**

---

**¡Todo listo para desplegar! 🚀**
