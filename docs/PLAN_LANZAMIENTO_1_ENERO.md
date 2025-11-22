# 🚀 Plan de Lanzamiento - 1 Enero 2025

**Días restantes:** 47 días
**Estado actual:** 80% completo
**Bloqueadores críticos:** 6 identificados

---

## 🔴 BLOQUEADORES CRÍTICOS (Must Fix)

### 1. Firestore Rules - Validación de Pagos ⏱️ 4 horas
**Problema:** Hombres pueden usar la app sin pagar (validación solo en frontend)

**Solución:**
```javascript
// firestore.rules
match /conversations/{convId}/messages/{msgId} {
  allow create: if isAuthed() && canChat();  // ← AGREGAR ESTO
}

match /appointments/{aptId} {
  allow create: if isAuthed() && canSchedule();  // ← AGREGAR ESTO
}
```

**Archivos a modificar:**
- `firestore.rules`

**Deploy:**
```bash
firebase deploy --only firestore:rules
```

---

### 2. PayPal vs Stripe - Inconsistencia ⏱️ 8 horas
**Problema:** Frontend usa PayPal, backend (Cloud Functions) usa Stripe

**DECISIÓN NECESARIA:**

#### Opción A: Usar PayPal (más fácil)
- ✅ Frontend ya implementado
- ❌ Hay que reescribir Cloud Functions (8 horas)
- ✅ Webhooks más simples

#### Opción B: Usar Stripe (recomendado)
- ✅ Backend ya implementado
- ❌ Hay que reescribir suscripcion.html + seguro.html (6 horas)
- ✅ Mejor experiencia de pago
- ✅ Más opciones futuras

**Recomendación:** Stripe (mejor a largo plazo)

**Archivos a modificar si Stripe:**
- `webapp/suscripcion.html` (cambiar PayPal SDK por Stripe.js)
- `webapp/seguro.html` (cambiar PayPal SDK por Stripe.js)

**Archivos a modificar si PayPal:**
- `functions/index.js` (reescribir webhook handlers)

---

### 3. Cloud Functions - Deployment ⏱️ 2 horas
**Problema:** No sabemos si están deployed en producción

**Solución:**
```bash
cd functions
npm install
firebase deploy --only functions
```

**Verificar:**
```bash
firebase functions:log
```

**Critical Functions:**
- `onUserDocCreate` - Auto-set custom claims
- `onUserDocUpdate` - Sync custom claims
- `stripeWebhook` (o PayPal webhook)

---

### 4. Verificación de Identidad ⏱️ 12 horas
**Problema:** Solo HTML, sin JavaScript funcional

**Tareas:**
1. **Upload de documentos a Firebase Storage** (4h)
   - Front + back de documento
   - Selfie

2. **Actualizar Firestore con estado de verificación** (2h)
   - `users/{uid}` → campo `verificationStatus`
   - Posibles valores: "pending", "approved", "rejected"

3. **Panel de Admin para aprobar** (6h)
   - En `webapp/admin/dashboard.html`
   - Lista de usuarios pendientes
   - Botones aprobar/rechazar

**Archivos a crear/modificar:**
- `webapp/verificacion-identidad.html` (agregar JavaScript)
- `webapp/admin/dashboard.html` (agregar sección de verificaciones)

**Opcional (futuro):**
- OpenCV face detection (backend Python)

---

### 5. Video Chat - Completar HTML ⏱️ 6 horas
**Problema:** video-chat.js completo (16KB), pero video-chat.html incompleto (20%)

**Tareas:**
1. **Crear UI completa** (3h)
   - Video local + remoto
   - Controles (mute, camera off, hang up)
   - Screen share button

2. **Integrar video-chat.js** (2h)
   - Inicializar WebRTC
   - Event handlers

3. **Link desde chat.html** (1h)
   - Botón video call funcional
   - Pasar conversation ID

**Archivos a modificar:**
- `webapp/video-chat.html` (agregar HTML completo)
- `webapp/chat.html` (conectar botón video)

**Nota:** Para producción necesitarás TURN servers (sin ellos, 30% de usuarios no pueden conectar por NAT)

---

### 6. QR Code - Validación de Citas ⏱️ 6 horas
**Problema:** UI existe pero sin lógica de QR

**Tareas:**
1. **Generar QR al crear cita** (2h)
   - Usar librería: `qrcode.js`
   - Guardar en Firestore: `appointments/{id}/qrCode`

2. **Validar QR en cita-detalle.html** (3h)
   - Escanear QR (librería: `html5-qrcode`)
   - Comparar con código en Firestore
   - Actualizar status a "validated"

