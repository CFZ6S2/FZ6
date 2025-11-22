# 🚀 Guía Rápida de Deployment - PayPal Vault System

> **Tiempo estimado:** 10-15 minutos
> **Dificultad:** Fácil

---

## 📋 Pasos de Deployment

### Paso 1: Autenticarse en Firebase (2 min)

```bash
cd /home/user/t2c06
firebase login
firebase use tuscitasseguras-2d1a6
```

### Paso 2: Configurar Credenciales de PayPal (2 min)

Obtener credenciales en: https://developer.paypal.com/dashboard/

```bash
firebase functions:config:set paypal.client_id="TU_CLIENT_ID"
firebase functions:config:set paypal.secret="TU_SECRET"
firebase functions:config:set paypal.mode="sandbox"

# Verificar
firebase functions:config:get
```

### Paso 3: Actualizar Client ID en Frontend (1 min)

Editar `webapp/seguro.html` línea 15:

```html
<script src="https://www.paypal.com/sdk/js?client-id=TU_CLIENT_ID&currency=EUR&vault=true&intent=tokenize"></script>
```

### Paso 4: Ejecutar Deploy (5 min)

```bash
./deploy-paypal-vault.sh
```

---

## ✅ Verificación

```bash
firebase functions:list  # Ver funciones desplegadas
```

Abrir: https://tuscitasseguras-2d1a6.web.app/webapp/seguro.html

---

Ver documentación completa en: `PAYPAL_VAULT_INSURANCE.md`
