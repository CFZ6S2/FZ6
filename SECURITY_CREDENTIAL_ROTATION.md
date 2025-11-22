# 🔒 ROTACIÓN DE CREDENCIALES - ACCIÓN INMEDIATA REQUERIDA

**ALERTA**: Las credenciales de Firebase fueron expuestas en el código fuente. Deben ser rotadas INMEDIATAMENTE.

---

## ⚠️ VULNERABILIDAD CRÍTICA

**Archivo comprometido**: `webapp/js/firebase-config.js`
**Credenciales expuestas**:
- Firebase API Key
- Project ID
- Messaging Sender ID
- App ID

**Riesgo**: Cualquier persona con acceso al repositorio puede usar estas credenciales.

---

## 🚨 PASOS INMEDIATOS (HACER AHORA)

### 1. Rotar Credenciales de Firebase (15 minutos)

#### A. Crear Nuevo Proyecto Firebase (Recomendado)

```bash
# Opción más segura: Crear proyecto completamente nuevo
1. Ir a https://console.firebase.google.com
2. Click "Add Project"
3. Nombre: "tucitasegura-production-new"
4. Habilitar Google Analytics (opcional)
5. Crear proyecto
```

#### B. Migrar Datos (Si usas opción A)

```bash
# Exportar Firestore del proyecto viejo
gcloud firestore export gs://[OLD_BUCKET]/firestore-backup

# Importar a proyecto nuevo
gcloud firestore import gs://[OLD_BUCKET]/firestore-backup

# Migrar usuarios de Authentication
# Ir a Firebase Console → Authentication → Users → Export
# Luego importar en nuevo proyecto
```

#### C. O Regenerar Keys en Proyecto Actual (Más rápido pero menos seguro)

```bash
# No hay forma de regenerar la API key completamente
# Solo puedes agregar restricciones

1. Firebase Console → Project Settings → General
2. En "Web apps" eliminar app actual
3. Crear nueva web app
4. Copiar nuevas credenciales
```

### 2. Configurar Restricciones de API Key

```bash
1. Google Cloud Console → APIs & Services → Credentials
2. Buscar la API Key de Firebase
3. Click en la key
4. En "Application restrictions":
   - Seleccionar "HTTP referrers"
   - Agregar: https://tucitasegura.com/*
   - Agregar: https://*.firebaseapp.com/*
   - Para desarrollo: http://localhost:*

5. En "API restrictions":
   - Seleccionar "Restrict key"
   - Habilitar solo:
     * Firebase Authentication API
     * Cloud Firestore API
     * Cloud Storage for Firebase API
     * Firebase Cloud Messaging API

6. Save
```

### 3. Actualizar Variables de Entorno

#### A. Frontend (webapp/.env)

```bash
# Crear archivo webapp/.env
cp webapp/.env.example webapp/.env

# Editar webapp/.env con las NUEVAS credenciales
VITE_FIREBASE_API_KEY=AIzaSy_NUEVA_KEY_AQUI
VITE_FIREBASE_AUTH_DOMAIN=tucitasegura-production-new.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=tucitasegura-production-new
VITE_FIREBASE_STORAGE_BUCKET=tucitasegura-production-new.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=987654321
VITE_FIREBASE_APP_ID=1:987654321:web:nuevoid123456
```

#### B. Backend (backend/.env)

```bash
# Actualizar backend/.env
FIREBASE_PROJECT_ID=tucitasegura-production-new

# Descargar nueva service account key
# Firebase Console → Project Settings → Service Accounts
# Click "Generate new private key"
# Guardar como backend/serviceAccountKey.json (en .gitignore)

# O usar variable de entorno base64
FIREBASE_SERVICE_ACCOUNT_B64=$(base64 -w 0 serviceAccountKey.json)
# Pegar el output en .env
```

### 4. Actualizar Código

#### A. Frontend - Cambiar a Configuración Segura

```javascript
// REEMPLAZAR webapp/js/firebase-config.js
// CON webapp/js/firebase-config-secure.js

// En todos los archivos HTML, cambiar:
// ANTES:
<script type="module">
  import { firebaseConfig } from './js/firebase-config.js';
</script>

// DESPUÉS:
<script type="module">
  import { firebaseConfig } from './js/firebase-config-secure.js';
</script>
```

#### B. Verificar que .gitignore está actualizado

```bash
# Verificar que estos archivos están en .gitignore:
cat .gitignore | grep -E "(\.env|credentials\.json)"

# Debe mostrar:
.env
webapp/.env
backend/.env
**/serviceAccountKey.json
**/firebase-credentials.json
```