3. **PIN alternativo** (1h)
   - Generar PIN de 6 dígitos
   - Validar PIN si no tiene QR scanner

**Archivos a modificar:**
- `webapp/chat.html` (generar QR al crear cita)
- `webapp/cita-detalle.html` (validar QR/PIN)

**Librerías a incluir:**
```html
<script src="https://cdn.jsdelivr.net/npm/qrcode@1.5.3/build/qrcode.min.js"></script>
<script src="https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js"></script>
```

---

## ⚠️ INCOMPLETOS (Should Fix - Si hay tiempo)

### 7. Logros/Badges ⏱️ 8 horas
**Problema:** UI completa, pero no se cargan datos (Firestore collections no existen)

**Tareas:**
1. Crear collection `badges` en Firestore
2. Auto-unlock logic en Cloud Functions
3. Trigger badges on user actions

**Impacto:** Gamificación (engagement +30%)

---

### 8. Sistema de Referidos ⏱️ 6 horas
**Problema:** UI completa, pero rewards no especificados

**Tareas:**
1. Definir rewards por tier
2. Implementar webhook de validación
3. Auto-apply rewards

**Impacto:** Crecimiento viral

---

### 9. TURN Servers para Video ⏱️ 4 horas
**Problema:** Solo STUN (gratuito), 30% de usuarios no pueden conectar

**Solución:**
1. Crear cuenta en Twilio/Metered.ca
2. Obtener TURN credentials
3. Actualizar `webapp/js/video-chat.js`

**Costo:** ~$10/mes por 1000 minutos

---

### 10. App Check - Reactivar ⏱️ 2 horas
**Problema:** Desactivado temporalmente (baneo de 22 horas)

**Tareas (después del baneo):**
1. Generar nuevo debug token
2. Registrar en Firebase Console
3. Reactivar en `firebase-appcheck.js`
4. Enforcement → "Enforced" para producción

---

## 📅 CRONOGRAMA SUGERIDO (47 días)

### Semana 1-2 (Nov 15-29): BLOQUEADORES CRÍTICOS
**Objetivo:** Resolver 6 bloqueadores críticos

| Día | Tarea | Horas | Status |
|-----|-------|-------|--------|
| 1 | Firestore Rules (validación pagos) | 4h | ⬜ |
| 2-3 | PayPal vs Stripe (decidir + implementar) | 8h | ⬜ |
| 4 | Deploy Cloud Functions | 2h | ⬜ |
| 5-7 | Verificación de Identidad | 12h | ⬜ |
| 8-9 | Video Chat HTML | 6h | ⬜ |
| 10-11 | QR Code Validation | 6h | ⬜ |

**Total:** 38 horas (3.8 horas/día promedio)

---

### Semana 3-4 (Nov 30 - Dic 13): PULIR FUNCIONALIDADES
**Objetivo:** Completar features incompletas

| Día | Tarea | Horas | Status |
|-----|-------|-------|--------|
| 12-13 | Logros/Badges | 8h | ⬜ |
| 14-15 | Sistema Referidos | 6h | ⬜ |
| 16-17 | TURN Servers | 4h | ⬜ |
| 18 | App Check | 2h | ⬜ |

**Total:** 20 horas (2 horas/día promedio)

---

### Semana 5-6 (Dic 14-27): TESTING & FIXES
**Objetivo:** Testing exhaustivo + fixes

| Día | Tarea | Horas |
|-----|-------|-------|
| 19-21 | Testing Manual (todos los flujos) | 12h |
| 22-23 | Bug fixes | 8h |
| 24-25 | Performance optimization | 6h |
| 26-27 | Testing de pagos (sandbox) | 6h |

**Total:** 32 horas

---

### Semana 7 (Dic 28 - Ene 1): DEPLOYMENT
**Objetivo:** Deploy a producción

| Día | Tarea |
|-----|-------|
| 28 | Deploy completo (hosting + functions + rules) |
| 29 | Post-deploy testing |
| 30 | Monitoring setup (Sentry, Analytics) |
| 31 | Final checks |
| 1 Ene | 🚀 LANZAMIENTO |

---

## 🎯 PRIORIZACIÓN POR IMPACTO

### Tier 1 (CRÍTICO - Sin esto NO lanzas)
1. ⭐⭐⭐⭐⭐ Firestore Rules (validación pagos)
2. ⭐⭐⭐⭐⭐ PayPal/Stripe coherencia
3. ⭐⭐⭐⭐⭐ Cloud Functions deployed
4. ⭐⭐⭐⭐ Verificación de Identidad
5. ⭐⭐⭐⭐ QR Code Validation

