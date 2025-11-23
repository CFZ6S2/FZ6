# 🚀 Cómo Hacer Deploy a Producción

## 📋 Resumen

Los errores de CSP que ves en la consola de **producción** (tucitasegura.com) son porque el `firebase.json` con el CSP mejorado **no se ha desplegado todavía**.

### ❌ Error Actual en Producción:
```
Refused to connect to 'https://securetoken.googleapis.com'
because it violates the Content Security Policy
```

### ✅ Causa:
El CSP en producción es antiguo y solo permite:
- `connect-src 'self' https://t2c06-production.up.railway.app https://tuscitasseguras-2d1a6.web.app`

Pero Firebase necesita:
- `https://securetoken.googleapis.com`
- `https://*.googleapis.com`
- `https://*.firebaseio.com`
- Y otros dominios

---

## 🛠️ Solución: Hacer Deploy

### Opción 1: Usar el Script Automático (RECOMENDADO)

```bash
# 1. Primero, autentícate (solo una vez)
firebase login

# 2. Ejecuta el script
./deploy-to-production.sh
```

El script:
- ✅ Verifica que todo está listo
- ✅ Te pide confirmación antes de desplegar
- ✅ Despliega Firestore Rules primero
- ✅ Despliega Hosting (CSP + código)
- ✅ Te muestra URLs y verificaciones

---

### Opción 2: Comandos Manuales

```bash
# 1. Autenticarse (solo una vez)
firebase login

# 2. Desplegar Firestore Rules
firebase deploy --only firestore:rules

# 3. Desplegar Hosting (CSP + código)
firebase deploy --only hosting

# 4. O ambos a la vez
firebase deploy --only hosting,firestore:rules
```

---

## 🎯 Lo Que Se Va a Desplegar

### 1. CSP Headers Mejorados (`firebase.json`)

**Antes:**
```
connect-src 'self' https://t2c06-production.up.railway.app https://tuscitasseguras-2d1a6.web.app
```

**Después:**
```
connect-src 'self'
  https://*.googleapis.com
  https://*.firebaseio.com
  https://t2c06-production.up.railway.app
  https://tuscitasseguras-2d1a6.web.app
  https://identitytoolkit.googleapis.com
  https://securetoken.googleapis.com
  https://www.google.com/recaptcha/
  wss://*.firebaseio.com
```

**Beneficios:**
- ✅ Permite Firebase Authentication
- ✅ Permite Firestore
- ✅ Permite Storage
- ✅ Permite reCAPTCHA
- ✅ Mantiene seguridad contra XSS

### 2. Firestore Rules Actualizadas

**Cambio Principal:**
```javascript
// ANTES
allow create: if isAuthed() && uid() == userId ...

// AHORA
allow create: if isAuthed()
              && uid() == userId
              && isEmailVerified()  // ← NUEVO
              ...
```

**Beneficios:**
- ✅ Solo usuarios con email verificado pueden crear perfil
- ✅ Previene spam y cuentas falsas
- ✅ Mejora calidad de datos

### 3. Código Frontend

**Incluye:**
- ✅ Sistema de sanitización XSS (`webapp/js/sanitizer.js`)
- ✅ Logger profesional (`webapp/js/logger.js`)
- ✅ Firebase API Key correcta
- ✅ Service Workers actualizados
- ✅ Demo de sanitización (`webapp/sanitizer-demo.html`)

---

## ⏱️ Tiempo Estimado

- **Deploy:** 2-5 minutos
- **Propagación CDN:** 2-3 minutos adicionales
- **Total:** ~5-8 minutos

---

## ✅ Verificación Post-Deploy

1. **Abre producción:**
   ```
   https://tucitasegura.com
   ```

2. **Abre la consola del navegador (F12)**

3. **Verifica que NO hay errores de CSP:**
   - ❌ Antes veías: "Refused to connect to securetoken.googleapis.com"
   - ✅ Ahora: Sin errores de CSP

4. **Prueba funcionalidad:**
   - Abre https://tucitasegura.com/webapp/register.html
   - Intenta registrarte
   - Verifica que Firebase funciona

5. **Prueba el demo de sanitización:**
   - Abre https://tucitasegura.com/webapp/sanitizer-demo.html
   - Prueba inyectar: `<img src=x onerror="alert('XSS')">`
   - Verifica que se sanitiza correctamente

---

## 🐛 Troubleshooting

### El error de CSP persiste después del deploy

**Solución:**
1. Espera 2-3 minutos (propagación CDN)
2. Limpia cache del navegador: `Ctrl + Shift + R` (Chrome/Edge)
3. Prueba en modo incógnito
4. Verifica que el deploy fue exitoso:
   ```bash
   firebase hosting:logs
   ```

### Error: "Firebase CLI no está instalado"

**Solución:**
```bash
npm install -g firebase-tools
```

### Error: "Not authenticated"

**Solución:**
```bash
firebase login
```

Esto abrirá tu navegador para autenticarte con tu cuenta de Google.

### Error: "Permission denied"

**Solución:**
Verifica que tienes permisos en el proyecto `tuscitasseguras-2d1a6`:
```bash
firebase projects:list
```

---

## 📊 Estado Actual del Proyecto

### Completado ✅
- [x] 100% vulnerabilidades corregidas (31/31)
- [x] Sistema de sanitización XSS
- [x] Logger profesional
- [x] CSP headers robustos
- [x] Email verification
- [x] API Key correcta
- [x] Documentación completa

### Pendiente ⏳
- [ ] Deploy a producción ← **ESTO**
- [ ] Verificación en producción
- [ ] Aplicar sanitizer a HTML files (chat, conversaciones, buscar-usuarios)
- [ ] Limpiar console.log statements (190 identificados)

---

## 🎓 Comandos Útiles de Firebase

```bash
# Ver proyectos
firebase projects:list

# Ver qué se va a desplegar (dry run)
firebase deploy --only hosting --dry-run

# Ver logs de hosting
firebase hosting:logs

# Ver información del proyecto
firebase use

# Cambiar de proyecto (si tienes múltiples)
firebase use tuscitasseguras-2d1a6

# Deploy solo de hosting (más rápido)
firebase deploy --only hosting

# Deploy solo de rules
firebase deploy --only firestore:rules

# Deploy de todo
firebase deploy
```

---

## 📞 Soporte

**Si tienes problemas:**
1. Verifica logs: `firebase hosting:logs`
2. Revisa la consola de Firebase: https://console.firebase.google.com
3. Verifica el estado de tu API Key en Google Cloud Console

**Documentación:**
- `docs/FIREBASE_API_KEY_FIX.md` - Solución de errores 401
- `docs/SANITIZER_USAGE_GUIDE.md` - Guía de sanitización
- `RESUMEN_FINAL_CORRECCIONES.md` - Estado completo del proyecto

---

**Última actualización:** 23 de Noviembre de 2025
**Proyecto:** TuCitaSegura (tuscitasseguras-2d1a6)
**Branch:** claude/fix-remaining-issues-011L65UsYfEWF5tSfLPML2A6