### 5. Limpiar Historial de Git (CRÍTICO)

```bash
# ADVERTENCIA: Esto reescribirá el historial de Git
# Asegúrate de que todos los colaboradores estén informados

# Instalar BFG Repo Cleaner
brew install bfg  # macOS
# O descargar de: https://rtyley.github.io/bfg-repo-cleaner/

# Clonar una copia mirror
git clone --mirror https://github.com/cesarherrerarojo-ship-it/tcc2.git tcc2-clean

# Eliminar archivo con credenciales del historial
cd tcc2-clean
bfg --delete-files firebase-config.js
bfg --delete-files serviceAccountKey.json

# Limpiar el repositorio
git reflog expire --expire=now --all
git gc --prune=now --aggressive

# Force push (ADVERTENCIA: destruye el historial)
git push --force

# Informar a todos los colaboradores que deben re-clonar:
# git clone https://github.com/cesarherrerarojo-ship-it/tcc2.git
```

### 6. Actualizar Plataformas de Deployment

#### Railway

```bash
# Dashboard de Railway → Variables
# Actualizar:
FIREBASE_PROJECT_ID=tucitasegura-production-new
FIREBASE_SERVICE_ACCOUNT_B64=<nuevo base64>

# Redeploy
railway up
```

#### Firebase Hosting

```bash
# Actualizar .firebaserc
{
  "projects": {
    "default": "tucitasegura-production-new"
  }
}

# Redeploy
firebase deploy
```

---

## 📋 CHECKLIST POST-ROTACIÓN

- [ ] Nuevas credenciales generadas
- [ ] Restricciones de API Key configuradas
- [ ] `webapp/.env` creado con nuevas credenciales
- [ ] `backend/.env` actualizado
- [ ] Código actualizado para usar `firebase-config-secure.js`
- [ ] `.gitignore` actualizado
- [ ] Historial de Git limpiado
- [ ] Variables de entorno actualizadas en Railway/Render
- [ ] Firebase Hosting redeployado
- [ ] Prueba de login funcionando
- [ ] Prueba de Firestore funcionando
- [ ] Credenciales viejas documentadas como comprometidas
- [ ] Equipo informado del cambio

---

## 🔍 VERIFICACIÓN

### Verificar que las nuevas credenciales funcionan:

```bash
# Test de autenticación
curl -X POST https://api.tucitasegura.com/api/test-auth \
  -H "Authorization: Bearer FIREBASE_ID_TOKEN"

# Debe responder 200 OK
```

### Verificar que las credenciales viejas NO funcionan:

```bash
# Intentar usar API key vieja
# Debe fallar con error 401 o 403
```

---

## 📚 DOCUMENTACIÓN PARA DESARROLLADORES

### Setup para Nuevos Desarrolladores

```bash
# 1. Clonar repositorio
git clone https://github.com/cesarherrerarojo-ship-it/tcc2.git
cd tcc2

# 2. Configurar frontend
cd webapp
cp .env.example .env
# Editar .env con credenciales (solicitar al team lead)

# 3. Configurar backend
cd ../backend
cp .env.example .env
# Editar .env con credenciales

# 4. Instalar dependencias
npm install
cd backend && pip install -r requirements.txt

# 5. Ejecutar
npm run dev  # Frontend
cd backend && uvicorn main:app --reload  # Backend
```

---

## ⏱️ TIEMPO ESTIMADO

- Rotar credenciales: **15 minutos**
- Configurar restricciones: **10 minutos**
- Actualizar código: **20 minutos**
- Limpiar historial Git: **30 minutos**
- Testing: **15 minutos**

**Total**: ~90 minutos

---

## 🆘 SOPORTE

Si tienes problemas durante la rotación:

1. **NO CONTINÚES USANDO LAS CREDENCIALES COMPROMETIDAS**
2. Contacta al equipo de seguridad inmediatamente
3. Documenta cualquier acceso sospechoso
4. Revisa los logs de Firebase Console → Usage

---

## 📊 MONITOREO POST-ROTACIÓN

### Activar Alertas en Firebase

```bash
# Firebase Console → Project Settings → Usage and Billing
# Configurar alertas para:
- Solicitudes inusuales de autenticación
- Picos de tráfico anormales
- Lecturas/escrituras de Firestore fuera de horario

# Google Cloud Console → Security Command Center
# Revisar hallazgos de seguridad diariamente por 30 días
```

---

**ÚLTIMA ACTUALIZACIÓN**: 22 de Noviembre de 2025
**PRÓXIMA REVISIÓN**: Inmediatamente después de completar la rotación
