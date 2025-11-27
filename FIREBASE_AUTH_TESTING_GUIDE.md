# 🔐 Firebase Auth Testing Guide - TuCitaSegura

**Proyecto**: tuscitasseguras-2d1a6
**Propósito**: Guía completa para configurar, testear y usar Firebase Auth
**Última actualización**: 2025-11-27

---

## 📋 Tabla de Contenidos

1. [Configuración Inicial](#configuración-inicial)
2. [Crear Usuarios de Prueba](#crear-usuarios-de-prueba)
3. [Obtener ID Tokens](#obtener-id-tokens)
4. [Testear el Backend](#testear-el-backend)
5. [Scripts Disponibles](#scripts-disponibles)
6. [Troubleshooting](#troubleshooting)

---

## 🎯 Configuración Inicial

### Paso 1: Descargar Credenciales de Firebase

1. **Ir a Firebase Console**:
   - https://console.firebase.google.com/project/tuscitasseguras-2d1a6/settings/serviceaccounts/adminsdk

2. **Generar clave privada**:
   - Click en "Generate new private key"
   - Confirmar y descargar el archivo JSON

3. **Guardar en el proyecto**:
   ```bash
   # Copiar a backend/
   cp ~/Downloads/tuscitasseguras-*.json backend/firebase-credentials.json

   # O configurar variable de entorno
   export FIREBASE_PRIVATE_KEY_PATH=/path/to/tuscitasseguras-*.json
   ```

### Paso 2: Instalar Dependencias

**Backend (Python)**:
```bash
cd backend
pip install firebase-admin
```

**Scripts (Node.js)**:
```bash
# Node.js 18+ requerido (para native fetch)
node --version  # Debe ser >= 18
```

---

## 👤 Crear Usuarios de Prueba

### Opción 1: Script Python (Recomendado)

```bash
# Crear usuario regular
python3 scripts/firebase-token-builder.py create-user test@example.com

# Crear usuario admin
python3 scripts/firebase-token-builder.py create-user admin@tucitasegura.com --role admin

# Crear usuario VIP
python3 scripts/firebase-token-builder.py create-user vip@tucitasegura.com --role regular --tier vip

# Con password personalizado
python3 scripts/firebase-token-builder.py create-user user@test.com --password MySecurePass123!
```

**Usuarios creados tendrán**:
- Email verificado por defecto
- Password: `TestPassword123!` (a menos que especifiques otro)
- Role: `regular` (a menos que especifiques otro)

### Opción 2: Firebase Console

1. Ir a: https://console.firebase.google.com/project/tuscitasseguras-2d1a6/authentication/users
2. Click "Add user"
3. Ingresar email y password
4. Usuario creado

---

## 🎫 Obtener ID Tokens

### ¿Qué es un ID Token?

Un **ID Token** es un JWT (JSON Web Token) emitido por Firebase Auth que:
- Identifica al usuario autenticado
- Contiene claims (uid, email, custom claims, etc.)
- Se envía en el header `Authorization: Bearer <ID_TOKEN>`
- Expira cada hora (necesita refresh)

### Tipos de Tokens

| Tipo | Descripción | Uso |
|------|-------------|-----|
| **Custom Token** | Generado por Firebase Admin SDK | Backend → Cliente |
| **ID Token** | Generado tras autenticación | Cliente → Backend |
| **Refresh Token** | Para obtener nuevos ID tokens | Cliente mantiene sesión |

### Método 1: Script Node.js (Más Fácil)

**Con Email/Password**:
```bash
node scripts/get-firebase-id-token.js \
  --email test@example.com \
  --password TestPassword123!
```

**Con Custom Token**:
```bash
# Primero generar custom token
python3 scripts/firebase-token-builder.py generate-token test@example.com

# Copiar el token y usarlo
node scripts/get-firebase-id-token.js --custom-token <custom_token_aqui>
```

**Modo Interactivo**:
```bash
node scripts/get-firebase-id-token.js
# Seguir las instrucciones en pantalla
```

### Método 2: Browser Console

Abre la webapp en el navegador y ejecuta en la consola:

```javascript
// Opción A: Si ya estás autenticado
import { getAuth } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
const auth = getAuth();
const token = await auth.currentUser.getIdToken(true);
console.log('ID Token:', token);

// Opción B: Iniciar sesión primero
import { getAuth, signInWithEmailAndPassword } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
const auth = getAuth();
const cred = await signInWithEmailAndPassword(auth, 'test@example.com', 'TestPassword123!');
const token = await cred.user.getIdToken(true);
console.log('ID Token:', token);
```

### Método 3: REST API Manual

```bash
# Sign in con email/password
curl -X POST \
  'https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=AIzaSyAgFcoHwoBpo80rlEHL2hHVZ2DqtjWXh2s' \
  -H 'Content-Type: application/json' \
  -d '{
    "email": "test@example.com",
    "password": "TestPassword123!",
    "returnSecureToken": true
  }' | jq -r '.idToken'
```

---

## 🧪 Testear el Backend

### Opción 1: Script de Testing Automático

```bash
# Ejecutar script interactivo
./scripts/test-backend-with-token.sh

# Menú:
# 1. Test con custom token
# 2. Test con ID token (pegar el tuyo)
# 3. Test sin auth (debe fallar con 401)
# 4. Run full test suite
```

### Opción 2: cURL Manual

**Health Check (no requiere auth)**:
```bash
curl http://127.0.0.1:8000/health
```

**Auth Status (requiere token)**:
```bash
# Reemplaza <ID_TOKEN> con tu token
curl -H "Authorization: Bearer <ID_TOKEN>" \
     -H "X-Request-ID: test-123" \
     http://127.0.0.1:8000/api/v1/auth/status
```

**Respuesta esperada**:
```json
{
  "status": "authenticated",
  "user": {
    "uid": "xyz123...",
    "email": "test@example.com",
    "email_verified": true,
    "role": "regular"
  },
  "request_id": "test-123"
}
```

### Opción 3: Python Script

```python
import requests

ID_TOKEN = "eyJhbGciOiJSUzI1NiIsImtpZCI..."  # Tu ID token

headers = {
    "Authorization": f"Bearer {ID_TOKEN}",
    "X-Request-ID": "test-python-001"
}

response = requests.get(
    "http://127.0.0.1:8000/api/v1/auth/status",
    headers=headers
)

print(f"Status: {response.status_code}")
print(f"Response: {response.json()}")
```

---

## 🛠️ Scripts Disponibles

### 1. `firebase-token-builder.py` - Gestión de Usuarios

**Crear usuario**:
```bash
python3 scripts/firebase-token-builder.py create-user email@test.com
```

**Generar custom token**:
```bash
python3 scripts/firebase-token-builder.py generate-token email@test.com
```

**Listar usuarios**:
```bash
python3 scripts/firebase-token-builder.py list-users --max 20
```

**Set custom claims**:
```bash
python3 scripts/firebase-token-builder.py set-claims email@test.com --role admin --tier vip
```

**Eliminar usuario**:
```bash
python3 scripts/firebase-token-builder.py delete-user email@test.com
```

**Ayuda completa**:
```bash
python3 scripts/firebase-token-builder.py --help
```

---

### 2. `get-firebase-id-token.js` - Obtener ID Tokens

**Email/Password**:
```bash
node scripts/get-firebase-id-token.js \
  --email test@example.com \
  --password TestPassword123!
```

**Custom Token**:
```bash
node scripts/get-firebase-id-token.js \
  --custom-token <token>
```

**Interactivo**:
```bash
node scripts/get-firebase-id-token.js
```

---

### 3. `test-backend-with-token.sh` - Testing Completo

```bash
./scripts/test-backend-with-token.sh
```

**Features**:
- ✅ Test con ID token
- ✅ Test sin autenticación (verifica 401)
- ✅ Suite completa de endpoints
- ✅ Menú interactivo
- ✅ Colored output

---

## 📊 Flujo Completo de Testing

### Escenario 1: Primer Uso

```bash
# 1. Descargar credenciales de Firebase
# (seguir Paso 1 arriba)

# 2. Crear usuario de prueba
python3 scripts/firebase-token-builder.py create-user test@example.com

# Output:
# ✅ User created successfully!
#    UID: xyz123...
#    Email: test@example.com
#    Password: TestPassword123!

# 3. Obtener ID token
node scripts/get-firebase-id-token.js \
  --email test@example.com \
  --password TestPassword123!

# Output:
# ✅ Authentication successful!
# 🎫 ID Token (copy this):
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# eyJhbGciOiJSUzI1NiIsImtpZCI6IjExNjUzYTI3...
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

# 4. Testear backend
./scripts/test-backend-with-token.sh
# Opción 2 → Pegar el ID token
```

### Escenario 2: Testing Rápido

```bash
# One-liner para obtener token y testear
ID_TOKEN=$(node scripts/get-firebase-id-token.js \
  --email test@example.com \
  --password TestPassword123! 2>&1 | grep "eyJ" | tail -1)

curl -H "Authorization: Bearer $ID_TOKEN" \
     http://127.0.0.1:8000/api/v1/auth/status | jq
```

### Escenario 3: Testing con Diferentes Roles

```bash
# Crear usuarios con diferentes roles
python3 scripts/firebase-token-builder.py create-user regular@test.com --role regular
python3 scripts/firebase-token-builder.py create-user admin@test.com --role admin
python3 scripts/firebase-token-builder.py create-user concierge@test.com --role concierge

# Obtener tokens para cada uno
node scripts/get-firebase-id-token.js --email regular@test.com --password TestPassword123!
node scripts/get-firebase-id-token.js --email admin@test.com --password TestPassword123!
node scripts/get-firebase-id-token.js --email concierge@test.com --password TestPassword123!

# Testear endpoints protegidos por rol
curl -H "Authorization: Bearer <ADMIN_TOKEN>" \
     http://127.0.0.1:8000/api/v1/admin/users

# Debe funcionar con admin, fallar con regular (403)
```

---

## 🔍 Troubleshooting

### ❌ Error: "Firebase credentials not found"

**Causa**: No se encontró el archivo de credenciales

**Solución**:
```bash
# Verificar que existe
ls backend/firebase-credentials.json

# Si no existe, descargar de Firebase Console
# https://console.firebase.google.com/project/tuscitasseguras-2d1a6/settings/serviceaccounts/adminsdk

# O configurar variable de entorno
export FIREBASE_PRIVATE_KEY_PATH=/path/to/credentials.json
```

---

### ❌ Error: "EMAIL_NOT_FOUND"

**Causa**: El usuario no existe en Firebase Auth

**Solución**:
```bash
# Crear el usuario
python3 scripts/firebase-token-builder.py create-user test@example.com

# O verificar usuarios existentes
python3 scripts/firebase-token-builder.py list-users
```

---

### ❌ Error: "INVALID_PASSWORD"

**Causa**: Password incorrecto

**Solución**:
```bash
# Password por defecto es: TestPassword123!
node scripts/get-firebase-id-token.js \
  --email test@example.com \
  --password TestPassword123!

# O resetear password en Firebase Console
```

---

### ❌ Error: "Token de autenticación expirado"

**Causa**: El ID token expiró (duran ~1 hora)

**Solución**:
```bash
# Generar nuevo token
node scripts/get-firebase-id-token.js \
  --email test@example.com \
  --password TestPassword123!

# O usar getIdToken(true) para forzar refresh
```

---

### ❌ Error: "401 Unauthorized" en backend

**Causas posibles**:

1. **Token inválido o expirado**:
   ```bash
   # Generar nuevo token
   node scripts/get-firebase-id-token.js --email test@example.com --password TestPassword123!
   ```

2. **Token de proyecto diferente**:
   - Verificar que el token sea de `tuscitasseguras-2d1a6`
   - No mezclar tokens de otros proyectos Firebase

3. **Backend no tiene credenciales**:
   ```bash
   # Verificar que backend tiene firebase-credentials.json
   ls backend/firebase-credentials.json
   ```

4. **Header mal formado**:
   ```bash
   # Correcto:
   curl -H "Authorization: Bearer eyJhbGc..."

   # Incorrecto:
   curl -H "Authorization: eyJhbGc..."  # Falta "Bearer "
   ```

---

### ❌ Error: "This script requires Node.js 18+"

**Causa**: Versión de Node.js muy antigua (no tiene fetch nativo)

**Solución**:
```bash
# Opción A: Actualizar Node.js
nvm install 18
nvm use 18

# Opción B: Instalar node-fetch
npm install node-fetch
```

---

## 📝 Custom Claims y Roles

### Estructura de Claims

```json
{
  "uid": "xyz123...",
  "email": "user@example.com",
  "email_verified": true,
  "role": "admin",              // Custom claim
  "subscription_tier": "vip",   // Custom claim
  "iat": 1701234567,
  "exp": 1701238167
}
```

### Roles Disponibles

| Role | Acceso |
|------|--------|
| `regular` | Endpoints básicos |
| `concierge` | Gestión de eventos VIP |
| `admin` | Acceso completo, gestión de usuarios |

### Tiers de Suscripción

| Tier | Features |
|------|----------|
| `free` | Funciones básicas |
| `premium` | Sin límites de likes, prioridad en matches |
| `vip` | Acceso a eventos exclusivos, concierge |

### Asignar Claims

```bash
# Set role
python3 scripts/firebase-token-builder.py set-claims user@test.com --role admin

# Set tier
python3 scripts/firebase-token-builder.py set-claims user@test.com --tier vip

# Ambos
python3 scripts/firebase-token-builder.py set-claims user@test.com --role admin --tier vip
```

**Nota**: Después de cambiar claims, el usuario debe obtener un nuevo ID token (logout/login o `getIdToken(true)`).

---

## 🔗 Enlaces Útiles

- **Firebase Console**: https://console.firebase.google.com/project/tuscitasseguras-2d1a6
- **Authentication Users**: https://console.firebase.google.com/project/tuscitasseguras-2d1a6/authentication/users
- **Service Accounts**: https://console.firebase.google.com/project/tuscitasseguras-2d1a6/settings/serviceaccounts/adminsdk
- **Firebase REST API Docs**: https://firebase.google.com/docs/reference/rest/auth

---

## 📚 Próximos Pasos

Después de configurar Firebase Auth:

1. **Testear endpoints protegidos**:
   - `/api/v1/users/profile` - Requiere auth
   - `/api/v1/admin/*` - Requiere role admin
   - `/api/v1/vip-events/*` - Requiere tier vip

2. **Implementar en frontend**:
   - Sign up / Sign in
   - Password reset
   - Email verification
   - Social login (Google, etc.)

3. **Configurar en producción**:
   - Agregar `FIREBASE_SERVICE_ACCOUNT_B64` en Railway
   - Configurar secrets en GitHub Actions
   - Deploy automático con CI/CD

---

**¿Necesitas ayuda?** Ver documentación completa en:
- `backend/app/services/auth/firebase_auth.py` - Implementación del servicio
- `docs/FIREBASE_AUTH_IMPLEMENTATION.md` - Guía de implementación
- `CICD_ACTIVATION_GUIDE.md` - Setup de CI/CD

---

**Última actualización**: 2025-11-27
**Autor**: Claude
**Branch**: claude/complete-deployment-01YCrznu73wKY9zeDCxV8GBM
