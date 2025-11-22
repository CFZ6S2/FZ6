# 🎯 Guía de Deployment Manual (Sin CLI)

Si no puedes usar `firebase login` o prefieres hacerlo manualmente, aquí está la guía completa.

---

## ✅ **MÉTODO RECOMENDADO: Copiar y Pegar en Firebase Console**

Este método NO requiere autenticación en la terminal. Todo se hace desde el navegador.

---

## 📋 **PASO 1: Deployar Firestore Rules**

### 1.1 Abre Firebase Console - Firestore Rules

```
https://console.firebase.google.com/project/tuscitasseguras-2d1a6/firestore/rules
```

### 1.2 Copia las Reglas de Firestore

Abre el archivo `firestore.rules` en tu proyecto o copia esto:

```javascript
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {

    // Helper functions
    function isAuthenticated() {
      return request.auth != null;
    }

    function getUserData() {
      return get(/databases/$(database)/documents/users/$(request.auth.uid)).data;
    }

    function hasRole(role) {
      return isAuthenticated() && request.auth.token.role == role;
    }

    function isAdmin() {
      return hasRole('admin');
    }

    function isConcierge() {
      return hasRole('concierge');
    }

    function isOwner(userId) {
      return isAuthenticated() && request.auth.uid == userId;
    }

    function isSameGender(userGender) {
      return isAuthenticated() && request.auth.token.gender == userGender;
    }

    function isOppositeGender(userGender) {
      return isAuthenticated() && request.auth.token.gender != userGender;
    }

    // Users collection
    match /users/{userId} {
      allow read: if isAuthenticated() && (
        isOwner(userId) ||
        isAdmin() ||
        isOppositeGender(resource.data.gender)
      );

      allow create: if isAuthenticated() && isOwner(userId);

      allow update: if isAuthenticated() && (
        isOwner(userId) ||
        isAdmin()
      );

      allow delete: if isAdmin();
    }

    // Conversations collection
    match /conversations/{conversationId} {
      allow read: if isAuthenticated() && (
        request.auth.uid in resource.data.participants ||
        isAdmin()
      );

      allow create: if isAuthenticated() && request.auth.uid in request.resource.data.participants;

      allow update: if isAuthenticated() && (
        request.auth.uid in resource.data.participants ||
        isAdmin()
      );

      allow delete: if isAdmin();

      match /messages/{messageId} {
        allow read: if isAuthenticated() && request.auth.uid in get(/databases/$(database)/documents/conversations/$(conversationId)).data.participants;
        allow create: if isAuthenticated() && request.auth.uid in get(/databases/$(database)/documents/conversations/$(conversationId)).data.participants;
        allow update, delete: if isAuthenticated() && (
          request.auth.uid == resource.data.senderId ||
          isAdmin()
        );
      }
    }

    // VIP Events collection
    match /vipEvents/{eventId} {
      allow read: if isAuthenticated();
      allow create: if isAuthenticated() && isConcierge();
      allow update, delete: if isAuthenticated() && (
        resource.data.createdBy == request.auth.uid ||
        isAdmin()
      );
    }

    // Payments collection
    match /payments/{paymentId} {
      allow read: if isAuthenticated() && (
        isOwner(resource.data.userId) ||
        isAdmin()
      );
      allow create: if isAuthenticated();
      allow update, delete: if isAdmin();
    }

    // Reports collection
    match /reports/{reportId} {
      allow read: if isAdmin();
      allow create: if isAuthenticated();
      allow update, delete: if isAdmin();
    }
  }
}
```

### 1.3 Pega en Firebase Console

1. Borra todo el contenido del editor
2. Pega las reglas de arriba
3. Click en **"Publish"** (botón azul arriba a la derecha)
4. Confirma el deployment

✅ **Listo! Firestore Rules deployadas**

---

## 📋 **PASO 2: Deployar Storage Rules**

### 2.1 Abre Firebase Console - Storage Rules

```
https://console.firebase.google.com/project/tuscitasseguras-2d1a6/storage
```

Luego click en la pestaña **"Rules"**

### 2.2 Copia las Reglas de Storage

Abre el archivo `firebase-storage.rules` o copia esto:

