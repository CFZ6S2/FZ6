# ✅ Pre-Deployment Checklist - TuCitaSegura

**Completar TODOS los items antes de deployment a producción**

---

## 🔐 Seguridad

### Credenciales y Secrets

- [ ] Todas las credenciales están en variables de entorno (NO en código)
- [ ] `.env.production` creado y configurado
- [ ] `.env.production` agregado a `.gitignore`
- [ ] SECRET_KEY generado con `openssl rand -hex 32` (32 bytes)
- [ ] CSRF_SECRET_KEY generado con `openssl rand -hex 32`
- [ ] ENCRYPTION_KEY generado con Fernet
- [ ] Firebase credentials en formato base64 configuradas
- [ ] PayPal credenciales de PRODUCCIÓN configuradas (no sandbox)
- [ ] reCAPTCHA credenciales de producción configuradas
- [ ] Sentry DSN configurado
- [ ] Historial de git limpio (sin credenciales expuestas)

### Firebase

- [ ] Firebase project creado en consola
- [ ] Service account generado y descargado
- [ ] Firebase Authentication habilitado
- [ ] Firestore Database creado
- [ ] Firestore Rules deployed
- [ ] Firestore Indexes deployed (`firebase deploy --only firestore:indexes`)
- [ ] Billing habilitado (Blaze plan para funciones)
- [ ] Dominios personalizados configurados

### Configuración de Seguridad

- [ ] CORS_ORIGINS configurado solo con dominios de producción
- [ ] ENABLE_CSRF=true en producción
- [ ] DEBUG=false en producción
- [ ] ENVIRONMENT=production
- [ ] Rate limiting habilitado
- [ ] Security headers middleware activo

---

## 🚂 Backend (Railway)

### Configuración

- [ ] Cuenta de Railway creada
- [ ] Repositorio conectado a Railway
- [ ] TODAS las variables de entorno configuradas en Railway
- [ ] `railway.json` presente en la raíz
- [ ] `requirements.txt` actualizado
- [ ] Puerto configurado correctamente ($PORT)
- [ ] Health check path configurado: `/health`

### Testing

- [ ] Tests pasan localmente: `pytest backend/tests`
- [ ] Linter pasa: `flake8 backend/` (si aplica)
- [ ] No errores críticos en logs
- [ ] Health check funciona localmente

### Dominio

- [ ] Dominio personalizado configurado (api.tucitasegura.com)
- [ ] DNS CNAME apuntando a Railway
- [ ] SSL/HTTPS funcionando

---

## 🔥 Frontend (Firebase Hosting)

### Configuración

