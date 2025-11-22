# 🚀 Instrucciones de Deployment - TuCitaSegura

## ✅ Preparación Completada

Todo está listo para hacer deployment. Aquí está lo que se ha preparado:

### Archivos de Configuración
- ✅ `firebase.json` - Configuración completa de Firebase
- ✅ `.firebaserc` - Proyecto: tuscitasseguras-2d1a6
- ✅ `DEPLOY.sh` - Script automatizado de deployment
- ✅ `functions/node_modules` - Dependencias instaladas (526 packages)

### Componentes a Deployar

#### 1. Cloud Functions (3 funciones)
```javascript
✅ onUserDocCreate
   - Auto-set custom claims (role, gender)
   - Update displayName en Auth
   
✅ onUserDocUpdate  
   - Sync custom claims cuando cambia role/gender
   
✅ syncChatACL
   - Manage chat permissions automáticamente
```

#### 2. Firestore Security Rules
```
✅ Custom claims validation (role, gender)
✅ Gender-based access control
✅ Chat ACL automático
✅ Admin, Concierge, Regular roles
```

#### 3. Storage Security Rules
```
✅ Profile photos: /profile_photos/{gender}/{userId}/
✅ Chat attachments protegidos
✅ Validación por género y autenticación
```

#### 4. Firebase Hosting (opcional)
```
✅ Webapp estática servida desde /webapp
```

---

## 🔐 PASO 1: Autenticación (REQUERIDO)

Antes de deployar, debes autenticarte con Firebase:

```bash
firebase login
```

**Qué sucede:**
1. Se abre tu navegador
2. Seleccionas tu cuenta de Google
3. Autorizas Firebase CLI
4. Vuelves a la terminal

**Verificación:**
```bash
firebase projects:list
```

Deberías ver `tuscitasseguras-2d1a6` en la lista.

---

## 🚀 PASO 2: Ejecutar Deployment

### Opción A: Script Automatizado (Recomendado)

```bash
./DEPLOY.sh
```

**Este script:**
- ✅ Verifica autenticación
- ✅ Muestra resumen de lo que se va a deployar
- ✅ Pide confirmación
- ✅ Deploya en orden: Functions → Firestore → Storage
- ✅ Muestra resultado final

### Opción B: Deployment Manual

Si prefieres control manual:

```bash
# Deploy todo de una vez
firebase deploy

# O deploy componentes individuales:
firebase deploy --only functions
firebase deploy --only firestore:rules
firebase deploy --only storage
firebase deploy --only hosting
```

---

## ⏱️ Tiempos Estimados

- **Functions:** 2-3 minutos
- **Firestore Rules:** 10-15 segundos
- **Storage Rules:** 10-15 segundos
- **Total:** ~3-4 minutos

---

## 📊 Verificación Post-Deployment

### 1. Verificar Cloud Functions

Abre la consola:
```
https://console.firebase.google.com/project/tuscitasseguras-2d1a6/functions
```

Deberías ver 3 funciones:
- ✅ onUserDocCreate
- ✅ onUserDocUpdate
- ✅ syncChatACL

### 2. Probar Firestore Rules

En Firebase Console → Firestore → Rules:
```
https://console.firebase.google.com/project/tuscitasseguras-2d1a6/firestore/rules
```

Verifica que las reglas están publicadas.

### 3. Probar Storage Rules

En Firebase Console → Storage → Rules:
```
https://console.firebase.google.com/project/tuscitasseguras-2d1a6/storage
```

### 4. Testing Local

```bash
# Servir app localmente
firebase serve

# Abrir en navegador:
http://localhost:5000
```

---

## 🐛 Troubleshooting

### Error: "Failed to authenticate"
**Solución:**
```bash
firebase logout
firebase login
```

### Error: "Permission denied"
**Causa:** Tu cuenta no tiene permisos en el proyecto
**Solución:** Pide al owner del proyecto que te agregue como Editor/Owner

### Error: "Functions timeout"
**Causa:** Functions requieren más tiempo
**Solución:** Ya está configurado en el código (timeout: 540s)

### Error: "Node version mismatch"
**Advertencia:** Functions configuradas para Node 18, tienes Node 22
**Solución:** Generalmente no es problema. Si falla:
```bash
# Instalar nvm y usar Node 18
nvm install 18
nvm use 18
firebase deploy --only functions
```

### Error: "Billing account required"
**Causa:** Cloud Functions requiere plan Blaze (pay-as-you-go)
**Solución:**
1. Ve a Firebase Console → Project Settings → Usage and billing
2. Upgrade al plan Blaze
3. Configura budget alert

---

## 📋 Próximos Pasos Después del Deployment

### 1. Registrar Debug Token
```
Token: BCF51A42-7B5F-4009-B8D7-30AF50EA661B
URL: https://console.firebase.google.com/project/tuscitasseguras-2d1a6/appcheck
```

### 2. Testing Completo
- Registro de usuario
- Login
- Búsqueda de usuarios (Google Maps)
- Chat
- Subida de fotos
- Sistema de concierge

### 3. Actualizar Usuarios Existentes

Si ya tienes usuarios en Firestore sin custom claims:

```bash
cd functions
node scripts/update-existing-users.js
```

### 4. Configurar Monitoring

- Enable Firebase Analytics
- Configure Crashlytics
- Set up Performance Monitoring

---

## 🔄 Rollback (Si es Necesario)

Si el deployment causa problemas:

```bash
# Ver versiones anteriores
firebase functions:list

# Rollback a versión anterior
firebase rollback functions
```

---

## 📞 Información de Referencia

**Project ID:** `tuscitasseguras-2d1a6`
**Region:** `us-central1` (default)
**Firebase Console:** https://console.firebase.google.com/project/tuscitasseguras-2d1a6

**URLs de Servicios:**
- Functions: https://console.firebase.google.com/project/tuscitasseguras-2d1a6/functions
- Firestore: https://console.firebase.google.com/project/tuscitasseguras-2d1a6/firestore
- Storage: https://console.firebase.google.com/project/tuscitasseguras-2d1a6/storage
- App Check: https://console.firebase.google.com/project/tuscitasseguras-2d1a6/appcheck
- Hosting: https://console.firebase.google.com/project/tuscitasseguras-2d1a6/hosting

---

## 🎉 ¡Listo!

Una vez que ejecutes `firebase login` y luego `./DEPLOY.sh`, tu aplicación estará completamente deployada en Firebase.

**Última actualización:** 2025-11-14
**Estado:** ✅ Listo para deployment