### Tier 2 (IMPORTANTE - Mejora experiencia)
6. ⭐⭐⭐ Video Chat completo
7. ⭐⭐⭐ TURN Servers
8. ⭐⭐ Logros/Badges
9. ⭐⭐ App Check reactivado

### Tier 3 (NICE TO HAVE - Futuro)
10. ⭐ Sistema Referidos completo
11. ⭐ Email templates personalizados
12. ⭐ Domain personalizado

---

## ✅ CHECKLIST DE LANZAMIENTO

### Pre-Deploy
- [ ] Firestore Rules deployed
- [ ] Cloud Functions deployed
- [ ] Pagos funcionando (Stripe o PayPal)
- [ ] Verificación de identidad funcional
- [ ] QR validation implementado
- [ ] Video chat completo
- [ ] App Check reactivado
- [ ] Testing manual completo

### Deploy Day (1 Enero)
- [ ] `firebase deploy` completo
- [ ] Verificar en producción:
  - [ ] Login/registro funciona
  - [ ] Pagos funcionan (modo producción)
  - [ ] Chat funciona
  - [ ] Video chat funciona
  - [ ] QR validation funciona
- [ ] Monitoring activo
- [ ] Backup de Firestore

### Post-Launch
- [ ] Monitor errors (Sentry)
- [ ] Monitor performance
- [ ] Monitor pagos
- [ ] User feedback collection

---

## 🔧 COMANDOS RÁPIDOS

### Desarrollo
```bash
# Servidor local
python -m http.server 8000

# Ver logs de Cloud Functions
firebase functions:log

# Limpiar cache
Ctrl + Shift + R
```

### Deploy
```bash
# Deploy todo
firebase deploy

# Deploy solo rules
firebase deploy --only firestore:rules

# Deploy solo functions
firebase deploy --only functions

# Deploy solo hosting
firebase deploy --only hosting
```

### Testing
```bash
# Testing de Firestore Rules (Firebase Console)
# https://console.firebase.google.com/project/tuscitasseguras-2d1a6/firestore/rules

# Testing de Cloud Functions
firebase functions:shell
```

---

## 📞 DECISIONES PENDIENTES

### 🔴 URGENTE - Necesita decisión AHORA

1. **¿PayPal o Stripe?**
   - Recomendación: Stripe (mejor a largo plazo)
   - Impacto: 6-8 horas de trabajo según elección

2. **¿Verificación manual o automática?**
   - Manual: Admin aprueba manualmente (más fácil)
   - Automática: OpenCV + ML (más complejo, futuro)
   - Recomendación: Manual para MVP

3. **¿Video chat en lanzamiento o después?**
   - En lanzamiento: Más atractivo, pero +6h trabajo
   - Después: Menos riesgo, feature se puede agregar luego
   - Recomendación: En lanzamiento (diferenciador clave)

### ⚠️ IMPORTANTE - Decisión en 1-2 semanas

4. **¿TURN servers desde día 1?**
   - Sí: Mejor experiencia, costo ~$10/mes
   - No: 30% usuarios pueden tener problemas
   - Recomendación: Sí (solo $10/mes)

5. **¿Logros/Badges en lanzamiento?**
   - Sí: Gamificación, engagement +30%
   - No: Se puede agregar después
   - Recomendación: Si hay tiempo (Semana 3-4)

---

## 💰 COSTOS MENSUALES ESTIMADOS

| Servicio | Costo | Necesario |
|----------|-------|-----------|
| Firebase (Blaze Plan) | ~$25/mes | ✅ Sí |
| TURN Servers (Twilio) | ~$10/mes | ⚠️ Recomendado |
| Stripe fees | 1.5% + €0.25 | ✅ Sí |
| Google Maps API | ~$200/mes* | ✅ Sí |
| Total | ~$235/mes | - |

*$200 gratis mensuales, luego $7 por 1000 requests

---

## 🎯 OBJETIVO FINAL

**Estado deseado al 1 de enero:**

✅ Firestore Rules enforcing pagos
✅ Cloud Functions deployed y funcionando
✅ Pagos (Stripe o PayPal) funcionando 100%
✅ Verificación de identidad funcional (manual)
✅ QR validation implementado
✅ Video chat completo (con TURN servers)
✅ App Check reactivado y en Enforced
✅ Testing completo sin bugs críticos
✅ Deployed en Firebase Hosting
✅ Monitoring activo

---

**Última actualización:** 2025-11-15
**Próxima revisión:** Cada viernes (progreso semanal)