- [ ] Firebase CLI instalado: `firebase --version`
- [ ] Logged in: `firebase login`
- [ ] Proyecto seleccionado: `firebase use tu-cita-segura`
- [ ] `webapp/.env.production` configurado
- [ ] VITE_API_URL apunta a producción (https://api.tucitasegura.com)
- [ ] VITE_FIREBASE_* variables configuradas
- [ ] VITE_PAYPAL_CLIENT_ID de producción
- [ ] VITE_RECAPTCHA_SITE_KEY de producción

### Build

- [ ] `npm install` sin errores
- [ ] `npm run build` exitoso
- [ ] Directorio `dist/` generado
- [ ] No errores en build
- [ ] Assets minificados correctamente

### Dominio

- [ ] Dominio personalizado configurado (tucitasegura.com)
- [ ] DNS A records configurados
- [ ] SSL/HTTPS funcionando
- [ ] WWW redirect configurado

---

## 💳 PayPal Integration

### Configuración

- [ ] Cuenta de PayPal Business verificada
- [ ] App de producción creada en PayPal Developer
- [ ] Client ID de producción obtenido
- [ ] Client Secret de producción obtenido
- [ ] PAYPAL_MODE=live configurado
- [ ] Webhook configurado en PayPal Developer
- [ ] Webhook URL: `https://api.tucitasegura.com/api/payments/paypal/webhook`
- [ ] Webhook ID copiado a variables de entorno
- [ ] Eventos de webhook configurados:
  - [ ] BILLING.SUBSCRIPTION.CREATED
  - [ ] BILLING.SUBSCRIPTION.ACTIVATED
  - [ ] BILLING.SUBSCRIPTION.CANCELLED
  - [ ] PAYMENT.SALE.COMPLETED
  - [ ] PAYMENT.SALE.REFUNDED

### Testing

- [ ] Test payment en sandbox exitoso (antes de producción)
- [ ] Webhook funciona en sandbox
- [ ] Plan de suscripción creado en PayPal

---

## 🤖 reCAPTCHA

- [ ] reCAPTCHA v3 site registrado en https://www.google.com/recaptcha/admin
- [ ] Site key configurada en frontend
- [ ] Secret key configurada en backend
- [ ] Dominios autorizados agregados (tucitasegura.com)
- [ ] Score threshold configurado (0.5 recomendado)

---

## 📊 Monitoring

### Sentry

- [ ] Proyecto creado en sentry.io
- [ ] DSN configurado en backend
- [ ] Source maps configurados (si aplica)
- [ ] Alertas configuradas
- [ ] Team members invitados

### Uptime Monitoring

- [ ] Servicio de uptime configurado (UptimeRobot, Pingdom, etc.)
- [ ] URL monitoreada: https://api.tucitasegura.com/health
- [ ] Intervalo: 5 minutos
- [ ] Alertas configuradas (email/SMS)

### Logs

- [ ] Railway logs accesibles
- [ ] Firebase logs accesibles
- [ ] Nivel de logging configurado (INFO en prod)

---

## 📝 Documentación

- [ ] README.md actualizado
- [ ] DEPLOYMENT_GUIDE.md presente
- [ ] Variables de entorno documentadas (.env.production.example)
- [ ] API documentada (OpenAPI/Swagger en /docs)
- [ ] Procedimientos de rollback documentados
- [ ] Contactos de emergencia actualizados

---

## 🧪 Testing Pre-Deployment

### Backend

```bash
# Local
cd backend
pytest tests/ -v

# Health check local
curl http://localhost:8000/health

# Security headers
curl -I http://localhost:8000
```

### Frontend

```bash
# Build
cd webapp
npm run build

# Preview build
npm run preview

# Check for console errors
```

### Integration

- [ ] Registro de usuario funciona
- [ ] Login funciona
- [ ] Crear perfil funciona
- [ ] Firestore guarda datos
- [ ] PayPal crea órdenes
- [ ] reCAPTCHA valida
- [ ] Emails se envían (si aplica)

---

## 🗄️ Database

### Firestore

- [ ] Collections creadas
- [ ] Security rules deployed
- [ ] Indexes deployed (23 indexes)
- [ ] Test data removida
- [ ] Backup configurado (próximo paso post-deployment)

### Data Migration

- [ ] Plan de migración definido (si aplica)
- [ ] Backup de datos existentes
- [ ] Scripts de migración testeados

---

## 🌐 DNS & Domains

### Configuración DNS

```
# Frontend (tucitasegura.com)
Type    Name    Value                       TTL
A       @       199.36.158.100             3600
A       www     199.36.158.100             3600
TXT     @       firebase=tu-cita-segura    3600

# Backend (api.tucitasegura.com)
CNAME   api     your-app.railway.app       3600
```

- [ ] DNS records configurados
- [ ] Propagación verificada (https://dnschecker.org)
- [ ] SSL certificates generados automáticamente
- [ ] HTTPS redirect activo

---

## 📱 Performance

- [ ] Assets minificados
- [ ] Images optimizadas
- [ ] Lazy loading configurado
- [ ] CDN configurado (si aplica)
- [ ] Caching headers configurados
- [ ] Gzip/Brotli compression activa

---

## 🚨 Rollback Plan

- [ ] Procedimiento de rollback documentado
- [ ] Backup de versión anterior disponible
- [ ] Railway permite rollback a deployment anterior
- [ ] Firebase permite rollback a versión anterior
- [ ] Tiempo de rollback estimado: < 5 minutos

---

## 👥 Team

- [ ] Team notificado del deployment
- [ ] Roles y responsabilidades definidos
- [ ] Contactos de emergencia actualizados
- [ ] Accesos de admin configurados
- [ ] Passwords compartidos de forma segura (1Password, etc.)

---

## 🎯 Post-Deployment Plan

### Inmediato (0-2 horas)

- [ ] Monitorear logs intensivamente
- [ ] Verificar health checks cada 5 min
- [ ] Verificar Sentry errors
- [ ] Test flow completo de usuario
- [ ] Test payment real (pequeño monto)

### Primeras 24 horas

- [ ] Monitorear uptime
- [ ] Review Sentry errors
- [ ] Verificar webhooks de PayPal
- [ ] Monitorear métricas de performance
- [ ] Responder a issues críticos

### Primera semana

- [ ] Análisis de métricas
- [ ] Optimizaciones según uso real
- [ ] Ajuste de rate limits
- [ ] Review de costs
- [ ] Plan de mejoras

---

## ✅ Final Verification

Antes de hacer el deployment, confirmar:

- [ ] **Todos** los items de este checklist están completos
- [ ] No hay errores en logs locales
- [ ] Tests pasan
- [ ] Variables de entorno verificadas
- [ ] DNS configurado correctamente
- [ ] Backups manuales hechos (pre-deployment)
- [ ] Team notificado
- [ ] Ventana de mantenimiento comunicada (si aplica)

---

## 🚀 Ready to Deploy!

Si todos los items están marcados:

```bash
# Deployment completo
bash scripts/deploy-all.sh

# O por separado:
bash scripts/deploy-backend.sh
bash scripts/deploy-frontend.sh
```

---

**Última verificación**: _______________________

**Aprobado por**: _______________________

**Fecha**: _______________________

**Notas adicionales**:

_______________________
_______________________
_______________________

---

**Próximo paso**: Proceder con deployment usando scripts en `scripts/`

**En caso de problemas**: Referirse a `docs/DEPLOYMENT_GUIDE.md` sección Troubleshooting