```javascript
rules_version = '2';

service firebase.storage {
  match /b/{bucket}/o {

    // Profile photos - organized by gender
    match /profile_photos/{gender}/{userId}/{filename} {
      allow read: if request.auth != null && (
        // User can read their own photos
        request.auth.uid == userId ||
        // Opposite gender can read (for matching)
        request.auth.token.gender != gender ||
        // Admins can read everything
        request.auth.token.role == 'admin'
      );

      allow write: if request.auth != null &&
                      request.auth.uid == userId &&
                      request.auth.token.gender == gender &&
                      request.resource.size < 5 * 1024 * 1024 &&
                      request.resource.contentType.matches('image/.*');

      allow delete: if request.auth != null && (
        request.auth.uid == userId ||
        request.auth.token.role == 'admin'
      );
    }

    // Chat attachments
    match /chat_attachments/{conversationId}/{messageId}/{filename} {
      allow read: if request.auth != null;

      allow write: if request.auth != null &&
                      request.resource.size < 10 * 1024 * 1024;

      allow delete: if request.auth != null;
    }

    // VIP Event photos (Concierge only)
    match /vip_events/{eventId}/{filename} {
      allow read: if request.auth != null;

      allow write: if request.auth != null &&
                      request.auth.token.role == 'concierge' &&
                      request.resource.size < 5 * 1024 * 1024 &&
                      request.resource.contentType.matches('image/.*');

      allow delete: if request.auth != null && (
        request.auth.token.role == 'concierge' ||
        request.auth.token.role == 'admin'
      );
    }
  }
}
```

### 2.3 Pega en Firebase Console

1. Borra todo el contenido del editor
2. Pega las reglas de arriba
3. Click en **"Publish"** (botón azul)
4. Confirma el deployment

✅ **Listo! Storage Rules deployadas**

---

## 📋 **PASO 3: Cloud Functions (Requiere CLI)**

⚠️ **Las Cloud Functions NO se pueden deployar manualmente desde consola.**

Tienes 2 opciones:

### Opción A: Saltarte este paso (Por Ahora)

Las Functions son opcionales. Tu app funcionará sin ellas, pero:
- Los custom claims NO se configurarán automáticamente
- Deberás configurarlos manualmente desde Firebase Console

### Opción B: Usar Firebase CLI (Recomendado)

Para deployar las Functions, necesitas autenticarte:

```bash
# 1. Autenticar
firebase login

# 2. Deploy solo Functions
firebase deploy --only functions
```

---

## ✅ **VERIFICACIÓN**

### Verificar Firestore Rules

1. Ve a: https://console.firebase.google.com/project/tuscitasseguras-2d1a6/firestore/rules
2. Deberías ver las reglas que acabas de pegar
3. Arriba debe decir: "Rules published" con la fecha/hora

### Verificar Storage Rules

1. Ve a: https://console.firebase.google.com/project/tuscitasseguras-2d1a6/storage
2. Pestaña "Rules"
3. Deberías ver las reglas que acabas de pegar
4. Arriba debe decir: "Rules published" con la fecha/hora

---

## 🎯 **Próximos Pasos**

Una vez deployadas las reglas:

### 1. Registrar Debug Token (App Check)

```
Token: BCF51A42-7B5F-4009-B8D7-30AF50EA661B
URL: https://console.firebase.google.com/project/tuscitasseguras-2d1a6/appcheck
```

Pasos:
1. Abre el URL de arriba
2. Click en "Apps"
3. Click en "Manage debug tokens"
4. Click en "+ Add debug token"
5. Pega: `BCF51A42-7B5F-4009-B8D7-30AF50EA661B`
6. Display name: `Localhost Development`
7. Click "Save"

### 2. Desactivar Enforcement

En la misma página de App Check:
- Authentication → **Unenforced**
- Cloud Firestore → **Unenforced**
- Cloud Storage → **Unenforced**

### 3. Testing

Abre tu app:
```bash
firebase serve
# O simplemente abre index.html en tu navegador
```

Prueba:
- Login/Registro
- Búsqueda de usuarios
- Chat
- Subir fotos

---

## 🐛 **Si Algo Falla**

### Error: "Insufficient permissions"

**Causa:** Tu cuenta no tiene permisos en el proyecto

**Solución:**
1. Ve a Firebase Console → Settings → Users and permissions
2. Pide al owner que te agregue como Editor/Owner

### Error: "Rules syntax error"

**Causa:** Hay un error al copiar las reglas

**Solución:**
1. Copia de nuevo desde esta guía
2. Asegúrate de copiar TODO (desde `rules_version` hasta el último `}`)
3. No copies las comillas invertidas (```)

---

## 📚 **Alternativa: Deployment desde Archivo**

Si tienes los archivos localmente:

```bash
# Ver las reglas actuales
cat firestore.rules
cat firebase-storage.rules

# Copiar contenido y pegar en Firebase Console
```

---

## 🎉 **¡Éxito!**

Si completaste los pasos 1 y 2, has deployado exitosamente:
- ✅ Firestore Security Rules
- ✅ Storage Security Rules

Las Cloud Functions son opcionales por ahora. Puedes deployarlas más tarde cuando tengas acceso a Firebase CLI.

---

**Última actualización:** 2025-11-14
